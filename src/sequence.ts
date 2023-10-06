import {
  ChainIds,
  LitAuthSig,
  LitProvider,
  Milestone,
  MilestoneURI,
  QuestURI,
  RewardType,
  Status,
  UserMetrics,
  QuestEligibility,
  ILogEntry,
  LogCategory,
} from "./../src/@types/kinora-sdk";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import axios from "axios";
import { ProviderType } from "@lit-protocol/constants";
import { ethers } from "ethers";
import { create, IPFSHTTPClient } from "ipfs-http-client";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { AuthMethod, IRelayPKP } from "@lit-protocol/types";
import {
  KINORA_FACTORY_CONTRACT,
  KINORA_PKP_DB_CONTRACT,
  LIT_RPC,
  CHRONICLE_PKP_CONTRACT,
  CHRONICLE_PKP_PERMISSIONS_CONTRACT,
  INFURA_GATEWAY,
  IPFS_HASH_NEW_USER,
  CHAIN,
} from "./../src/constants";
import KinoraPKPDBAbi from "./abis/KinoraPKPDB.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import PKPPermissionsAbi from "./abis/PKPPermissionsAbi.json";
import PKPNFTAbi from "./abis/PKPNFT.json";
import KinoraReward721Abi from "./abis/KinoraReward721Abi.json";
import { DiscordProvider, GoogleProvider } from "@lit-protocol/lit-auth-client";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
  generateAuthSig,
  encryptMetrics,
  getSessionSig,
  decryptMetrics,
  generateSecureRandomKey,
  mintNextPKP,
  assignLitAction,
  getLitActionCodeForJoinQuest,
  getLitActionCodeForMilestoneCompletion,
  getLitActionCodeForAddUserMetrics,
  removeLitAction,
  hashHex,
  bundleCodeManual,
} from "./../src/utils/lit-protocol";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import getLensValues from "./apollo/queries/getLensValues";
import * as LitJsSdk from "@lit-protocol/lit-node-client";

export class Sequence extends EventEmitter {
  private metrics: Metrics;
  private videoElement: HTMLVideoElement;
  private currentUserPKP: IRelayPKP;
  private currentUserPKPWallet: PKPEthersWallet;
  private providerType: ProviderType;
  private litProvider: LitProvider;
  private polygonProvider: JsonRpcProvider;
  private chronicleProvider: JsonRpcProvider;
  private authMethod: AuthMethod;
  private logSize = 1000;
  private logIndex = 0;
  private logs: ILogEntry[] = new Array(this.logSize);
  private rpcURL: string;
  private parentId: string;
  private chain: string = CHAIN;
  private multihashDevKey: string;
  private redirectURL: string;
  private ipfsClient: IPFSHTTPClient;
  private lensPubId: string;
  private userProfileId: string;
  private playbackId: string;
  private developerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  private kinoraReward721Address: `0x${string}`;
  private encryptUserMetrics: boolean;
  private errorHandlingModeStrict: boolean = false;
  private metricsOnChainInterval: number = 60000;
  private intervalId: NodeJS.Timeout;
  private kinoraPkpDBContract: ethers.Contract;
  private pkpContract: ethers.Contract;
  private pkpPermissionsContract: ethers.Contract;
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
  private litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: "cayenne",
    debug: false,
    alertWhenUnauthorized: true,
  });

  constructor(args: {
    playbackId?: string;
    parentId?: string;
    redirectURL?: string;
    rpcURL?: string;
    metricsOnChainInterval?: number; // in minutes,
    encryptUserMetrics?: boolean;
    errorHandlingModeStrict?: boolean;
    developerPKPPublicKey?: `0x04${string}`;
    developerPKPTokenId?: string;
    lensPubId?: string;
    userProfileId?: string;
    multihashDevKey?: string;
    signer?: ethers.Signer; // chronicle signer
    kinoraMetricsAddress?: `0x${string}`;
    kinoraQuestAddress?: `0x${string}`;
    kinoraReward721Address?: `0x${string}`;
    auth?: {
      projectId: string;
      projectSecret: string;
    };
  }) {
    super();
    this.errorHandlingModeStrict = args.errorHandlingModeStrict || false;
    this.metricsOnChainInterval = args.metricsOnChainInterval;
    this.playbackId = args.playbackId;
    this.redirectURL = args.redirectURL;
    this.rpcURL = args.rpcURL;
    if (args.developerPKPPublicKey)
      this.developerPKPData = {
        publicKey: args.developerPKPPublicKey,
        tokenId: args.developerPKPTokenId,
        ethAddress: ethers.utils.computeAddress(
          args.developerPKPPublicKey,
        ) as `0x${string}`,
      };
    this.multihashDevKey = args.multihashDevKey;
    this.encryptUserMetrics = args.encryptUserMetrics;
    this.parentId = args.parentId;
    if (args.userProfileId) this.userProfileId = args.userProfileId;
    if (args.lensPubId) this.lensPubId = args.lensPubId;
    this.metrics = new Metrics();
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      this.rpcURL,
      ChainIds[this.chain],
    );
    this.chronicleProvider = new ethers.providers.JsonRpcProvider(
      LIT_RPC,
      ChainIds["chronicle"],
    );
    this.signer = args.signer
      ? args.signer
      : ethers.Wallet.createRandom().connect(this.chronicleProvider);

    this.kinoraPkpDBContract = new ethers.Contract(
      KINORA_PKP_DB_CONTRACT,
      KinoraPKPDBAbi,
      this.polygonProvider,
    );
    if (args.kinoraMetricsAddress)
      this.kinoraMetricsAddress = new ethers.Contract(
        args.kinoraMetricsAddress,
        KinoraMetricsAbi,
      );
    if (args.kinoraQuestAddress) {
      this.kinoraQuestAddress = new ethers.Contract(
        args.kinoraQuestAddress,
        KinoraQuestAbi,
      );
    }
    if (args.kinoraReward721Address) {
      this.kinoraReward721Address = args.kinoraReward721Address;
    }
    if (args.auth)
      this.ipfsClient = create({
        url: "https://ipfs.infura.io:5001/api/v0",
        headers: {
          authorization:
            "Basic " +
            Buffer.from(
              args.auth.projectId + ":" + args.auth.projectSecret,
            ).toString("base64"),
        },
      });

    this.pkpContract = new ethers.Contract(
      CHRONICLE_PKP_CONTRACT,
      PKPNFTAbi,
      this.signer,
    );
    this.pkpPermissionsContract = new ethers.Contract(
      CHRONICLE_PKP_PERMISSIONS_CONTRACT,
      PKPPermissionsAbi,
      this.signer,
    );
    this.litNodeClient.connect();
    this.beforeUnloadHandler = this.beforeUnloadHandler.bind(this);
  }

  videoInit = (): void => {
    if (!this.parentId)
      throw new Error(
        "Specify ID of parent div to LivePeer Player element in the constructor.",
      );
    if (typeof window !== "undefined") {
      this.videoElement = document
        ?.getElementById(this.parentId)
        ?.querySelector('[class*="livepeer-contents-container"]')
        ?.querySelector("video");

      if (!this.videoElement)
        throw new Error("LivePeer Player element not found.");

      this.timeUpdateHandler = this.timeUpdateHandler.bind(this);
      this.fullScreenChangeHandler = this.fullScreenChangeHandler.bind(this);

      this.intervalId = setInterval(
        this.collectAndSendMetrics,
        this.metricsOnChainInterval * 60 * 1000,
      );

      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
  };

  developerFactoryContractDeploy = async (): Promise<{
    multihashDevKey: string;
    kinoraAccessControlAddress: `0x${string}`;
    kinoraMetricsAddress: `0x${string}`;
    kinoraEscrowAddress: `0x${string}`;
    kinoraQuestAddress: `0x${string}`;
    kinoraQuestRewardAddress: `0x${string}`;
    pkpEthAddress: string;
    pkpPublicKey: string;
    pkpTokenId: string;
  }> => {
    if (!this.signer) throw new Error("Set Signer before continuing.");
    if (!this.rpcURL)
      throw new Error("Set Polygon Provider before continuing.");
    if (!this.chronicleProvider)
      throw new Error("Set Chronicle Provider before continuing.");
    this.multihashDevKey = generateSecureRandomKey();
    const { pkpTokenId, publicKey, error, message } = await mintNextPKP(
      this.pkpContract,
    );
    this.developerPKPData = {
      publicKey: publicKey,
      tokenId: pkpTokenId,
      ethAddress: ethers.utils.computeAddress(publicKey) as `0x${string}`,
    };
    if (error) {
      this.log(
        LogCategory.ERROR,
        `Mint developer PKP failed.`,
        message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error minting developer PKP: ${message}`);
      }
      return;
    }
    const factoryContract = new ethers.Contract(
      KINORA_FACTORY_CONTRACT,
      KinoraFactoryAbi,
      this.signer.connect(this.polygonProvider),
    );

    const latestBlock = await this.polygonProvider.getBlock("latest");
    const baseFeePerGas = latestBlock.baseFeePerGas;
    const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
    const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas);

    const estimateGasLimit =
      await factoryContract.estimateGas.deployFromKinoraFactory(
        this.developerPKPData.ethAddress,
      );

    const txHash = await factoryContract.deployFromKinoraFactory(
      this.developerPKPData.ethAddress,
      {
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit: estimateGasLimit.add(
          ethers.BigNumber.from(Math.floor(estimateGasLimit.toNumber() * 0.1)),
        ),
      },
    );

    await txHash.wait();

    const receiptFactory = await this.polygonProvider.getTransactionReceipt(
      txHash.hash,
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
      this.kinoraReward721Address = filteredLogs[0].args[5];

      const { error, message } = await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(IPFS_HASH_NEW_USER),
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Error in adding Lit Action for PKP database.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error in: ${message}`);
        }
        return;
      }

      return {
        multihashDevKey: this.multihashDevKey,
        kinoraAccessControlAddress: filteredLogs[0].args[1],
        kinoraMetricsAddress: filteredLogs[0].args[2],
        kinoraQuestAddress: filteredLogs[0].args[3],
        kinoraEscrowAddress: filteredLogs[0].args[4],
        kinoraQuestRewardAddress: filteredLogs[0].args[5],
        pkpEthAddress: this.developerPKPData.ethAddress,
        pkpPublicKey: this.developerPKPData.publicKey,
        pkpTokenId: this.developerPKPData.tokenId,
      };
    }
  };

  generateNewMultiHashDevKey = async (): Promise<{
    multihashDevKey: string;
  }> => {
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    try {
      this.multihashDevKey = generateSecureRandomKey();

      const questCount = await this.kinoraQuestAddress.getTotalQuestCount();

      let newJoinHashes: string[] = [];
      let newCompletionHashes: string[] = [];

      for (let i = 0; i < questCount; i++) {
        const questURI = await this.kinoraQuestAddress.getQuestURIDetails(
          i + 1,
        );
        const oldJoinHashBytes = await this.kinoraQuestAddress.getQuestJoinHash(
          i + 1,
        );

        const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

        const joinCondition = (await JSON.parse(response.data)).joinCondition;

        const newJoinHash = hashHex(joinCondition + this.multihashDevKey);

        newJoinHashes.push(newJoinHash);

        const {
          error: removeError,
          message: removeMessage,
          txHash: removeTx,
        } = await removeLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          oldJoinHashBytes,
        );

        if (removeError) {
          this.log(
            LogCategory.ERROR,
            `Error in removing previous Lit Action.`,
            removeMessage,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error in: ${removeMessage}`);
          }
          return;
        }

        const {
          error,
          message,
          txHash: assignTx,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          newJoinHash,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Error in assigning new Lit Action.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error in: ${message}`);
          }
          return;
        }

        for (let j = 0; ; j++) {
          const milestoneURI =
            await this.kinoraQuestAddress.getQuestMilestoneURIDetails(j + 1);

          const response = await axios.get(
            `${INFURA_GATEWAY}/ipfs/${milestoneURI}`,
          );

          const completionCondition = (await JSON.parse(response.data))
            .completionCondition;

          const newMilestoneHash = getBytesFromMultihash(
            completionCondition + this.multihashDevKey,
          );

          newCompletionHashes.push(newMilestoneHash);

          const oldCompletionHashBytes =
            await this.kinoraQuestAddress.getQuestMilestoneCompletionHash(
              i + 1,
              j + 1,
            );
          const {
            error: removeError,
            message: removeMessage,
            txHash: removeTx,
          } = await removeLitAction(
            this.pkpPermissionsContract,
            this.developerPKPData.tokenId,
            oldCompletionHashBytes,
          );

          if (removeError) {
            this.log(
              LogCategory.ERROR,
              `Error in removing previous Lit Action for Milestones.`,
              removeMessage,
              new Date().toISOString(),
            );
            if (this.errorHandlingModeStrict) {
              throw new Error(`Error in: ${removeMessage}`);
            }
            return;
          }

          const {
            error,
            message,
            txHash: assignTx,
          } = await assignLitAction(
            this.pkpPermissionsContract,
            this.developerPKPData.tokenId,
            newMilestoneHash,
          );

          if (error) {
            this.log(
              LogCategory.ERROR,
              `Error in removing assigning new Lit Action for Milestones.`,
              message,
              new Date().toISOString(),
            );
            if (this.errorHandlingModeStrict) {
              throw new Error(`Error in: ${message}`);
            }
            return;
          }
        }
      }

      await this.kinoraQuestAddress.updateAllJoinHashes(newJoinHashes);
      await this.kinoraQuestAddress.updateAllCompletionHashes(
        newCompletionHashes,
      );

      return {
        multihashDevKey: this.multihashDevKey,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `User Authentication failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating user: ${err.message}`);
      }
    }
  };

  authenticateUser = async (
    type: "wallet" | "google" | "discord",
  ): Promise<void> => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
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
      this.log(
        LogCategory.ERROR,
        `User Authentication failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating user: ${err.message}`);
      }
    }
  };

  authenticateUserRedirect = async (): Promise<string> => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    try {
      this.authMethod = await this.litProvider.authenticate();
      this.currentUserPKP = await this.handlePKPs();

      const uriHash = hashHex(
        this.currentUserPKP.ethAddress + this.multihashDevKey,
      );

      const litAction = getLitActionCodeForAddUserMetrics(
        uriHash,
        this.kinoraQuestAddress.address,
      );
      const outputString = bundleCodeManual(litAction);

      return outputString;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `User Authentication failed on redirect.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(
          `Error authenticating user on redirect: ${err.message}`,
        );
      }
    }
  };

  assignIPFSLitAction = async (
    litActionHash: string,
  ): Promise<{
    error: boolean;
    errorMessage: string;
    txHash: string;
  }> => {
    const { error, message, txHash } = await assignLitAction(
      this.pkpPermissionsContract,
      this.developerPKPData.tokenId,
      getBytesFromMultihash(litActionHash),
    );

    if (error) {
      this.log(
        LogCategory.ERROR,
        `Assign Lit Action with IPFS Hash failed.`,
        message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error signing Lit Action: ${message}`);
      }
    }

    return {
      error,
      errorMessage: message,
      txHash,
    };
  };

  bindEvents = (): void => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.videoElement)
      throw new Error(
        "Video element not detected. Make sure to set your LivePeer Player component in your app.",
      );
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.currentUserPKP)
      throw new Error("Set user's PKP before continuing.");
    if (!this.kinoraMetricsAddress)
      throw new Error("Set Kinora Metrics Address before continuing.");

    this.videoElement.addEventListener("play", this.metrics.onPlay);
    this.videoElement.addEventListener("pause", this.metrics.onPause);
    this.videoElement.addEventListener("timeupdate", this.timeUpdateHandler);
    this.videoElement.addEventListener("click", this.metrics.onClick);
    this.videoElement.addEventListener("seeking", this.metrics.onSkip);

    this.videoElement.addEventListener(
      "volumechange",
      this.metrics.onVolumeChange,
    );
    document.addEventListener("fullscreenchange", this.fullScreenChangeHandler);

    this.videoElement.addEventListener("waiting", this.metrics.onBufferStart);

    this.videoElement.addEventListener("playing", this.metrics.onBufferEnd);
  };

  instantiateNewQuest = async (questInputs: {
    uriDetails: QuestURI;
    maxParticipantCount: number;
    milestones: Milestone[];
  }): Promise<{
    txHashInstantiateQuest: string;
    txHashAssignLitActionJoinQuest: string;
    txHashesAssignLitActionMilestoneCompletion: string[];
    questId: string;
    litActionIPFSCidJoinQuest: string;
    litActionIPFSCidMilestones: string[];
  }> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    try {
      const added = await this.ipfsClient.add(
        JSON.stringify(questInputs.uriDetails),
      );
      const uri = added.path;

      const uriHash = hashHex(
        JSON.stringify(questInputs.uriDetails.joinCondition) +
          this.multihashDevKey,
      );

      const litAction = getLitActionCodeForJoinQuest(
        uriHash,
        this.kinoraQuestAddress.address,
      );
      const outputString = bundleCodeManual(litAction);

      const litActionHash = (await this.ipfsClient.add(outputString)).path;

      const { error, message, txHash } = await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(litActionHash),
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Assign Join Quest Lit Action failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error assigning Join Quest Lit Action: ${message}`);
        }
        return;
      }

      const txHashKinora = await this.kinoraQuestAddress.instantiateNewQuest(
        "ipfs://" + uri,
        questInputs.maxParticipantCount,
      );

      const questId = await this.kinoraQuestAddress.getTotalQuestCount();
      const milestoneLitActionHashes: string[] = [];
      const milestoneLitActionTx: string[] = [];

      for (let i = 0; i < questInputs.milestones.length; i++) {
        const added = await this.ipfsClient.add(
          JSON.stringify(questInputs.milestones[i].uriDetails),
        );
        const uri = added.path;

        const uriHash = hashHex(
          JSON.stringify(
            questInputs.milestones[i].uriDetails.completionCondition,
          ) + this.multihashDevKey,
        );

        const litAction = getLitActionCodeForMilestoneCompletion(
          uriHash,
          this.kinoraQuestAddress.address,
        );
        const outputString = bundleCodeManual(litAction);

        const litActionHash = (await this.ipfsClient.add(outputString)).path;
        milestoneLitActionHashes.push(litActionHash);

        const { error, message, txHash } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Assign Join Quest Lit Action failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error assigning Join Quest Lit Action: ${message}`,
            );
          }
          return;
        }

        milestoneLitActionTx.push(txHash);

        await this.kinoraQuestAddress.addQuestMilestone(
          questInputs.milestones[i].reward,
          "ipfs://" + uri,
          questId,
          questInputs.milestones[i].numberOfPoints,
        );
      }

      return {
        txHashInstantiateQuest: txHashKinora,
        txHashAssignLitActionJoinQuest: txHash,
        txHashesAssignLitActionMilestoneCompletion: milestoneLitActionTx,
        questId,
        litActionIPFSCidJoinQuest: litActionHash,
        litActionIPFSCidMilestones: milestoneLitActionHashes,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Quest instantiation failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error instantiating new Quest: ${err.message}`);
      }
    }
  };

  addQuestMilestones = async (
    questMilestones: Milestone[],
    questId: number,
  ): Promise<{
    txHashesAddMilestone: string[];
    txHashesAssignLitAction: string[];
    litActionIPFSCids: string[];
  }> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    try {
      let txHashes: string[] = [];
      let txHashesAssignAction: string[] = [];
      let litActionHashes: string[] = [];

      for (let i = 0; i < questMilestones.length; i++) {
        const added = await this.ipfsClient.add(
          JSON.stringify(questMilestones[i].uriDetails),
        );
        const uri = added.path;

        const uriHash = hashHex(
          JSON.stringify(questMilestones[i].uriDetails.completionCondition) +
            this.multihashDevKey,
        );

        const litAction = getLitActionCodeForMilestoneCompletion(
          uriHash,
          this.kinoraQuestAddress.address,
        );

        const outputString = bundleCodeManual(litAction);

        const litActionHash = (await this.ipfsClient.add(outputString)).path;
        litActionHashes.push(litActionHash);

        const {
          error,
          message,
          txHash: addMilestone,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

        txHashesAssignAction.push(addMilestone);

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Assign Join Quest Lit Action failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error assigning Join Quest Lit Action: ${message}`,
            );
          }
          return;
        }

        const txHash = await this.kinoraQuestAddress.addQuestMilestone(
          questMilestones[i].reward,
          "ipfs://" + uri,
          questId,
          questMilestones[i].numberOfPoints,
        );
        txHashes.push(txHash);
      }

      return {
        txHashesAddMilestone: txHashes,
        txHashesAssignLitAction: txHashesAssignAction,
        litActionIPFSCids: litActionHashes,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Add Quest Milestone failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error adding Quest Milestone: ${err.message}`);
      }
    }
  };

  updateQuestDetails = async (questDetails: {
    questId: number;
    newURIDetails: QuestURI;
    newMilestones: Milestone[];
    newStatus: Status;
    newMaxParticipantCount: number;
  }): Promise<{ txHash: string }> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    try {
      const added = await this.ipfsClient.add(
        JSON.stringify(questDetails.newURIDetails),
      );
      const uri = added.path;

      const uriHash = hashHex(
        JSON.stringify(questDetails.newURIDetails.joinCondition) +
          this.multihashDevKey,
      );

      const litAction = getLitActionCodeForJoinQuest(
        uriHash,
        this.kinoraQuestAddress.address,
      );

      const outputString = bundleCodeManual(litAction);

      const litActionHash = (await this.ipfsClient.add(outputString)).path;

      const oldJoinHashBytes = await this.kinoraQuestAddress.getQuestJoinHash(
        questDetails.questId,
      );

      const {
        error: removeError,
        message: removeMessage,
        txHash: removeTx,
      } = await removeLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        oldJoinHashBytes,
      );

      if (removeError) {
        this.log(
          LogCategory.ERROR,
          `Remove Lit Action failed on Quest Details Update.`,
          removeMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error removing Lit Action for updating Quest Details: ${removeMessage}`,
          );
        }
        return;
      }

      const {
        error,
        message,
        txHash: assignTx,
      } = await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(litActionHash),
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Assign Quest Lit Action failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error assigning Quest Lit Action: ${message}`);
        }
        return;
      }

      let newMilestones: Milestone[] = [];

      for (let i = 0; i < questDetails.newMilestones.length; i++) {
        const added = await this.ipfsClient.add(
          JSON.stringify(questDetails.newMilestones[i].uriDetails),
        );
        const uri = added.path;

        const uriHash = hashHex(
          JSON.stringify(
            questDetails.newMilestones[i].uriDetails.completionCondition,
          ) + this.multihashDevKey,
        );

        const litAction = getLitActionCodeForMilestoneCompletion(
          uriHash,
          this.kinoraQuestAddress.address,
        );

        const outputString = bundleCodeManual(litAction);

        const litActionHash = (await this.ipfsClient.add(outputString)).path;

        const {
          error,
          message,
          txHash: addMilestoneTx,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Assign Quest Lit Action failed on Update.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error assigning Quest Lit Action on Update: ${message}`,
            );
          }
          return;
        }

        const oldLitActionBytes =
          await this.kinoraQuestAddress.getQuestMilestoneCompletionHash(
            questDetails.questId,
            i + 1,
          );

        const {
          error: removeError,
          message: removeMessage,
          txHash: removeTx,
        } = await removeLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          oldLitActionBytes,
        );

        if (removeError) {
          this.log(
            LogCategory.ERROR,
            `Remove Quest Lit Action failed on Update.`,
            removeMessage,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error removing Quest Lit Action on Update: ${removeMessage}`,
            );
          }
          return;
        }

        const {
          error: assignError,
          message: assignMessage,
          txHash,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

        if (assignError) {
          this.log(
            LogCategory.ERROR,
            `Assign Quest Lit Action failed on Update.`,
            assignMessage,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error assigning new Quest Lit Action on Update: ${assignMessage}`,
            );
          }
          return;
        }

        newMilestones.push({
          ...questDetails.newMilestones[i],
          uriDetails: ("ipfs://" + uri) as any,
        });
      }

      const txHash = await this.kinoraQuestAddress.updateQuestDetails(
        "ipfs://" + uri,
        newMilestones,
        questDetails.newStatus,
        questDetails.newMaxParticipantCount,
        questDetails.questId,
      );

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Quest details udpated failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error updating Quest details: ${err.message}`);
      }
    }
  };

  updateQuestStatus = async (
    questId: number,
    newStatus: Status,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    try {
      const txHash = await this.kinoraQuestAddress.updateQuestStatus(
        questId,
        newStatus,
      );

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Quest status update failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error updating Quest status: ${err.message}`);
      }
    }
  };

  updateMilestoneDetails = async (milestoneDetails: {
    questId: number;
    milestoneId: number;
    newMilestoneURIDetails: MilestoneURI;
    newRewardType: RewardType;
    newTokenAddress: `0x${string}`;
    newNumberOfPoints: number;
    newERC20Amount: number;
  }): Promise<{ txHash: string }> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    try {
      const added = await this.ipfsClient.add(
        JSON.stringify(milestoneDetails.newMilestoneURIDetails),
      );
      const uri = added.path;

      const uriHash = hashHex(
        JSON.stringify(
          milestoneDetails.newMilestoneURIDetails.completionCondition,
        ) + this.multihashDevKey,
      );

      const litAction = getLitActionCodeForMilestoneCompletion(
        uriHash,
        this.kinoraQuestAddress.address,
      );

      const outputString = bundleCodeManual(litAction);

      const litActionHash = (await this.ipfsClient.add(outputString)).path;
      const oldLitActionBytes =
        await this.kinoraQuestAddress.getQuestMilestoneCompletionHash(
          milestoneDetails.questId,
          milestoneDetails.milestoneId,
        );

      const {
        error: removeError,
        message: removeMessage,
        txHash: removeTx,
      } = await removeLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        oldLitActionBytes,
      );

      if (removeError) {
        this.log(
          LogCategory.ERROR,
          `Remove Quest Lit Action failed on Update.`,
          removeMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error removing Quest Lit Action on Update: ${removeMessage}`,
          );
        }
        return;
      }

      const {
        error: assignError,
        message: assignMessage,
        txHash: assignTx,
      } = await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(litActionHash),
      );

      if (assignError) {
        this.log(
          LogCategory.ERROR,
          `Assign Quest Lit Action failed on Update.`,
          assignMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error assigning new Quest Lit Action on Update: ${assignMessage}`,
          );
        }
        return;
      }

      const txHash = await this.kinoraQuestAddress.updateMilestoneDetails(
        "ipfs://" + uri,
        milestoneDetails.newRewardType,
        milestoneDetails.newTokenAddress,
        uriHash,
        milestoneDetails.questId,
        milestoneDetails.milestoneId,
        milestoneDetails.newNumberOfPoints,
        milestoneDetails.newERC20Amount,
      );

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Quest Milestone update failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error updating Quest Milestone: ${err.message}`);
      }
    }
  };

  removeQuestMilestone = async (
    questId: number,
    milestoneId: number,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");

    try {
      const txHash = await this.kinoraQuestAddress.removeQuestMilestone(
        questId,
        milestoneId,
      );

      const oldLitActionBytes =
        await this.kinoraQuestAddress.getQuestMilestoneCompletionHash(
          questId,
          milestoneId,
        );

      const {
        error: removeError,
        message: removeMessage,
        txHash: removeTx,
      } = await removeLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        oldLitActionBytes,
      );

      if (removeError) {
        this.log(
          LogCategory.ERROR,
          `Remove Quest Lit Action failed on Remove milestone.`,
          removeMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error removing Quest Lit Action on Remove milestone: ${removeMessage}`,
          );
        }
      }

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Remove Quest Milestone failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error removing Quest Milestone: ${err.message}`);
      }
    }
  };

  terminateQuest = async (questId: number): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    try {
      const txHash = await this.kinoraQuestAddress.terminateQuest(questId);

      const oldLitActionBytes = await this.kinoraQuestAddress.getQuestJoinHash(
        questId,
      );

      const {
        error: removeError,
        message: removeMessage,
        txHash: removeTx,
      } = await removeLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        oldLitActionBytes,
      );

      if (removeError) {
        this.log(
          LogCategory.ERROR,
          `Remove Quest Lit Action failed on Terminate.`,
          removeMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error removing Quest Lit Action on Terminate: ${removeMessage}`,
          );
        }
      }

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Terminate Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error terminating Quest: ${err.message}`);
      }
    }
  };

  userJoinQuest = async (
    questId: number,
    joinQuestLitActionIPFSCid: string,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress.address)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.currentUserPKP.ethAddress)
      throw new Error("Set user's PKP before continuing.");

    const joinCondition = await this.checkQuestMilestoneMetrics(questId);

    if (!joinCondition) {
      this.log(
        LogCategory.ERROR,
        `User failed to meet Quest Join Condition.`,
        "Error authenticating user for Quest",
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating user for Quest`);
      }

      return;
    }

    try {
      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraQuestAbi,
        "userJoinQuest",
        [questId, this.currentUserPKP.ethAddress],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on User Join Quest.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on User Join Quest: ${txMessage}`,
          );
        }

        return;
      }

      const {
        error: generatedError,
        message: generatedMessage,
        litAuthSig,
      } = await generateAuthSig(this.signer);

      if (generatedError) {
        this.log(
          LogCategory.ERROR,
          `Generate Auth Sig error on User Join Quest.`,
          generatedMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Auth Sig on User Join Quest: ${generatedMessage}`,
          );
        }

        return;
      }

      const questURI = await this.kinoraQuestAddress.getQuestURIDetails(
        questId,
      );

      const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

      const joinCondition = (await JSON.parse(response.data)).joinCondition;

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "userJoinQuest",
        this.authSig ? this.authSig : litAuthSig,
        joinQuestLitActionIPFSCid,
        this.developerPKPData.publicKey,
        this.multihashDevKey,
        JSON.stringify(joinCondition),
      );
      if (error) {
        this.log(
          LogCategory.ERROR,
          `User Join Quest failed on Broadcast.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error user joining Quest and broadcasting: ${message}`,
          );
        }
        return;
      } else {
        this.log(
          LogCategory.RESPONSE,
          `User Joined Quest successfully. Lit Action Response.`,
          litResponse,
          new Date().toISOString(),
        );
        this.log(
          LogCategory.BROADCAST,
          `Broadcast on-chain.`,
          txHash,
          new Date().toISOString(),
        );
      }

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `User Join Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error user joining Quest: ${err.message}`);
      }
    }
  };

  userCompleteQuestMilestone = async (
    questId: number,
    milestoneId: number,
    completeMilestoneIPFSCid: string,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress.address)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.currentUserPKP.ethAddress)
      throw new Error("Set user's PKP before continuing.");

    const completeCondition = await this.checkQuestMilestoneMetrics(
      questId,
      milestoneId,
    );

    if (!completeCondition) {
      this.log(
        LogCategory.ERROR,
        `User failed to meet Quest Join Condition.`,
        "Error authenticating user for Quest",
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating user for Quest.`);
      }

      return;
    }

    try {
      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraQuestAbi,
        "userCompleteMilestone",
        [questId, milestoneId, this.currentUserPKP.ethAddress],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on User Complete Milestone.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on User Complete Milestone: ${txMessage}`,
          );
        }

        return;
      }

      const {
        error: authSigError,
        message: authSigMessage,
        litAuthSig,
      } = await generateAuthSig(this.signer);

      if (authSigError) {
        this.log(
          LogCategory.ERROR,
          `Lit Auth Sig generation failed.`,
          authSigMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error generating Lit Auth Sig: ${authSigMessage}`);
        }
        return;
      }

      const milestoneURI =
        await this.kinoraQuestAddress.getQuestMilestoneURIDetails(
          questId,
          milestoneId,
        );

      const response = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${milestoneURI}`,
      );

      const completeCondition = (await JSON.parse(response.data)).joinCondition;

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "userCompleteMilestone",
        this.authSig ? this.authSig : litAuthSig,
        completeMilestoneIPFSCid,
        this.developerPKPData.publicKey,
        this.multihashDevKey,
        JSON.stringify(completeCondition),
      );

      if (error) {
        if (error) {
          this.log(
            LogCategory.ERROR,
            `User Complete Milestone failed on Broadcast.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error completing User Milestone and broadcasting: ${message}`,
            );
          }
        }
        return;
      } else {
        this.log(
          LogCategory.RESPONSE,
          `User Completed Milestone successfully. Lit Action Response.`,
          litResponse,
          new Date().toISOString(),
        );
        this.log(
          LogCategory.BROADCAST,
          `Broadcast on-chain.`,
          txHash,
          new Date().toISOString(),
        );
      }

      return { txHash };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `User completing milestone failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error completing user Milestone: ${err.message}`);
      }
    }
  };

  userMintERC721Reward = async (
    questId: number,
    milestoneId: number,
    userPKPAddress: `0x${string}`,
    mintToAddress: `0x${string}`,
    nodeproviderRPCURL?: string,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraReward721Address)
      throw new Error("Set Kinora ERC721 Reward Address before continuing.");
    try {
      let provider:
        | ethers.providers.Web3Provider
        | ethers.providers.JsonRpcProvider;

      if (
        typeof window !== "undefined" &&
        typeof (window as any).ethereum !== "undefined"
      ) {
        provider = new ethers.providers.Web3Provider((window as any).ethereum);
      } else {
        provider = new ethers.providers.JsonRpcProvider(nodeproviderRPCURL);
      }

      const { error, message, generatedTxData } = await createTxData(
        provider,
        KinoraReward721Abi,
        "mintRewardNFT",
        [userPKPAddress, questId, milestoneId],
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `User mint reward NFT failed on creating TX data.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error creating TX data for minting reward NFT: ${message}`,
          );
        }
        return;
      }

      const signedTx = await this.currentUserPKPWallet.signTransaction({
        from: this.kinoraReward721Address,
        to: mintToAddress,
        gasLimit: generatedTxData.gasLimit,
        maxFeePerGas: generatedTxData.maxFeePerGas,
        maxPriorityFeePerGas: generatedTxData.maxPriorityFeePerGas,
        data: generatedTxData.data as any,
        nonce: generatedTxData.nonce,
        value: ethers.BigNumber.from(0),
        chainId: 137,
      });

      const txHash = await this.currentUserPKPWallet.sendTransaction(signedTx);

      this.log(
        LogCategory.BROADCAST,
        `Mint NFT Reward 721 on-chain.`,
        txHash,
        new Date().toISOString(),
      );

      return {
        txHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `User minting ERC721 reward failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error minting ERC721 reward: ${err.message}`);
      }
    }
  };

  getQuestHistory = async (): Promise<
    {
      questId: number;
      questURIDetails: QuestURI;
      questMilestoneDetails: MilestoneURI;
      milestonesCompleted: number[];
    }[]
  > => {
    if (!this.currentUserPKP.ethAddress)
      throw new Error("Set user's PKP before continuing.");
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    try {
      const questsJoined = this.kinoraQuestAddress.getUserQuestsJoined(
        this.currentUserPKP.ethAddress,
      );

      let questHistory: {
        questId: number;
        questURIDetails: QuestURI;
        questMilestoneDetails: MilestoneURI;
        milestonesCompleted: number[];
      }[] = [];

      for (let i = 0; i < questsJoined.length; i++) {
        const questURI = await this.kinoraQuestAddress.getQuestURIDetails(
          questsJoined[i],
        );

        const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

        const getQuestMilestoneURIDetails =
          await this.kinoraQuestAddress.getQuestMilestoneURIDetails();

        questHistory.push({
          questId: questsJoined[i],
          questURIDetails: await JSON.parse(response.data),
          questMilestoneDetails: await JSON.parse(getQuestMilestoneURIDetails),
          milestonesCompleted:
            await this.kinoraQuestAddress.getUserMilestonesCompletedPerQuest(
              this.currentUserPKP.ethAddress,
              i,
            ),
        });
      }

      return questHistory;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Retrieve Quest history failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error retrieving Quest history: ${err.message}`);
      }
    }
  };

  getLogs = (category?: LogCategory): ILogEntry[] => {
    const logsInOrder = [
      ...this.logs.slice(this.logIndex),
      ...this.logs.slice(0, this.logIndex),
    ].filter((log) => log !== undefined);

    if (!category) {
      return logsInOrder;
    }

    return logsInOrder.filter((log) => log.category === category);
  };

  private handlePKPs = async (): Promise<IRelayPKP> => {
    try {
      let res = await this.fetchPkp();
      if (res == undefined) {
        res = await this.mintPkp();
      }

      const { sessionSigs, error, message } = await getSessionSig(
        this.authMethod,
        res,
        this.litProvider,
        this.litNodeClient,
        ChainIds[this.chain],
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Mint of PKP failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error minting PKP: ${message}`);
        }
        return;
      }

      this.currentUserPKPWallet = new PKPEthersWallet({
        controllerSessionSigs: sessionSigs,
        pkpPubKey: res.publicKey,
        rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      });
      const {
        error: generateError,
        message: generateMessage,
        litAuthSig,
      } = await generateAuthSig(this.currentUserPKPWallet);

      if (generateError) {
        this.log(
          LogCategory.ERROR,
          `Lit Auth Sig generation failed.`,
          generateMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error generating Lit Auth Sig: ${generateMessage}`);
        }
        return;
      }

      this.userPKPAuthSig = litAuthSig;

      const doesExist = await this.kinoraPkpDBContract.userExists(
        BigInt(res.tokenId).toString(),
      );

      if (!doesExist) {
        await this.storeAuthOnChain(res);
      }

      return res;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Mint of PKP failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error minting PKP: ${err.message}`);
      }
    }
  };

  private storeAuthOnChain = async (currentPKP: IRelayPKP): Promise<void> => {
    try {
      const {
        error: generatedError,
        message: generatedMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraPKPDBAbi,
        "addUserPKP",
        [BigInt(currentPKP?.tokenId!).toString()],
      );

      if (generatedError) {
        this.log(
          LogCategory.ERROR,
          `Store Auth on-chain failed on Create Tx data.`,
          generatedMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error storing auth on-chain for create Tx data: ${generatedMessage}`,
          );
        }
        return;
      }

      const {
        error: authSigError,
        message: authSigMessage,
        litAuthSig,
      } = await generateAuthSig(this.signer);

      if (authSigError) {
        this.log(
          LogCategory.ERROR,
          `Store Auth on-chain failed on generate Lit Auth Sig.`,
          authSigMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error storing auth on-chain for generating Lit Auth Sig: ${authSigMessage}`,
          );
        }
        return;
      }

      const { txHash, message, error, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "addUserPKP",
        this.authSig ? this.authSig : litAuthSig,
        IPFS_HASH_NEW_USER,
        this.developerPKPData.publicKey,
        this.multihashDevKey,
        "",
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Store Auth on-chain failed on Broadcast.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error storing auth on-chain and broadcasting: ${message}`,
          );
        }
        return;
      }
      this.log(
        LogCategory.RESPONSE,
        `Stored Auth on-chain successfully. Lit Action Response.`,
        litResponse,
        new Date().toISOString(),
      );
      this.log(
        LogCategory.BROADCAST,
        `Broadcast on-chain.`,
        txHash,
        new Date().toISOString(),
      );
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Store PKP data on-chain failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error storing PKP data on-chain: ${err.message}`);
      }
    }
  };

  private mintPkp = async (): Promise<IRelayPKP> => {
    try {
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
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Mint PKP failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error minting new PKP: ${err.message}`);
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
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Fetch PKP failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error fetching PKP: ${err.message}`);
      }
    }
  };

  private collectAndSendMetrics = async (): Promise<void> => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.videoElement)
      throw new Error(
        "Video element not detected. Make sure to set your LivePeer Player component in your app.",
      );

    try {
      const userMetrics = await this.collectMetrics();
      await this.sendMetricsOnChain(userMetrics);
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Send metrics on-chain failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error sending metrics on-chain: ${err.message}`);
      }
    }
  };

  private collectMetrics = async (): Promise<UserMetrics> => {
    let userMetrics: UserMetrics;

    let lensValues: {
      mirrorLens: boolean;
      likeLens: boolean;
      bookmarkLens: boolean;
      notInterestedLens: boolean;
    } = {
      mirrorLens: false,
      likeLens: false,
      bookmarkLens: false,
      notInterestedLens: false,
    };
    try {
      if (
        await this.kinoraMetricsAddress.getUserPlaybackIdByPlaybackId(
          this.currentUserPKP.ethAddress,
          this.playbackId,
        )
      ) {
        let oldMetricsHash: string =
          await this.kinoraMetricsAddress.getUserMetricsJSONHashByPlaybackId(
            this.currentUserPKP.ethAddress,
            this.playbackId,
          );

        const oldMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${oldMetricsHash}`,
        );

        let oldMetrics = await JSON.parse(oldMetricsToParse.data);

        if (
          await this.kinoraMetricsAddress.getUserEncryptedByPlaybackId(
            this.currentUserPKP.ethAddress,
            this.playbackId,
          )
        ) {
          const {
            error: decryptError,
            message,
            decryptedString,
          } = await decryptMetrics(
            await JSON.parse(oldMetrics),
            this.developerPKPData.ethAddress,
            this.currentUserPKP.ethAddress as `0x${string}`,
            this.userPKPAuthSig,
            this.litNodeClient,
          );

          if (decryptError) {
            this.log(
              LogCategory.ERROR,
              `Decrypt previously collected metrics failed.`,
              message,
              new Date().toISOString(),
            );
            if (this.errorHandlingModeStrict) {
              throw new Error(
                `Error decrypting user collected metrics: ${message}`,
              );
            }
            return;
          } else {
            oldMetrics = decryptedString;
          }
        }

        const oldMetricsValues: UserMetrics = await JSON.parse(oldMetrics);

        if (this.userProfileId) {
          const { data } = await getLensValues(
            this.lensPubId,
            this.userProfileId,
          );

          lensValues = {
            mirrorLens: data?.publication?.mirrors?.length > 0 ? true : false,
            likeLens:
              data?.publication[0]?.reaction === "UPVOTE" ? true : false,
            bookmarkLens: data?.publication?.bookmarked,
            notInterestedLens: data?.publication?.notInterested,
          };
        }

        userMetrics = {
          rawTotalDuration: this.metrics.getTotalDuration(),
          rawPlayCount: this.metrics.getPlayCount(),
          rawPauseCount: this.metrics.getPauseCount(),
          rawSkipCount: this.metrics.getSkipCount(),
          rawClickCount: this.metrics.getClickCount(),
          rawImpressionCount: this.metrics.getImpressionCount(),
          rawBounceCount: this.metrics.getBounceCount(),
          rawBounceRate: this.metrics.getBounceRate(),
          rawVolumeChangeCount: this.metrics.getVolumeChangeCount(),
          rawFullScreenCount: this.metrics.getFullScreenCount(),
          rawBufferCount: this.metrics.getBufferCount(),
          rawBufferDuration: this.metrics.getBufferDuration(),
          rawEngagementRate: this.metrics.getEngagementRate(
            this.videoElement.duration,
          ),
          rawPreferredTimeToWatch: this.metrics.getMostPreferredTimeToWatch(),
          rawMostViewedSegment: this.metrics.getMostViewedSegment(),
          rawInteractionRate: this.metrics.getInteractionRate(),
          rawMostReplayedArea: this.metrics.getMostReplayedArea(),
          rawPlayPauseRatio: this.metrics.getPlayPauseRatio(),
          rawCtr: this.metrics.getCTR(),
          rawAvd: this.metrics.getAVD(),
          averageBounceRate:
            oldMetricsValues.rawImpressionCount +
              this.metrics.getImpressionCount() ===
            0
              ? oldMetricsValues.averageBounceRate
              : ((oldMetricsValues.rawBounceCount +
                  this.metrics.getBounceCount()) /
                  (oldMetricsValues.rawImpressionCount +
                    this.metrics.getImpressionCount())) *
                100,
          averageBufferDuration:
            oldMetricsValues.rawBufferCount + this.metrics.getBufferCount() ===
            0
              ? oldMetricsValues.averageBufferDuration
              : (oldMetricsValues.rawBufferDuration +
                  this.metrics.getBufferDuration()) /
                (oldMetricsValues.rawBufferCount +
                  this.metrics.getBufferCount()),
          averageEngagementRate:
            (oldMetricsValues.rawPlayCount + this.metrics.getPlayCount()) *
              this.videoElement.duration ===
            0
              ? oldMetricsValues.averageEngagementRate
              : ((oldMetricsValues.rawTotalDuration +
                  this.metrics.getTotalDuration()) /
                  ((oldMetricsValues.rawPlayCount +
                    this.metrics.getPlayCount()) *
                    this.videoElement.duration)) *
                100,
          averagePlayPauseRatio:
            oldMetricsValues.rawPauseCount + this.metrics.getPauseCount() === 0
              ? oldMetricsValues.averagePlayPauseRatio
              : (oldMetricsValues.rawPlayCount + this.metrics.getPlayCount()) /
                (oldMetricsValues.rawPauseCount + this.metrics.getPauseCount()),
          averageCtr:
            oldMetricsValues.rawImpressionCount +
              this.metrics.getImpressionCount() ===
            0
              ? oldMetricsValues.averageCtr
              : ((oldMetricsValues.rawClickCount +
                  this.metrics.getClickCount()) /
                  (oldMetricsValues.rawImpressionCount +
                    this.metrics.getImpressionCount())) *
                100,
          averageAvd:
            oldMetricsValues.rawPlayCount + this.metrics.getPlayCount() === 0
              ? oldMetricsValues.averageAvd
              : (oldMetricsValues.rawTotalDuration +
                  this.metrics.getTotalDuration()) /
                (oldMetricsValues.rawPlayCount + this.metrics.getPlayCount()),
          mirrorLens: lensValues.mirrorLens,
          likeLens: lensValues.likeLens,
          bookmarkLens: lensValues.bookmarkLens,
          notInterestedLens: lensValues.notInterestedLens,
        };
      } else {
        if (this.userProfileId) {
          const { data } = await getLensValues(
            this.lensPubId,
            this.userProfileId,
          );

          lensValues = {
            mirrorLens: data?.publication?.mirrors?.length > 0 ? true : false,
            likeLens:
              data?.publication[0]?.reaction === "UPVOTE" ? true : false,
            bookmarkLens: data?.publication?.bookmarked,
            notInterestedLens: data?.publication?.notInterested,
          };
        }

        userMetrics = {
          rawTotalDuration: this.metrics.getTotalDuration(),
          rawPlayCount: this.metrics.getPlayCount(),
          rawPauseCount: this.metrics.getPauseCount(),
          rawSkipCount: this.metrics.getSkipCount(),
          rawClickCount: this.metrics.getClickCount(),
          rawImpressionCount: this.metrics.getImpressionCount(),
          rawBounceCount: this.metrics.getBounceCount(),
          rawBounceRate: this.metrics.getBounceRate(),
          rawVolumeChangeCount: this.metrics.getVolumeChangeCount(),
          rawFullScreenCount: this.metrics.getFullScreenCount(),
          rawPreferredTimeToWatch: this.metrics.getMostPreferredTimeToWatch(),
          rawMostViewedSegment: this.metrics.getMostViewedSegment(),
          rawInteractionRate: this.metrics.getInteractionRate(),
          rawBufferCount: this.metrics.getBufferCount(),
          rawBufferDuration: this.metrics.getBufferDuration(),
          rawEngagementRate: this.metrics.getEngagementRate(
            this.videoElement.duration,
          ),
          rawMostReplayedArea: this.metrics.getMostReplayedArea(),
          rawPlayPauseRatio: this.metrics.getPlayPauseRatio(),
          rawCtr: this.metrics.getCTR(),
          rawAvd: this.metrics.getAVD(),
          mirrorLens: lensValues.mirrorLens,
          likeLens: lensValues.likeLens,
          bookmarkLens: lensValues.bookmarkLens,
          notInterestedLens: lensValues.notInterestedLens,
        };
      }

      this.log(
        LogCategory.METRICS,
        `User metrics updated.`,
        JSON.stringify(userMetrics),
        new Date().toISOString(),
      );

      return userMetrics;
    } catch (err: any) {}
  };

  private sendMetricsOnChain = async (
    userMetrics: UserMetrics,
  ): Promise<void> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.currentUserPKP)
      throw new Error("Set user's PKP before continuing.");
    if (!this.kinoraMetricsAddress)
      throw new Error("Set Kinora Metrics Address before continuing.");
    try {
      let payload = JSON.stringify(userMetrics);
      if (this.encryptUserMetrics) {
        const { error, message, encryptedString } = await encryptMetrics(
          userMetrics,
          this.developerPKPData.ethAddress,
          this.currentUserPKP.ethAddress as `0x${string}`,
          this.userPKPAuthSig,
          this.litNodeClient,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `User encrypt metrics failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error encrypting user metrics: ${message}`);
          }
          return;
        } else {
          payload = encryptedString;
        }
      }

      const ipfsHash = (await this.ipfsClient.add(payload)).path;

      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraMetricsAbi,
        "addUserMetrics",
        [
          this.currentUserPKP.ethAddress,
          {
            playbackId: this.playbackId,
            metricJSON: ipfsHash,
            encrypted: this.encryptUserMetrics,
          },
        ],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on Add User Metrics.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on Add User Metrics: ${txMessage}`,
          );
        }

        return;
      }

      const {
        error: authSigError,
        message: authSigMessage,
        litAuthSig,
      } = await generateAuthSig(this.signer);

      if (authSigError) {
        this.log(
          LogCategory.ERROR,
          `Lit Auth Sig generation failed.`,
          authSigMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error generating Lit Auth Sig: ${authSigMessage}`);
        }
        return;
      }

      const litAction = getLitActionCodeForAddUserMetrics(
        this.currentUserPKP.ethAddress,
        this.kinoraMetricsAddress.address,
      );

      const outputString = bundleCodeManual(litAction);

      const litActionHash = (await this.ipfsClient.add(outputString)).path;

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "addUserMetrics",
        this.authSig ? this.authSig : litAuthSig,
        litActionHash,
        this.developerPKPData.publicKey,
        this.multihashDevKey,
        this.currentUserPKP.ethAddress,
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `User add Metrics on-chain failed on Broadcast.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error adding User Metrics and broadcasting: ${message}`,
          );
        }
        return;
      } else {
        this.metrics.reset();

        this.log(
          LogCategory.RESPONSE,
          `User Metrics added successfully. Lit Action Response.`,
          litResponse,
          new Date().toISOString(),
        );
        this.log(
          LogCategory.BROADCAST,
          `Broadcast on-chain.`,
          txHash,
          new Date().toISOString(),
        );
      }
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Send metrics on-chain failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error sending metrics on-chain: ${err.message}`);
      }
    }
  };

  private checkQuestMilestoneMetrics = async (
    questId: number,
    milestoneId?: number,
  ): Promise<boolean> => {
    try {
      let userEligible = false;

      let currentMetricsHash: string =
        await this.kinoraMetricsAddress.getUserMetricsJSONHashByPlaybackId(
          this.currentUserPKP.ethAddress,
          this.playbackId,
        );

      const currentMetricsToParse = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${currentMetricsHash}`,
      );

      let currentMetrics = await JSON.parse(currentMetricsToParse.data);

      if (
        await this.kinoraMetricsAddress.getUserEncryptedByPlaybackId(
          this.currentUserPKP.ethAddress,
          this.playbackId,
        )
      ) {
        const { error, message, decryptedString } = await decryptMetrics(
          await JSON.parse(currentMetrics),
          this.developerPKPData.ethAddress,
          this.currentUserPKP.ethAddress as `0x${string}`,
          this.userPKPAuthSig,
          this.litNodeClient,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `User decrypt collected metrics failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error decrypting user collected metrics: ${message}`,
            );
          }
          return;
        } else {
          currentMetrics = decryptedString;
        }
      }

      const currentUserMetrics: UserMetrics = await JSON.parse(currentMetrics);

      if (!milestoneId) {
        const questURI = await this.kinoraQuestAddress.getQuestURIDetails(
          questId,
        );

        const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

        const uriParsed: QuestURI = await JSON.parse(response.data);

        userEligible = this.metricComparison(
          currentUserMetrics,
          uriParsed.joinCondition,
        );
      } else {
        const milestoneUriDetails =
          await this.kinoraQuestAddress.getQuestMilestoneURIDetails(
            questId,
            milestoneId,
          );

        const uriParsed: MilestoneURI = await JSON.parse(milestoneUriDetails);

        userEligible = this.metricComparison(
          currentUserMetrics,
          uriParsed.completionCondition,
        );
      }

      return userEligible;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Check Quest metrics failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error checking Quest metrics: ${err.message}`);
      }
    }
  };

  private metricComparison = (
    userMetrics: UserMetrics,
    eligibilityCriteria: QuestEligibility,
  ): boolean => {
    for (const key in eligibilityCriteria) {
      const criteria = eligibilityCriteria[key as keyof QuestEligibility];

      if (!criteria) continue;

      const userValue = userMetrics[key as keyof UserMetrics];
      const conditions: boolean[] = [];

      if ("minValue" in criteria && "maxValue" in criteria) {
        if (typeof userValue === "number") {
          conditions.push(userValue >= criteria.minValue);
          conditions.push(userValue <= criteria.maxValue);
        }
      } else if ("boolValue" in criteria) {
        if (typeof userValue === "boolean") {
          conditions.push(userValue === criteria.boolValue);
        }
      }

      if (criteria.operator === "and") {
        if (!conditions.every(Boolean)) {
          return false;
        }
      } else if (criteria.operator === "or") {
        if (!conditions.some(Boolean)) {
          return false;
        }
      }
    }
    return true;
  };

  private log = (
    category: LogCategory,
    message: string,
    responseObject: string,
    isoDate: string,
  ) => {
    if (typeof responseObject === "object") {
      responseObject = JSON.stringify(responseObject);
    }

    this.logs[this.logIndex] = { category, message, responseObject, isoDate };
    this.logIndex = (this.logIndex + 1) % this.logSize;
    this.emit(
      "log",
      JSON.stringify({
        message,
        responseObject,
        isoDate,
      }),
    );
  };

  private cleanUpListeners = () => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.videoElement)
      throw new Error(
        "Video element not detected. Make sure to set your LivePeer Player component in your app.",
      );
    clearInterval(this.intervalId);

    this.videoElement.removeEventListener("play", this.metrics.onPlay);
    this.videoElement.removeEventListener("pause", this.metrics.onPause);
    this.videoElement.removeEventListener("timeupdate", this.timeUpdateHandler);
    this.videoElement.removeEventListener("click", this.metrics.onClick);
    this.videoElement.removeEventListener("seeking", this.metrics.onSkip);

    this.videoElement.removeEventListener(
      "volumechange",
      this.metrics.onVolumeChange,
    );
    document.removeEventListener(
      "fullscreenchange",
      this.fullScreenChangeHandler,
    );

    this.videoElement.removeEventListener(
      "waiting",
      this.metrics.onBufferStart,
    );

    this.videoElement.removeEventListener("playing", this.metrics.onBufferEnd);

    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
  };

  private timeUpdateHandler = (e: Event) => {
    const currentTime = (e.currentTarget as HTMLVideoElement).currentTime;
    this.metrics.onTimeUpdate(currentTime);
    if (currentTime < 10) {
      this.metrics.onBounce();
    }
  };

  private fullScreenChangeHandler = () => {
    if (document.fullscreenElement === this.videoElement) {
      this.metrics.onFullScreen();
    }
  };

  private beforeUnloadHandler = () => {
    this.cleanUpListeners();
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    this.collectAndSendMetrics();
  };
}
