import {
  ChainIds,
  LitAuthSig,
  LitProvider,
  LivepeerPlayer,
  UserMetrics,
} from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import { ProviderType } from "@lit-protocol/constants";
import { ethers } from "ethers";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { AuthMethod, IRelayPKP } from "@lit-protocol/types";
import {
  IPFS_CID_PKP,
  KINORA_FACTORY_CONTRACT,
  KINORA_PKP_DB_CONTRACT,
  LIT_RPC,
  CHRONICLE_PKP_CONTRACT,
} from "./constants";
import KinoraPKPDBAbi from "./abis/KinoraPKPDB.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import PKPNFTAbi from "./abis/PKPNFT.json";
import { DiscordProvider, GoogleProvider } from "@lit-protocol/lit-auth-client";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
  generateAuthSig,
  encryptMetrics,
  getSessionSig,
  decryptMetrics,
} from "./utils/lit-protocol";
import { JsonRpcProvider } from "@ethersproject/providers";

export class Sequence<TPlaybackPolicyObject extends object, TSlice> {
  private livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
  private metrics: Metrics;
  private currentUserPKP: IRelayPKP;
  private providerType: ProviderType;
  private litProvider: LitProvider;
  private polygonProvider: JsonRpcProvider;
  private chronicleProvider: JsonRpcProvider;
  private authMethod: AuthMethod;
  private rpcURL: string;
  private chain: string = "polygon";
  private redirectURL: string;
  private developerPKPPublicKey: `0x04${string}`;
  private encryptUserMetrics: boolean;
  private kinoraPkpDBContract: ethers.Contract;
  private pkpContract: ethers.Contract;
  private kinoraQuestAddress: ethers.Contract;
  private kinoraMetricsAddress: ethers.Contract;
  private signer: ethers.Signer;
  private authSig: LitAuthSig;
  private userPKPAuthSig: LitAuthSig;
  private litAuthClient = new LitAuthClient({
    litRelayConfig: {
      relayApiKey: `${process.env.LIT_RELAY_KEY}`,
    },
  });
  private litNodeClient = new LitNodeClient({
    litNetwork: "serrano",
    debug: false,
    alertWhenUnauthorized: true,
  });

  constructor(
    livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>,
    redirectURL: string,
    rpcURL: string,
    metricsOnChainInterval: number, // in minutes,
    developerPKPPublicKey: `0x04${string}` | undefined, // dev may need to mint first
    encryptUserMetrics: boolean,
    signer?: ethers.Signer,
    kinoraMetricsAddress?: `0x${string}`,
    kinoraQuestAddress?: `0x${string}`,
  ) {
    this.livepeerPlayer = livepeerPlayer;
    this.redirectURL = redirectURL;
    this.rpcURL = rpcURL;
    this.developerPKPPublicKey = developerPKPPublicKey;
    this.encryptUserMetrics = encryptUserMetrics;
    this.signer = signer ? signer : ethers.Wallet.createRandom();
    this.metrics = new Metrics();
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      this.rpcURL,
      ChainIds[this.chain],
    );
    this.chronicleProvider = new ethers.providers.JsonRpcProvider(
      LIT_RPC,
      ChainIds["chronicle"],
    );
    this.kinoraPkpDBContract = new ethers.Contract(
      KINORA_PKP_DB_CONTRACT,
      KinoraPKPDBAbi,
      this.polygonProvider,
    );
    if (kinoraMetricsAddress)
      this.kinoraMetricsAddress = new ethers.Contract(
        kinoraMetricsAddress,
        KinoraMetricsAbi,
      );
    if (kinoraQuestAddress) {
      this.kinoraQuestAddress = new ethers.Contract(
        kinoraQuestAddress,
        KinoraQuestAbi,
      );
    }
    this.pkpContract = new ethers.Contract(
      CHRONICLE_PKP_CONTRACT,
      PKPNFTAbi,
      this.signer,
    );
    this.litNodeClient.connect();

    if (typeof window !== "undefined") {
      setInterval(this.sendMetricsOnChain, metricsOnChainInterval * 60 * 1000);
      window.addEventListener("beforeunload", this.sendMetricsOnChain);
    } else {
      setInterval(this.sendMetricsOnChain, metricsOnChainInterval * 60 * 1000);
      process.on("exit", this.sendMetricsOnChain);
      process.on("SIGINT", this.sendMetricsOnChain);
    }
  }

  developerFactoryContractDeploy = async (): Promise<{
    kinoraAccessControlAddress: `0x${string}`;
    kinoraMetricsAddress: `0x${string}`;
    kinoraQuestAddress: `0x${string}`;
    pkpEthAddress: string;
    pkpPublicKey: string;
  }> => {
    const tx = await this.pkpContract.mintGrantAndBurnNext(
      2,
      getBytesFromMultihash(IPFS_CID_PKP),
      { value: "1" },
    );
    const receipt = await tx.wait();
    const logs = receipt.logs;
    const pkpTokenId = BigInt(logs[0].topics[3]).toString();
    const publicKey = await this.pkpContract.getPubkey(pkpTokenId);
    this.developerPKPPublicKey = publicKey;

    const factoryContract = new ethers.Contract(
      KINORA_FACTORY_CONTRACT,
      KinoraFactoryAbi,
      this.polygonProvider,
    );

    const txHash = await factoryContract.deployFromKinoraFactory(
      ethers.utils.computeAddress(publicKey),
    );

    const receiptFactory = await this.chronicleProvider.getTransactionReceipt(
      txHash,
    );

    if (receiptFactory && receiptFactory.logs) {
      const parsedLogs = receiptFactory.logs
        .map((log) => {
          try {
            return factoryContract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter((parsedLog) => parsedLog !== null);

      const filteredLogs = parsedLogs.filter((parsedLog) => {
        return parsedLog.name === "KinoraFactoryDeployed";
      });
      this.kinoraMetricsAddress = new ethers.Contract(
        filteredLogs[0].args[2],
        KinoraMetricsAbi,
      );
      this.kinoraQuestAddress = new ethers.Contract(
        filteredLogs[0].args[3],
        KinoraQuestAbi,
      );

      return {
        kinoraAccessControlAddress: filteredLogs[0].args[1],
        kinoraMetricsAddress: filteredLogs[0].args[2],
        kinoraQuestAddress: filteredLogs[0].args[3],
        pkpEthAddress: ethers.utils.computeAddress(publicKey),
        pkpPublicKey: publicKey,
      };
    }
  };

  authenticateUser = async (
    type: "wallet" | "google" | "discord",
  ): Promise<void> => {
    try {
      this.providerType =
        type === "wallet"
          ? ProviderType.EthWallet
          : type === "discord"
          ? ProviderType.Discord
          : ProviderType.Google;

      this.litProvider = this.litAuthClient.initProvider(this.providerType, {
        redirectUri: `${this.redirectURL}`,
      });
      this.providerType !== ProviderType.EthWallet &&
        (await (this.litProvider as GoogleProvider | DiscordProvider).signIn());
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  authenticateUserRedirect = async (): Promise<void> => {
    try {
      this.authMethod = await this.litProvider.authenticate();

      this.currentUserPKP = await this.handlePKPs();
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  bindEvents = (): void => {
    if (!this.developerPKPPublicKey) throw new Error();
    if (!this.currentUserPKP) throw new Error();
    if (!this.kinoraMetricsAddress) throw new Error();

    this.livepeerPlayer.on("stream.started", () => {
      this.metrics.updateImpressions();
      this.metrics.updateAVD(0);
      this.metrics.updateStartTime();
    });

    this.livepeerPlayer.on("stream.idle", () => {
      this.metrics.updateIdleTime();
      this.metrics.updateStartTime();
    });

    this.livepeerPlayer.on("recording.ready", () => {
      this.metrics.updateNumberOfRecordings();
    });

    this.livepeerPlayer.on("recording.started", () => {
      this.metrics.updateAVD(0);
    });

    this.livepeerPlayer.on("multistream.connected", () => {
      this.metrics.updateNumberOfClicks();
      this.metrics.updateNumberofMultistreams();
    });

    this.livepeerPlayer.on("asset.ready", () => {
      this.metrics.updateNumberOfAssets();
    });

    this.livepeerPlayer.on("task.spawned", () => {
      this.metrics.updateAVD(0);
    });

    this.livepeerPlayer.on("task.updated", () => {
      this.metrics.updateNumberOfUpdates();
    });

    this.livepeerPlayer.on("task.failed", () => {
      this.metrics.updateNumberOfFailedTasks();
    });
  };

  instantiateNewQuest = async () => {
    try {
      // quest module for a dev to set up a new quest according to the metrics
      // automate the dispatch of rewards associated with different metric combinations returned by the sdk for the user
      // allow limited number of users / etc. to sign up per quest
      // participants can active/join in on quest if match quest criteria
      // fund quest with mileston rewards and create milestones, make sure to split by max users that can join a quest
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  userJoinQuest = async () => {
    try {
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  userCompleteQuestMilestone = async () => {
    try {
      // pay out user reward
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  getQuestHistory = () => {
    // quest history encrypted on chain and retrievable by authenticated user
  };

  getSDKLogs = () => {};

  getUserMetrics = () => {};

  private handlePKPs = async (): Promise<IRelayPKP> => {
    try {
      let res = await this.fetchPkp();
      if (res == undefined) {
        res = await this.mintPkp();
      }

      const sessionSigs = await getSessionSig(
        this.authMethod,
        res,
        this.litProvider,
        this.litNodeClient,
        ChainIds[this.chain],
      );
      const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: res.publicKey,
        rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      });
      const authSig = await generateAuthSig(pkpWallet);

      this.userPKPAuthSig = authSig;

      const doesExist = await this.kinoraPkpDBContract.userExists(
        BigInt(res.tokenId).toString(),
      );

      if (!doesExist) {
        await this.storeAuthOnChain(res);
      }

      return res;
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  private storeAuthOnChain = async (currentPKP: IRelayPKP): Promise<void> => {
    try {
      const tx = await createTxData(
        this.polygonProvider,
        KinoraPKPDBAbi,
        KINORA_PKP_DB_CONTRACT,
        "addUserPKP",
        [BigInt(currentPKP?.tokenId!).toString()],
        ChainIds[this.chain],
      );

      await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        tx,
        "addUserPKP",
        this.authSig ? this.authSig : await generateAuthSig(this.signer),
        this.developerPKPPublicKey as `0x04${string}`,
      );
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  private mintPkp = async (): Promise<IRelayPKP> => {
    // mint a new pkp
    if (this.litProvider && this.authMethod) {
      const txHash = await this.litProvider.mintPKPThroughRelayer(
        this.authMethod,
      );
      const receipt = await this.chronicleProvider.getTransactionReceipt(
        txHash,
      );

      if (receipt && receipt.logs) {
        const parsedLogs = receipt.logs
          .map((log) => {
            try {
              return this.pkpContract.interface.parseLog(log);
            } catch (e) {
              return null;
            }
          })
          .filter((parsedLog) => parsedLog !== null);

        const filteredLogs = parsedLogs.filter((parsedLog) => {
          return parsedLog.name === "Transfer";
        });

        const tokenId = filteredLogs[0].args[2];
        const publicKey = await this.pkpContract.getPubkey(tokenId);
        return {
          ethAddress: ethers.utils.computeAddress(publicKey as any),
          publicKey: publicKey,
          tokenId: tokenId.toHexString(),
        };
      }
    }
  };

  private fetchPkp = async (): Promise<IRelayPKP | undefined> => {
    try {
      if (this.litProvider && this.authMethod) {
        const res = await this.litProvider.fetchPKPsThroughRelayer(
          this.authMethod,
        );

        for (let i = 0; i < res.length; i++) {
          const doesExist = await this.kinoraPkpDBContract.userExists(
            res[i].ethAddress,
          );
          if (doesExist) {
            return res[i];
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  private sendMetricsOnChain = async (): Promise<void> => {
    if (!this.developerPKPPublicKey) throw new Error();
    if (!this.currentUserPKP) throw new Error();
    if (!this.kinoraMetricsAddress) throw new Error();

    let userMetrics: UserMetrics;

    if (
      await this.kinoraMetricsAddress.getUserPlaybackIdByPlaybackId(
        this.currentUserPKP.ethAddress,
        this.livepeerPlayer.props.playbackId,
      )
    ) {
      let oldMetrics: string =
        await this.kinoraMetricsAddress.getUserMetricsJSONByPlaybackId(
          this.currentUserPKP.ethAddress,
          this.livepeerPlayer.props.playbackId,
        );

      if (
        await this.kinoraMetricsAddress.getUserEncryptedByPlaybackId(
          this.currentUserPKP.ethAddress,
          this.livepeerPlayer.props.playbackId,
        )
      ) {
        oldMetrics = await decryptMetrics(
          await JSON.parse(oldMetrics),
          ethers.utils.computeAddress(
            this.developerPKPPublicKey,
          ) as `0x${string}`,
          this.currentUserPKP.ethAddress as `0x${string}`,
          this.userPKPAuthSig,
          this.litNodeClient,
        );
      }

      const oldMetricsValues: UserMetrics = await JSON.parse(oldMetrics);

      userMetrics = {
        totalDuration:
          this.metrics.getTotalDuration() + oldMetricsValues.totalDuration,
        numberOfImpressions:
          this.metrics.getNumberOfImpressions() +
          oldMetricsValues.numberOfImpressions,
        numberOfClicks:
          this.metrics.getNumberOfClicks() + oldMetricsValues.numberOfClicks,
        totalIdleTime:
          this.metrics.getTotalIdleTime() + oldMetricsValues.totalIdleTime,
        numberOfRecordings:
          this.metrics.getNumberOfRecordings() +
          oldMetricsValues.numberOfRecordings,
        numberOfFailedTasks:
          this.metrics.getNumberofFailedTasks() +
          oldMetricsValues.numberOfFailedTasks,
        numberOfMultistreams:
          this.metrics.getNumberOfMultistreams() +
          oldMetricsValues.numberOfMultistreams,
        numberOfAssets:
          this.metrics.getNumberOfAssets() + oldMetricsValues.numberOfAssets,
        numberOfUpdates:
          this.metrics.getNumberOfUpdates() + oldMetricsValues.numberOfUpdates,
        avd:
          oldMetricsValues.numberOfImpressions +
            this.metrics.getNumberOfImpressions() !==
          0
            ? (oldMetricsValues.avd * oldMetricsValues.numberOfImpressions +
                this.metrics.getTotalDuration()) /
              (oldMetricsValues.numberOfImpressions +
                this.metrics.getNumberOfImpressions())
            : 0,
        ctr:
          oldMetricsValues.numberOfImpressions +
            this.metrics.getNumberOfImpressions() !==
          0
            ? (oldMetricsValues.ctr * oldMetricsValues.numberOfImpressions +
                this.metrics.getNumberOfClicks() * 100) /
              (oldMetricsValues.numberOfImpressions +
                this.metrics.getNumberOfImpressions())
            : 0,
        assetEngagement:
          oldMetricsValues.numberOfUpdates +
            this.metrics.getNumberOfUpdates() !==
          0
            ? (oldMetricsValues.assetEngagement *
                oldMetricsValues.numberOfUpdates +
                this.metrics.getNumberOfAssets()) /
              (oldMetricsValues.numberOfUpdates +
                this.metrics.getNumberOfUpdates())
            : 0,
        userEngagementRatio:
          oldMetricsValues.totalDuration +
            oldMetricsValues.totalIdleTime +
            this.metrics.getTotalDuration() +
            this.metrics.getTotalIdleTime() !==
          0
            ? (oldMetricsValues.totalDuration +
                this.metrics.getTotalDuration()) /
              (oldMetricsValues.totalDuration +
                oldMetricsValues.totalIdleTime +
                this.metrics.getTotalDuration() +
                this.metrics.getTotalIdleTime())
            : 0,
        multiPlaybackUsageRate:
          oldMetricsValues.numberOfImpressions +
            this.metrics.getNumberOfImpressions() !==
          0
            ? (oldMetricsValues.numberOfMultistreams *
                oldMetricsValues.numberOfImpressions +
                this.metrics.getMultistreamUsageRate()) /
              (oldMetricsValues.numberOfImpressions +
                this.metrics.getNumberOfImpressions())
            : 0,
        taskFailureRate:
          oldMetricsValues.numberOfFailedTasks +
            oldMetricsValues.numberOfUpdates +
            this.metrics.getNumberofFailedTasks() +
            this.metrics.getNumberOfUpdates() !==
          0
            ? (oldMetricsValues.numberOfFailedTasks +
                this.metrics.getNumberofFailedTasks()) /
              (oldMetricsValues.numberOfFailedTasks +
                oldMetricsValues.numberOfUpdates +
                this.metrics.getNumberofFailedTasks() +
                this.metrics.getNumberOfUpdates())
            : 0,
        recordingPerSession:
          oldMetricsValues.numberOfImpressions +
            this.metrics.getNumberOfImpressions() !==
          0
            ? (oldMetricsValues.numberOfRecordings +
                this.metrics.getNumberOfRecordings()) /
              (oldMetricsValues.numberOfImpressions +
                this.metrics.getNumberOfImpressions())
            : 0,
      };
    } else {
      userMetrics = {
        totalDuration: this.metrics.getTotalDuration(),
        numberOfImpressions: this.metrics.getNumberOfImpressions(),
        numberOfClicks: this.metrics.getNumberOfClicks(),
        totalIdleTime: this.metrics.getTotalIdleTime(),
        numberOfRecordings: this.metrics.getNumberOfRecordings(),
        numberOfFailedTasks: this.metrics.getNumberofFailedTasks(),
        numberOfMultistreams: this.metrics.getNumberOfMultistreams(),
        numberOfAssets: this.metrics.getNumberOfAssets(),
        numberOfUpdates: this.metrics.getNumberOfUpdates(),
        avd: this.metrics.getAVD(),
        ctr: this.metrics.getCTR(),
        assetEngagement: this.metrics.getAssetEngagement(),
        userEngagementRatio: this.metrics.getUserEngagementRatio(),
        multiPlaybackUsageRate: this.metrics.getMultistreamUsageRate(),
        taskFailureRate: this.metrics.getTaskFailureRate(),
        recordingPerSession: this.metrics.getRecordingPerSession(),
      };
    }

    let payload: string = JSON.stringify(userMetrics);

    if (this.encryptUserMetrics) {
      payload = await encryptMetrics(
        userMetrics,
        ethers.utils.computeAddress(
          this.developerPKPPublicKey,
        ) as `0x${string}`,
        this.currentUserPKP.ethAddress as `0x${string}`,
        this.userPKPAuthSig,
        this.litNodeClient,
      );
    }

    const tx = await createTxData(
      this.polygonProvider,
      KinoraMetricsAbi,
      this.kinoraMetricsAddress.address,
      "addUserMetrics",
      [
        this.currentUserPKP.ethAddress,
        {
          playbackId: this.livepeerPlayer.props.playbackId,
          metricJSON: payload,
          encrypted: this.encryptUserMetrics,
        },
      ],
      ChainIds[this.chain],
    );

    await litExecute(
      this.polygonProvider,
      this.litNodeClient,
      tx,
      "addUserMetrics",
      this.authSig ? this.authSig : await generateAuthSig(this.signer),
      this.developerPKPPublicKey,
    );
  };
}
