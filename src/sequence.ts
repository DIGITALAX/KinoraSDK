import { ChainIds, LivepeerPlayer } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import * as LitJsSdk_authHelpers from "@lit-protocol/auth-helpers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { ProviderType } from "@lit-protocol/constants";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import { AuthMethod, SessionSigs, IRelayPKP } from "@lit-protocol/types";
import {
  IPFS_CID_PKP,
  KINORA_FACTORY,
  KINORA_PKP_DB,
  LIT_RPC,
  PKP_CONTRACT_ADDRESS,
} from "./constants";
import KinoraPKPDBAbi from "./abis/KinoraPKPDB.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import PKPNFT from "./abis/PKPNFT.json";
import {
  DiscordProvider,
  EthWalletProvider,
  GoogleProvider,
} from "@lit-protocol/lit-auth-client";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
} from "./utils/lit-protocol";
import { JsonRpcProvider } from "@ethersproject/providers";

export class Sequence<TPlaybackPolicyObject extends object, TSlice> {
  private livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
  private metrics: Metrics;
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
  private currentUserPKP: {
    ethAddress: string;
    publicKey: string;
    tokenId: string;
    sessionSig: SessionSigs;
    pkpWallet: PKPEthersWallet;
    authSig: {
      sig: any;
      derivedVia: string;
      signedMessage: string;
      address: any;
    };
    encryptedToken: string;
  };
  private redirectURL: string;
  private streamId: string;
  private providerType: ProviderType;
  private litProvider: GoogleProvider | DiscordProvider | EthWalletProvider;
  private polygonProvider: JsonRpcProvider;
  private chronicleProvider: JsonRpcProvider;
  private authMethod: AuthMethod;
  private rpcURL: string;
  private chain: string = "polygon";
  private kinoraPkpDBContract: ethers.Contract;
  private pkpContract: ethers.Contract;
  private kinoraMetricsAddress: ethers.Contract;
  private kinoraQuestAddress: ethers.Contract;
  private developerPKPPublicKey: string;
  private encryptUserMetrics: boolean;

  constructor(
    livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>,
    redirectURL: string,
    rpcURL: string,
    streamId: string,
    metricsOnChainInterval: number, // in minutes,
    developerPKPPublicKey: `0x04${string}` | undefined, // dev may need to mint first
    encryptUserMetrics: boolean,
  ) {
    this.livepeerPlayer = livepeerPlayer;
    this.redirectURL = redirectURL;
    this.rpcURL = rpcURL;
    this.developerPKPPublicKey = developerPKPPublicKey;
    this.streamId = streamId;
    this.encryptUserMetrics = encryptUserMetrics;
    this.metrics = new Metrics();
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      this.rpcURL,
      ChainIds[this.chain],
    );
    this.chronicleProvider = new ethers.providers.JsonRpcProvider(
      LIT_RPC,
      175177,
    );
    this.kinoraPkpDBContract = new ethers.Contract(
      KINORA_PKP_DB,
      KinoraPKPDBAbi,
      this.polygonProvider,
    );
    this.pkpContract = new ethers.Contract(PKP_CONTRACT_ADDRESS, PKPNFT);
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
      KINORA_FACTORY,
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

      this.kinoraMetricsAddress = filteredLogs[0].args[2];
      this.kinoraQuestAddress = filteredLogs[0].args[3];

      return {
        kinoraAccessControlAddress: filteredLogs[0].args[1],
        kinoraMetricsAddress: filteredLogs[0].args[2],
        kinoraQuestAddress: filteredLogs[0].args[3],
        pkpEthAddress: ethers.utils.computeAddress(publicKey),
        pkpPublicKey: publicKey,
      };
    }
  };

  authenticateUser = async (type: "wallet" | "google" | "discord") => {
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

  authenticateUserRedirect = async () => {
    try {
      this.authMethod = await this.litProvider.authenticate();

      const values = await this.handlePKPs();

      this.currentUserPKP = {
        ...values?.currentPKP,
        sessionSig: values?.sessionSigs,
        pkpWallet: values?.pkpWallet,
        authSig: values?.authSig,
        encryptedToken: values?.encryptedToken,
      };
    } catch (err: any) {
      // add in error logs aqui
    }
  };

  bindEvents = () => {
    if (!this.developerPKPPublicKey) throw new Error();
    if (!this.currentUserPKP) throw new Error();

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

  getLogs = () => {};

  private handlePKPs = async () => {
    try {
      let res = await this.fetchPkp();
      if (res == undefined) {
        res = await this.mintPkp();
      }
      const sessionSigs = await this.getSessionSig(res);
      const pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: res.publicKey,
        rpc: this.rpcURL,
      });
      const authSig = await this.generateAuthSignature(pkpWallet);

      const doesExist = await this.kinoraPkpDBContract.userExists(
        BigInt(res.tokenId).toString(),
      );

      if (!doesExist) {
        await this.storeAuthOnChain(authSig, res);
      }

      const encryptedToken = await this.encryptToken(
        res.ethAddress as `0x${string}`,
        authSig,
        BigInt(res.tokenId).toString(),
      );

      return {
        currentPKP: res,
        encryptedToken,
        authSig,
        pkpWallet,
        sessionSigs,
      };
    } catch (err: any) {
      console.error(err.message);
    }
  };

  private getSessionSig = async (
    currentPKP: IRelayPKP,
  ): Promise<SessionSigs> => {
    try {
      await this.litNodeClient.connect();

      const litResource = new LitJsSdk_authHelpers.LitPKPResource(
        currentPKP.tokenId,
      );

      const sessionSigs = await this.litProvider.getSessionSigs({
        pkpPublicKey: this.currentUserPKP.publicKey,
        authMethod: {
          authMethodType:
            this.providerType === ProviderType.Google
              ? 6
              : this.providerType === ProviderType.Discord
              ? 4
              : 1,
          accessToken: this.authMethod.accessToken,
        },
        sessionSigsParams: {
          chain: this.chain,
          resourceAbilityRequests: [
            {
              resource: litResource,
              ability: LitJsSdk_authHelpers.LitAbility.PKPSigning,
            },
          ],
        },
        litNodeClient: this.litNodeClient,
      });
      return sessionSigs;
    } catch (e: any) {
      console.error(e.message);
    }
  };

  private storeAuthOnChain = async (
    authSig: {
      sig: any;
      derivedVia: string;
      signedMessage: string;
      address: any;
    },
    currentPKP: IRelayPKP,
  ) => {
    try {
      const tx = await createTxData(
        this.polygonProvider,
        KinoraPKPDBAbi,
        KINORA_PKP_DB,
        "addUserPKP",
        [BigInt(currentPKP?.tokenId!).toString()],
        ChainIds[this.chain],
      );

      await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        tx,
        "addUserPKP",
        authSig,
        currentPKP.publicKey as `0x04${string}`,
      );
    } catch (err: any) {
      console.error(err.message);
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

  private encryptToken = async (
    address: `0x${string}`,
    authSig: {
      sig: any;
      derivedVia: string;
      signedMessage: string;
      address: any;
    },
    currentPKP: string,
  ): Promise<string | undefined> => {
    try {
      let encryptedTokenId: string | undefined;

      const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
        currentPKP,
      );

      const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
        accessControlConditions: [
          {
            contractAddress: "",
            standardContractType: "",
            chain: this.chain,
            method: "",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: "=",
              value: address?.toLowerCase() as string,
            },
          },
        ],
        symmetricKey,
        authSig,
        chain: this.chain,
      });

      const buffer = await encryptedString.arrayBuffer();
      encryptedTokenId = JSON.stringify({
        encryptedString: JSON.stringify(Array.from(new Uint8Array(buffer))),
        encryptedSymmetricKey: LitJsSdk.uint8arrayToString(
          encryptedSymmetricKey,
          "base16",
        ),
      });

      return encryptedTokenId;
    } catch (err: any) {
      console.error(err.message);
    }
  };

  private generateAuthSignature = async (pkpWallet: any | undefined) => {
    try {
      const siweMessage = new SiweMessage({
        domain: "coinop.themanufactory.xyz",
        address: pkpWallet?.address,
        statement: "This is an Auth Sig for Coin Op",
        uri: "https://coinop.themanufactory.xyz",
        version: "1",
        chainId: 137,
      });
      const signedMessage = siweMessage.prepareMessage();
      const sig = await pkpWallet?.signMessage(signedMessage);
      return {
        sig,
        derivedVia: "web3.eth.personal.sign",
        signedMessage,
        address: pkpWallet?.address,
      };
    } catch (err: any) {
      console.error(err.message);
    }
  };

  private sendMetricsOnChain = async () => {
    // all metrics // stream id uniqueness map for each user
    // encrypt toggle or not?
    const payload = {
      totalDuration: this.metrics.getAVD(),
      numberOfClicks: this.metrics.getCTR(),
      streamId: this.streamId,
    };

    // tx with developer PKP
  };
}

// Engagement
// then for each metric tracked within their view time when signed in / authenticated it's tracked through logs and updated on-chain
// info is encrypted first before it's timestamped
// dev can pull logs and display them for a connected user through their pkp

// Quests
// quest module for a dev to set up a new quest according to the metrics
// automate the dispatch of rewards associated with different metric combinations returned by the sdk for the user
// allow limited number of users / etc. to sign up per quest
// participants can active/join in on quest if match quest criteria
// quest history encrypted on chain and retrievable by authenticated user
// compute credit module attachment
