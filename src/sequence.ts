import {
  ChainIds,
  LitAuthSig,
  LitProvider,
  LivepeerPlayer,
  Milestone,
  MilestoneURI,
  QuestURI,
  RewardType,
  Status,
  UserMetrics,
  QuestEligibility,
  ILogEntry,
  LogCategory,
  LivepeerHTMLElement,
} from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import axios from "axios";
import { ProviderType } from "@lit-protocol/constants";
import { ethers } from "ethers";
import { IPFSHTTPClient, create } from "ipfs-http-client";
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
} from "./constants";
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
  bundleCode,
} from "./utils/lit-protocol";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import getLensValues from "./apollo/queries/getLensValues";

export class Sequence<
  TPlaybackPolicyObject extends object,
  TSlice,
> extends EventEmitter {
  private livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
  private metrics: Metrics;
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
  private chain: string = "polygon";
  private multihashDevKey: string;
  private redirectURL: string;
  private lensPubId: string;
  private userProfileId: string;
  private developerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  private kinoraReward721Address: `0x${string}`;
  private encryptUserMetrics: boolean;
  private errorHandlingModeStrict: boolean = false;
  private metricsOnChainInterval: number = 60000;
  private kinoraPkpDBContract: ethers.Contract;
  private pkpContract: ethers.Contract;
  private pkpPermissionsContract: ethers.Contract;
  private kinoraQuestAddress: ethers.Contract;
  private kinoraMetricsAddress: ethers.Contract;
  private ipfsClient: IPFSHTTPClient;
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

  constructor(args: {
    livepeerPlayerComponentId: string;
    redirectURL: string;
    rpcURL: string;
    metricsOnChainInterval: number; // in minutes,
    encryptUserMetrics: boolean;
    errorHandlingModeStrict?: boolean;
    developerPKPPublicKey?: `0x04${string}`;
    developerPKPTokenId?: string;
    lensPubId?: string;
    userProfileId?: string;
    multihashDevKey?: string;
    signer?: ethers.Signer;
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
    this.livepeerPlayer = document.getElementById(
      args.livepeerPlayerComponentId,
    ) as unknown as LivepeerHTMLElement<TPlaybackPolicyObject, TSlice>;
    this.redirectURL = args.redirectURL;
    this.rpcURL = args.rpcURL;
    this.developerPKPData = {
      publicKey: args.developerPKPPublicKey,
      tokenId: args.developerPKPTokenId,
      ethAddress: ethers.utils.computeAddress(
        args.developerPKPPublicKey,
      ) as `0x${string}`,
    };
    this.multihashDevKey = args.multihashDevKey;
    this.encryptUserMetrics = args.encryptUserMetrics;
    if (args.userProfileId) this.userProfileId = args.userProfileId;
    if (args.lensPubId) this.lensPubId = args.lensPubId;
    this.signer = args.signer ? args.signer : ethers.Wallet.createRandom();
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

    if (typeof window !== "undefined") {
      setInterval(
        this.sendMetricsOnChain,
        this.metricsOnChainInterval * 60 * 1000,
      );
      window.addEventListener("beforeunload", this.sendMetricsOnChain);
    } else {
      setInterval(
        this.sendMetricsOnChain,
        this.metricsOnChainInterval * 60 * 1000,
      );
      process.on("exit", this.sendMetricsOnChain);
      process.on("SIGINT", this.sendMetricsOnChain);
    }
  }

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
      this.polygonProvider,
    );

    const txHash = await factoryContract.deployFromKinoraFactory(
      this.developerPKPData.ethAddress,
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
      this.kinoraReward721Address = filteredLogs[0].args[5];

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
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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

        const {
          error,
          message,
          txHash: assignTx,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          newJoinHash,
        );

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

          const {
            error,
            message,
            txHash: assignTx,
          } = await assignLitAction(
            this.pkpPermissionsContract,
            this.developerPKPData.tokenId,
            newMilestoneHash,
          );
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

  authenticateUserRedirect = async (): Promise<void> => {
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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
      const { error, message, outputBuffer } = await bundleCode(litAction);
      if (error) {
        return;
      }
      const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;

      await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(litActionHash),
      );
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

  bindEvents = (): void => {
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
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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
      const {
        error: outputBufferError,
        message: outputBufferMessage,
        outputBuffer,
      } = await bundleCode(litAction);
      if (outputBufferError) {
        return;
      }
      const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;

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
        const {
          error: outputBufferError,
          message: outputBufferMessage,
          outputBuffer,
        } = await bundleCode(litAction);
        if (outputBufferError) {
          return;
        }
        const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;
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
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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

        const {
          error: outputBufferError,
          message: outputBufferMessage,
          outputBuffer,
        } = await bundleCode(litAction);
        if (outputBufferError) {
          return;
        }
        const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;
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
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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

      const {
        error: outputBufferError,
        message: outputBufferMessage,
        outputBuffer,
      } = await bundleCode(litAction);
      if (outputBufferError) {
        return;
      }
      const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;

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
          `Assign Join Quest Lit Action failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error assigning Join Quest Lit Action: ${message}`);
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

        const {
          error: outputBufferError,
          message: outputBufferMessage,
          outputBuffer,
        } = await bundleCode(litAction);
        if (outputBufferError) {
          return;
        }
        const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;

        const {
          error,
          message,
          txHash: addMilestoneTx,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

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

        const {
          error: assignError,
          message: assignMessage,
          txHash,
        } = await assignLitAction(
          this.pkpPermissionsContract,
          this.developerPKPData.tokenId,
          getBytesFromMultihash(litActionHash),
        );

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
    newERC721TokenIds: number[];
    newRewardType: RewardType;
    newTokenAddress: `0x${string}`;
    newNumberOfPoints: number;
    newERC20Amount: number;
  }): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestAddress)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.ipfsClient)
      throw new Error("Provide IPFS Auth before continuing.");
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

      const {
        error: outputBufferError,
        message: outputBufferMessage,
        outputBuffer,
      } = await bundleCode(litAction);
      if (outputBufferError) {
        return;
      }
      const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;
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

      const {
        error: assignError,
        message: assignMessage,
        txHash: assignTx,
      } = await assignLitAction(
        this.pkpPermissionsContract,
        this.developerPKPData.tokenId,
        getBytesFromMultihash(litActionHash),
      );

      const txHash = await this.kinoraQuestAddress.updateMilestoneDetails(
        milestoneDetails.newERC721TokenIds,
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

      const completedMilestonesPerQuest =
        await this.kinoraQuestAddress.getUserMilestonesCompletedPerQuest(
          this.currentUserPKP.ethAddress,
        );

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
          milestonesCompleted: completedMilestonesPerQuest[i],
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

  private sendMetricsOnChain = async (): Promise<void> => {
    if (!this.developerPKPData.publicKey)
      throw new Error("Set developer PKP Public Key before continuing.");
    if (!this.developerPKPData.tokenId)
      throw new Error("Set developer PKP Token Id before continuing.");
    if (!this.currentUserPKP)
      throw new Error("Set user's PKP before continuing.");
    if (!this.kinoraMetricsAddress)
      throw new Error("Set Kinora Metrics Address before continuing.");
    try {
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
            this.metrics.getNumberOfUpdates() +
            oldMetricsValues.numberOfUpdates,
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
          mirrorLens: lensValues.mirrorLens,
          likeLens: lensValues.likeLens,
          bookmarkLens: lensValues.bookmarkLens,
          notInterestedLens: lensValues.notInterestedLens,
        };
      }

      let payload: string = JSON.stringify(userMetrics);

      this.log(
        LogCategory.METRICS,
        `User metrics updated.`,
        payload,
        new Date().toISOString(),
      );

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
            playbackId: this.livepeerPlayer.props.playbackId,
            metricJSON: payload,
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

      const {
        error: outputBufferError,
        message: outputBufferMessage,
        outputBuffer,
      } = await bundleCode(litAction);
      if (outputBufferError) {
        return;
      }
      const litActionHash = (await this.ipfsClient.add(outputBuffer)).path;

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

      let currentMetrics: string =
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
}
