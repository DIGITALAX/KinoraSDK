import {
  ChainIds,
  LitAuthSig,
  Milestone,
  PlayerMetrics,
  QuestEligibility,
  ILogEntry,
  LogCategory,
} from "./@types/kinora-sdk";
import { v4 as uuidv4 } from "uuid";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import axios from "axios";
import { ethers } from "ethers";
import { create, IPFSHTTPClient } from "ipfs-http-client";
import {
  KINORA_OPEN_ACTION_CONTRACT,
  KINORA_FACTORY_CONTRACT,
  LIT_RPC,
  CHRONICLE_PKP_CONTRACT,
  CHRONICLE_PKP_PERMISSIONS_CONTRACT,
  INFURA_GATEWAY,
  CHAIN,
  KINORA_QUEST_DATA_CONTRACT,
} from "./constants";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import PKPNFTAbi from "./abis/PKPNFT.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import PKPPermissionsAbi from "./abis/PKPPermissions.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
  generateAuthSig,
  encryptMetrics,
  decryptMetrics,
  assignLitAction,
  getLitActionCodeForAddPlayerMetrics,
  removeLitAction,
  hashHex,
  bundleCodeManual,
  mintNextPKP,
  generateSecureRandomKey,
} from "./utils/lit-protocol";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import getLensValues from "./apollo/queries/getLensValues";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import onChainPost from "./apollo/mutations/onChainPost";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { ImageMetadataV3 } from "./@types/generated";

export class Sequence extends EventEmitter {
  private metrics: Metrics;
  private videoElement: HTMLVideoElement;
  private polygonProvider: JsonRpcProvider;
  private chronicleProvider: JsonRpcProvider;
  private logSize = 1000;
  private logIndex = 0;
  private logs: ILogEntry[] = new Array(this.logSize);
  private rpcURL: string;
  private parentId: string;
  private chain: string = CHAIN;
  private multihashDevKey: string;
  private ipfsClient: IPFSHTTPClient;
  private lensPubId: string;
  private playerProfileId: string;
  private questInvokerProfileId: string;
  private playbackId: string;
  private questInvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  private encryptPlayerMetrics: boolean;
  private errorHandlingModeStrict: boolean = false;
  private metricsOnChainInterval: number = 60000;
  private intervalId: NodeJS.Timeout;
  private pkpContract: ethers.Contract;
  private pkpPermissionsContract: ethers.Contract;
  private kinoraQuestContract: ethers.Contract;
  private kinoraMetricsContract: ethers.Contract;
  private kinoraQuestDataContract: ethers.Contract;
  private kinoraEscrowContract: ethers.Contract;
  private signer: ethers.Signer;
  private authSig: LitAuthSig;
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  private questInvokerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  private litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: "cayenne",
    debug: false,
    alertWhenUnauthorized: true,
  });

  constructor(args: {
    questInvokerProfileId: string;
    playbackId?: string;
    parentId?: string;
    redirectURL?: string;
    rpcURL?: string;
    metricsOnChainInterval?: number; // in minutes,
    encryptPlayerMetrics?: boolean;
    errorHandlingModeStrict?: boolean;
    questInvokerPKPPublicKey?: `0x04${string}`;
    questInvokerPKPTokenId?: string;
    lensPubId?: string;
    playerProfileId?: string;
    multihashDevKey?: string;
    signer?: ethers.Signer; // chronicle signer
    kinoraMetricsContract?: `0x${string}`;
    kinoraQuestContract?: `0x${string}`;
    kinoraEscrowContract?: `0x${string}`;
    ipfsAuth?: {
      projectId: string;
      projectSecret: string;
    };
    playerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
    questInvokerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
  }) {
    super();
    this.questInvokerProfileId = args.questInvokerProfileId;
    this.errorHandlingModeStrict = args.errorHandlingModeStrict || false;
    this.metricsOnChainInterval = args.metricsOnChainInterval;
    this.playbackId = args.playbackId;
    this.rpcURL = args.rpcURL;
    if (args.questInvokerPKPPublicKey)
      this.questInvokerPKPData = {
        publicKey: args.questInvokerPKPPublicKey,
        tokenId: args.questInvokerPKPTokenId,
        ethAddress: ethers.utils.computeAddress(
          args.questInvokerPKPPublicKey,
        ) as `0x${string}`,
      };
    this.multihashDevKey = args.multihashDevKey;
    this.encryptPlayerMetrics = args.encryptPlayerMetrics;
    this.parentId = args.parentId;
    if (args.playerProfileId) this.playerProfileId = args.playerProfileId;
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

    if (args.kinoraMetricsContract)
      this.kinoraMetricsContract = new ethers.Contract(
        args.kinoraMetricsContract,
        KinoraMetricsAbi,
      );
    if (args.kinoraQuestContract) {
      this.kinoraQuestContract = new ethers.Contract(
        args.kinoraQuestContract,
        KinoraQuestAbi,
      );
    }
    if (args.kinoraEscrowContract) {
      this.kinoraEscrowContract = new ethers.Contract(
        args.kinoraEscrowContract,
        KinoraEscrowAbi,
      );
    }
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
    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
      this.signer,
    );
    this.playerAuthedApolloClient = args.playerAuthedApolloClient || undefined;
    this.questInvokerAuthedApolloClient =
      args.questInvokerAuthedApolloClient || undefined;
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

  assignIPFSLitAction = async (
    litActionHash: string,
  ): Promise<{
    error: boolean;
    errorMessage: string;
    txHash: string;
  }> => {
    const { error, message, txHash } = await assignLitAction(
      this.pkpPermissionsContract,
      this.questInvokerPKPData.tokenId,
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
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.kinoraMetricsContract)
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

  createQuestCompatibleURI = (args: {
    questTitle: string;
    questDescription: string;
    questMilestonesDetails: string[];
    questCoverImage: string;
  }): ImageMetadataV3 => {
    const formattedText: string = `
  ${args.questTitle}
  \n\n
  ${args.questDescription}
  \n\n
  ${args.questMilestonesDetails
    .map((milestone, index) => {
      return `Milestone ${index + 1}
    ${milestone}`;
    })
    .join("\n\n")}
  `;

    const image = {
      raw: {
        uri: "ipfs://" + args.questCoverImage,
      },
    };

    const data: ImageMetadataV3 = {
      __typename: "ImageMetadataV3",
      id: uuidv4(),
      hideFromFeed: false,
      locale: "en",
      tags: ["kinora", "kinora quest", "quest"],
      appId: "kinora",
      attachments: [
        {
          image,
          altTag: args.questTitle,
        },
      ],
      content: formattedText,
      title: args.questTitle,
      marketplace: {
        description: formattedText,
        externalURL: "kinora.irrevocable.dev",
        image,
        name: args.questTitle,
      },
      asset: {
        image,
        altTag: args.questTitle,
      },
      rawURI: "",
    };

    return data;
  };

  instantiateNewQuest = async (questInputs: {
    ipfsQuestDetails: string;
    maxPlayerCount: number;
    milestones: Milestone[];
  }): Promise<{
    kinoraAccessControl: `0x${string}`;
    kinoraMetrics: `0x${string}`;
    kinoraQuest: `0x${string}`;
    kinoraEscrow: `0x${string}`;
    pubId: string;
    multiHashDevKey: string;
  }> => {
    if (!this.multihashDevKey) {
      this.multihashDevKey = generateSecureRandomKey();
    }
    if (!this.questInvokerPKPData.ethAddress) {
      const { pkpTokenId, publicKey, error, message } = await mintNextPKP(
        this.pkpContract,
      );
      this.questInvokerPKPData = {
        publicKey: publicKey,
        tokenId: pkpTokenId,
        ethAddress: ethers.utils.computeAddress(publicKey) as `0x${string}`,
      };
      if (error) {
        this.log(
          LogCategory.ERROR,
          `Mint questInvoker PKP failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error minting questInvoker PKP: ${message}`);
        }
        return;
      }
    }

    const joinHash = hashHex(
      questInputs.ipfsQuestDetails + this.multihashDevKey,
    );

    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(address questInvokerPKP, bytes32 joinHash, uint256 maxPlayerCount)",
          "tuple(Reward reward, bytes32 completionHash, uint256 numberOfPoints, uint256 milestone)[]",
        ],
        [
          {
            questInvokerPKP: this.questInvokerPKPData.ethAddress,
            questInvoker: await this.signer.getAddress(),
            joinHash: joinHash,
            maxPlayerCount: questInputs.maxPlayerCount,
          },
          questInputs.milestones,
        ],
      );

      const { data } = await onChainPost({
        contentURI: "ipfs://" + questInputs.ipfsQuestDetails,
        openActionModules: [
          {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: encodedData,
            },
          },
        ],
      });

      const factoryContract = new ethers.Contract(
        KINORA_FACTORY_CONTRACT,
        KinoraFactoryAbi,
        this.signer,
      );

      const kinoraMetrics = await factoryContract.getPKPToDeployedKinoraMetrics(
        this.questInvokerPKPData.ethAddress,
      );
      const kinoraQuest = await factoryContract.getPKPToDeployedKinoraQuest(
        this.questInvokerPKPData.ethAddress,
      );
      const kinoraEscrow = await factoryContract.getPKPToDeployedKinoraEscrow(
        this.questInvokerPKPData.ethAddress,
      );

      this.kinoraQuestContract = new ethers.Contract(
        kinoraQuest,
        KinoraQuestAbi,
        this.signer,
      );
      this.kinoraMetricsContract = new ethers.Contract(
        kinoraMetrics,
        KinoraMetricsAbi,
        this.signer,
      );
      this.kinoraEscrowContract = new ethers.Contract(
        kinoraEscrow,
        KinoraEscrowAbi,
        this.signer,
      );

      return {
        kinoraAccessControl:
          await factoryContract.getPKPToDeployedKinoraAccessControl(
            this.questInvokerPKPData.ethAddress,
          ),
        kinoraMetrics,
        kinoraQuest,
        kinoraEscrow,
        pubId: data.createOnchainPostTypedData.id,
        multiHashDevKey: this.multihashDevKey,
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

  terminateQuestAndWithdraw = async (
    pubId: number,
    toAddress: `0s${string}`,
  ): Promise<{ txHash: string; withdrawTxes: string[] }> => {
    if (!this.kinoraQuestContract)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.kinoraEscrowContract)
      throw new Error("Set Kinora Escrow Address before continuing.");
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    try {
      const txHash = await this.kinoraQuestContract.terminateQuest(pubId);

      const milestoneCount =
        this.kinoraQuestDataContract.getQuestMilestoneCount(
          this.questInvokerProfileId,
          pubId,
        );

      const withdrawTxes: string[] = [];

      for (let i = 1; i <= milestoneCount; i++) {
        const withdrawTx = this.kinoraEscrowContract.emergencyWithdrawERC20(
          toAddress,
          pubId,
          i,
        );
        withdrawTxes.push(withdrawTx);
      }

      return {
        txHash,
        withdrawTxes,
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

  playerCompleteQuestMilestone = async (
    questId: number,
    milestoneId: number,
    completeMilestoneIPFSCid: string,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestContract.address)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");

    const completeCondition = await this.checkQuestMilestoneMetrics(
      questId,
      milestoneId,
    );

    if (!completeCondition) {
      this.log(
        LogCategory.ERROR,
        `Player failed to meet Quest Join Condition.`,
        "Error authenticating player for Quest",
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating player for Quest.`);
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
        "playerCompleteMilestone",
        [questId, milestoneId, this.playerProfileId],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on Player Complete Milestone.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on Player Complete Milestone: ${txMessage}`,
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
        await this.kinoraQuestContract.getQuestMilestoneURIDetails(
          questId,
          milestoneId,
        );

      const response = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${milestoneURI}`,
      );

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "playerCompleteMilestone",
        this.authSig ? this.authSig : litAuthSig,
        completeMilestoneIPFSCid,
        this.questInvokerPKPData.publicKey,
        this.multihashDevKey,
        JSON.stringify(completeCondition),
      );

      if (error) {
        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player Complete Milestone failed on Broadcast.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error completing Player Milestone and broadcasting: ${message}`,
            );
          }
        }
        return;
      } else {
        this.log(
          LogCategory.RESPONSE,
          `Player Completed Milestone successfully. Lit Action Response.`,
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
        `Player completing milestone failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error completing player Milestone: ${err.message}`);
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
    if (!this.playerProfileId)
      throw new Error("Set player's Profile Id before continuing.");
    if (!this.kinoraQuestContract)
      throw new Error("Set Kinora Quest Address before continuing.");
    try {
      const questsJoined = this.kinoraQuestContract.getPlayerQuestsJoined(
        this.currentPlayerPKP.ethAddress,
      );

      let questHistory: {
        questId: number;
        questURIDetails: QuestURI;
        questMilestoneDetails: MilestoneURI;
        milestonesCompleted: number[];
      }[] = [];

      for (let i = 0; i < questsJoined.length; i++) {
        const questURI = await this.kinoraQuestContract.getQuestURIDetails(
          questsJoined[i],
        );

        const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

        const getQuestMilestoneURIDetails =
          await this.kinoraQuestContract.getQuestMilestoneURIDetails();

        questHistory.push({
          questId: questsJoined[i],
          questURIDetails: await JSON.parse(response.data),
          questMilestoneDetails: await JSON.parse(getQuestMilestoneURIDetails),
          milestonesCompleted:
            await this.kinoraQuestContract.getPlayerMilestonesCompletedPerQuest(
              this.currentPlayerPKP.ethAddress,
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
      const playerMetrics = await this.collectMetrics();
      await this.sendMetricsOnChain(playerMetrics);
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

  private collectMetrics = async (): Promise<PlayerMetrics> => {
    let playerMetrics: PlayerMetrics;

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
        await this.kinoraMetricsContract.getPlayerPlaybackIdByPlaybackId(
          this.currentPlayerPKP.ethAddress,
          this.playbackId,
        )
      ) {
        let oldMetricsHash: string =
          await this.kinoraMetricsContract.getPlayerMetricsJSONHashByPlaybackId(
            this.currentPlayerPKP.ethAddress,
            this.playbackId,
          );

        const oldMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${oldMetricsHash}`,
        );

        let oldMetrics = await JSON.parse(oldMetricsToParse.data);

        if (
          await this.kinoraMetricsContract.getPlayerEncryptedByPlaybackId(
            this.currentPlayerPKP.ethAddress,
            this.playbackId,
          )
        ) {
          const {
            error: decryptError,
            message,
            decryptedString,
          } = await decryptMetrics(
            await JSON.parse(oldMetrics),
            this.questInvokerPKPData.ethAddress,
            this.currentPlayerPKP.ethAddress as `0x${string}`,
            this.playerPKPAuthSig,
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
                `Error decrypting player collected metrics: ${message}`,
              );
            }
            return;
          } else {
            oldMetrics = decryptedString;
          }
        }

        const oldMetricsValues: PlayerMetrics = await JSON.parse(oldMetrics);

        if (this.playerProfileId) {
          const { data } = await getLensValues(
            {
              publicationId: this.lensPubId,
            },
            this.playerProfileId,
          );

          lensValues = {
            mirrorLens: data?.publication?.mirrors?.length > 0 ? true : false,
            likeLens:
              data?.publication[0]?.reaction === "UPVOTE" ? true : false,
            bookmarkLens: data?.publication?.bookmarked,
            notInterestedLens: data?.publication?.notInterested,
          };
        }

        playerMetrics = {
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
        if (this.playerProfileId) {
          const { data } = await getLensValues(
            {
              publicationId: this.lensPubId,
            },
            this.playerProfileId,
          );

          lensValues = {
            mirrorLens: data?.publication?.mirrors?.length > 0 ? true : false,
            likeLens:
              data?.publication[0]?.reaction === "UPVOTE" ? true : false,
            bookmarkLens: data?.publication?.bookmarked,
            notInterestedLens: data?.publication?.notInterested,
          };
        }

        playerMetrics = {
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
        `Player metrics updated.`,
        JSON.stringify(playerMetrics),
        new Date().toISOString(),
      );

      return playerMetrics;
    } catch (err: any) {}
  };

  private sendMetricsOnChain = async (
    playerMetrics: PlayerMetrics,
  ): Promise<void> => {
    if (typeof window !== "undefined")
      throw new Error(
        "This function can only be run in a Node.js environment.",
      );
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.currentPlayerPKP)
      throw new Error("Set player's PKP before continuing.");
    if (!this.kinoraMetricsContract)
      throw new Error("Set Kinora Metrics Address before continuing.");
    try {
      let payload = JSON.stringify(playerMetrics);
      if (this.encryptPlayerMetrics) {
        const { error, message, encryptedString } = await encryptMetrics(
          playerMetrics,
          this.questInvokerPKPData.ethAddress,
          this.currentPlayerPKP.ethAddress as `0x${string}`,
          this.playerPKPAuthSig,
          this.litNodeClient,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player encrypt metrics failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error encrypting player metrics: ${message}`);
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
        "addPlayerMetrics",
        [
          this.currentPlayerPKP.ethAddress,
          {
            playbackId: this.playbackId,
            metricJSON: ipfsHash,
            encrypted: this.encryptPlayerMetrics,
          },
        ],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on Add Player Metrics.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on Add Player Metrics: ${txMessage}`,
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

      const litAction = getLitActionCodeForAddPlayerMetrics(
        this.currentPlayerPKP.ethAddress,
        this.kinoraMetricsContract.address,
      );

      const outputString = bundleCodeManual(litAction);

      const litActionHash = (await this.ipfsClient.add(outputString)).path;

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "addPlayerMetrics",
        this.authSig ? this.authSig : litAuthSig,
        litActionHash,
        this.questInvokerPKPData.publicKey,
        this.multihashDevKey,
        this.currentPlayerPKP.ethAddress,
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Player add Metrics on-chain failed on Broadcast.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error adding Player Metrics and broadcasting: ${message}`,
          );
        }
        return;
      } else {
        this.metrics.reset();

        this.log(
          LogCategory.RESPONSE,
          `Player Metrics added successfully. Lit Action Response.`,
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
      let playerElegible = false;

      let currentMetricsHash: string =
        await this.kinoraMetricsContract.getPlayerMetricsJSONHashByPlaybackId(
          this.currentPlayerPKP.ethAddress,
          this.playbackId,
        );

      const currentMetricsToParse = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${currentMetricsHash}`,
      );

      let currentMetrics = await JSON.parse(currentMetricsToParse.data);

      if (
        await this.kinoraMetricsContract.getPlayerEncryptedByPlaybackId(
          this.currentPlayerPKP.ethAddress,
          this.playbackId,
        )
      ) {
        const { error, message, decryptedString } = await decryptMetrics(
          await JSON.parse(currentMetrics),
          this.questInvokerPKPData.ethAddress,
          this.currentPlayerPKP.ethAddress as `0x${string}`,
          this.playerPKPAuthSig,
          this.litNodeClient,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player decrypt collected metrics failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error decrypting player collected metrics: ${message}`,
            );
          }
          return;
        } else {
          currentMetrics = decryptedString;
        }
      }

      const currentPlayerMetrics: PlayerMetrics = await JSON.parse(
        currentMetrics,
      );

      if (!milestoneId) {
        const questURI = await this.kinoraQuestContract.getQuestURIDetails(
          questId,
        );

        const response = await axios.get(`${INFURA_GATEWAY}/ipfs/${questURI}`);

        const uriParsed: QuestURI = await JSON.parse(response.data);

        playerElegible = this.metricComparison(
          currentPlayerMetrics,
          uriParsed.joinCondition,
        );
      } else {
        const milestoneUriDetails =
          await this.kinoraQuestContract.getQuestMilestoneURIDetails(
            questId,
            milestoneId,
          );

        const uriParsed: MilestoneURI = await JSON.parse(milestoneUriDetails);

        playerElegible = this.metricComparison(
          currentPlayerMetrics,
          uriParsed.completionCondition,
        );
      }

      return playerElegible;
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
    playerMetrics: PlayerMetrics,
    eligibilityCriteria: QuestEligibility,
  ): boolean => {
    for (const key in eligibilityCriteria) {
      const criteria = eligibilityCriteria[key as keyof QuestEligibility];

      if (!criteria) continue;

      const playerValue = playerMetrics[key as keyof PlayerMetrics];
      const conditions: boolean[] = [];

      if ("minValue" in criteria && "maxValue" in criteria) {
        if (typeof playerValue === "number") {
          conditions.push(playerValue >= criteria.minValue);
          conditions.push(playerValue <= criteria.maxValue);
        }
      } else if ("boolValue" in criteria) {
        if (typeof playerValue === "boolean") {
          conditions.push(playerValue === criteria.boolValue);
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
