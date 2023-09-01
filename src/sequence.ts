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
    this.pkpContract = new ethers.Contract(
      CHRONICLE_PKP_CONTRACT,
      PKPNFTAbi,
      this.signer,
    );

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

  getSDKLogs = () => {};

  getUserMetrics = () => {};

  private handlePKPs = async (): Promise<IRelayPKP> => {
    try {
      let res = await this.fetchPkp();
      if (res == undefined) {
        res = await this.mintPkp();
      }

      const doesExist = await this.kinoraPkpDBContract.userExists(
        BigInt(res.tokenId).toString(),
      );

      if (!doesExist) {
        await this.storeAuthOnChain(res);
      }

      return res;
    } catch (err: any) {
      console.error(err.message);
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
        this.authSig ? this.authSig : await this.generateAuthSignature(),
        this.developerPKPPublicKey as `0x04${string}`,
      );
    } catch (err: any) {
      console.error(err.message);
    }
  };

  private generateAuthSignature = async (
    chainId = 1,
    uri = "https://localhost/login",
    version = "1",
  ): Promise<LitAuthSig> => {
    try {
      this.authSig = await generateAuthSig(this.signer, chainId, uri, version);
      return this.authSig;
    } catch (err: any) {
      throw new Error(`Error generating Auth Signature: ${err.message}`);
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
      // update metrics for playback Id existing
      userMetrics = {};
    } else {
      userMetrics = {
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
      // user needs to encrypt their data and then have it stored on chain and allow the developer to view it
      payload = {};
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
      this.authSig ? this.authSig : await this.generateAuthSignature(),
      this.developerPKPPublicKey,
    );
  };
}

// Quests
// quest module for a dev to set up a new quest according to the metrics
// automate the dispatch of rewards associated with different metric combinations returned by the sdk for the user
// allow limited number of users / etc. to sign up per quest
// participants can active/join in on quest if match quest criteria
// quest history encrypted on chain and retrievable by authenticated user
// compute credit module attachment ??
