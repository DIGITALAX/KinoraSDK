import {
  ChainIds,
  LitAuthSig,
  Milestone,
  PlayerMetrics,
  MilestoneEligibility,
  ILogEntry,
  LogCategory,
  LensStats,
} from "./@types/kinora-sdk";
import { v4 as uuidv4 } from "uuid";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import axios from "axios";
import { ethers } from "ethers";
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
import PKPPermissionsAbi from "./abis/PKPPermissions.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
  generateAuthSig,
  encryptMetrics,
  decryptMetrics,
  assignLitAction,
  removeLitAction,
  hashHex,
  bundleCodeManual,
  mintNextPKP,
  generateSecureRandomKey,
  getLitActionCode,
} from "./utils/lit-protocol";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import onChainPost from "./graphql/mutations/onChainPost";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  ActOnOpenActionMutation,
  ImageMetadataV3,
  Post,
} from "./@types/generated";
import actOnGrant from "./graphql/mutations/actOn";
import getPublication from "./graphql/queries/getPublication";

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
  private questInvokerProfileId: number;
  private questInvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  private errorHandlingModeStrict: boolean = false;
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
    authSig: LitAuthSig;
    parentId?: string;
    redirectURL?: string;
    rpcURL?: string;
    errorHandlingModeStrict?: boolean;
    questInvokerPKPPublicKey?: `0x04${string}`;
    questInvokerPKPTokenId?: string;
    multihashDevKey?: string;
    signer?: ethers.Signer; // chronicle signer
    kinoraMetricsContract?: `0x${string}`;
    kinoraQuestContract?: `0x${string}`;
    kinoraEscrowContract?: `0x${string}`;
    playerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
    questInvokerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
  }) {
    super();
    this.questInvokerProfileId = parseInt(args.questInvokerProfileId, 16);
    this.authSig = args.authSig;
    this.errorHandlingModeStrict = args.errorHandlingModeStrict || false;
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
    this.parentId = args.parentId;
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

      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
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
    litActionCodesToHash: string[];
  }> => {
    if (!this.questInvokerAuthedApolloClient) {
      throw new Error(
        `Set Quest Invoker Authed Apollo Client before Continuing.`,
      );
    }
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

    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(address questInvokerPKP, address questInvoker, uint256 maxPlayerCount)",
          "tuple(Reward reward, string completionConditionHash, bytes32 conditionHash, uint256 numberOfPoints, uint256 milestone)[]",
        ],
        [
          {
            questInvokerPKP: this.questInvokerPKPData.ethAddress,
            questInvoker: await this.signer.getAddress(),
            maxPlayerCount: questInputs.maxPlayerCount,
          },
          questInputs.milestones.map((milestone: Milestone) => {
            return {
              reward: milestone.reward,
              completionConditionHash: milestone.eligibilityHash,
              conditionHash: hashHex(
                milestone.eligibilityHash + this.multihashDevKey,
              ),
              numberOfPoints: milestone.numberOfPoints,
              milestone: milestone.milestone,
            };
          }),
        ],
      );

      const { data } = await onChainPost(
        {
          contentURI: "ipfs://" + questInputs.ipfsQuestDetails,
          openActionModules: [
            {
              unknownOpenAction: {
                address: KINORA_OPEN_ACTION_CONTRACT,
                data: encodedData,
              },
            },
          ],
        },
        this.questInvokerAuthedApolloClient,
      );

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

      let litActionCodesToHash = [];

      for (let i = 0; i <= questInputs.milestones.length; i++) {
        if (i < questInputs.milestones.length) {
          const code = getLitActionCode(
            hashHex(
              this.multihashDevKey +
                JSON.stringify(questInputs.milestones[i].eligibilityHash),
            ),
            kinoraMetrics,
          );

          litActionCodesToHash.push(bundleCodeManual(code));
        } else {
          const code = getLitActionCode(
            hashHex(
              this.multihashDevKey +
                hashHex(this.questInvokerProfileId.toString()),
            ),
            kinoraMetrics,
          );

          litActionCodesToHash.push(bundleCodeManual(code));
        }
      }

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
        litActionCodesToHash,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Instantiate New Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(
          `Error minting Instantiating New Quest: ${err.message}`,
        );
      }
    }
  };

  assignQuestActionsToPKP = async (
    litActionCodeHashes: string[],
  ): Promise<{
    assignLitActionsTxes: string[];
  }> => {
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");

    try {
      let assignLitActionsTxes: string[] = [];

      for (let i = 0; i < litActionCodeHashes.length; i++) {
        const { error, message, txHash } = await assignLitAction(
          this.pkpPermissionsContract,
          this.questInvokerPKPData.tokenId,
          getBytesFromMultihash(litActionCodeHashes[i]),
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Assign Quest Action To PKP failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error assigning Quest Actions to PKP: ${message}`);
          }
        }

        assignLitActionsTxes.push(txHash);
      }

      return {
        assignLitActionsTxes,
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
    pubId: string,
    toAddress: `0s${string}`,
    milestoneLitActionCodeHashes: string[],
    metricsLitActionCodeHash: string,
  ): Promise<{ txHash: string; withdrawTxes: string[] }> => {
    if (!this.kinoraQuestContract)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.kinoraEscrowContract)
      throw new Error("Set Kinora Escrow Address before continuing.");
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    try {
      const txHash = await this.kinoraQuestContract.terminateQuest(
        parseInt(pubId, 16),
      );

      const milestoneCount =
        this.kinoraQuestDataContract.getQuestMilestoneCount(
          this.questInvokerProfileId,
          parseInt(pubId, 16),
        );

      const withdrawTxes: string[] = [];

      for (let i = 1; i <= milestoneCount; i++) {
        const withdrawTx = this.kinoraEscrowContract.emergencyWithdrawERC20(
          toAddress,
          parseInt(pubId, 16),
          i,
        );
        withdrawTxes.push(withdrawTx);

        removeLitAction(
          this.pkpPermissionsContract,
          this.questInvokerPKPData.tokenId,
          getBytesFromMultihash(milestoneLitActionCodeHashes[i - 1]),
        );
      }

      removeLitAction(
        this.pkpPermissionsContract,
        this.questInvokerPKPData.tokenId,
        getBytesFromMultihash(metricsLitActionCodeHash),
      );

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

  playerJoinQuest = async (
    pubId: string,
  ): Promise<{
    data: ActOnOpenActionMutation;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }
    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [this.questInvokerPKPData.ethAddress, 0],
      );

      const { data } = await actOnGrant(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: encodedData,
            },
          },
          for: pubId,
        },
        this.playerAuthedApolloClient,
      );

      return {
        data: data,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Player Join Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error Player joining new Quest: ${err.message}`);
      }
    }
  };

  playerCompleteQuestMilestone = async (
    pubId: string,
    milestone: number,
  ): Promise<{ data: ActOnOpenActionMutation }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }

    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [this.questInvokerPKPData.ethAddress, milestone],
      );

      const { data } = await actOnGrant(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: encodedData,
            },
          },
          for: pubId,
        },
        this.playerAuthedApolloClient,
      );

      return {
        data: data,
      };
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

  getPlayerMetrics = async (
    playbackId: string,
    pubId: string,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    encrypt: boolean,
  ): Promise<string> => {
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
      const playerMetrics = await this.collectMetrics(
        playbackId,
        pubId,
        playerProfileId,
        playerProfileOwnerAddress,
      );
      let metrics = JSON.stringify(playerMetrics);
      if (encrypt) {
        const { error, message, encryptedString } = await encryptMetrics(
          metrics,
          this.questInvokerPKPData.ethAddress,
          playerProfileOwnerAddress,
          this.authSig,
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
          metrics = encryptedString;
        }
      }

      return metrics;
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

  sendMetricsOnChain = async (
    playbackId: string,
    playerProfileId: string,
    playerMetricsHash: string,
    litActionHash: string,
    pubId: string,
    metricsEncrypted: boolean,
  ): Promise<void> => {
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.kinoraMetricsContract)
      throw new Error("Set Kinora Metrics Address before continuing.");
    try {
      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraMetricsAbi,
        "addPlayerMetrics",
        [
          playbackId,
          playerMetricsHash,
          playerProfileId,
          pubId,
          metricsEncrypted,
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

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "addPlayerMetrics",
        this.authSig ? this.authSig : litAuthSig,
        litActionHash,
        this.questInvokerPKPData.publicKey,
        this.multihashDevKey,
        hashHex(this.questInvokerProfileId.toString()),
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

  verifyPlayerMilestoneComplete = async (
    playbackId: string,
    playerProfileId: string,
    pubId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
    litActionMilestoneHash: string,
  ): Promise<{
    checkResult: boolean;
  }> => {
    try {
      const passed = await this.checkQuestMilestoneMetrics(
        playbackId,
        playerProfileId,
        pubId,
        playerProfileOwnerAddress,
        milestone,
      );

      if (passed) {
        const {
          error: txError,
          message: txMessage,
          generatedTxData,
        } = await createTxData(
          this.polygonProvider,
          KinoraMetricsAbi,
          "playerElegibleToClaimMilestone",
          [parseInt(pubId, 16), milestone, parseInt(playerProfileId, 16), true],
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

        const hashKeyItem =
          await this.kinoraQuestDataContract.getQuestMilestoneCompletionConditionHash(
            this.questInvokerProfileId,
            parseInt(pubId, 16),
            milestone,
          );

        const { txHash, error, message, litResponse } = await litExecute(
          this.polygonProvider,
          this.litNodeClient,
          generatedTxData,
          "playerElegibleToClaimMilestone",
          this.authSig ? this.authSig : litAuthSig,
          litActionMilestoneHash,
          this.questInvokerPKPData.publicKey,
          this.multihashDevKey,
          hashKeyItem, // GENERAL HASH!!,
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
        }

        return {
          checkResult: true,
        };
      } else {
        return {
          checkResult: false,
        };
      }
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Verify Player Milestone Complete failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(
          `Error verifying Player milestone complete: ${err.message}`,
        );
      }
    }
  };

  private collectMetrics = async (
    playbackId: string,
    pubId: string,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
  ): Promise<PlayerMetrics> => {
    let playerMetrics: PlayerMetrics;
    try {
      const existingMetrics =
        await this.kinoraMetricsContract.getPlayerPlaybackIdMetricsHash(
          playbackId,
          playerProfileId,
          this.questInvokerProfileId,
          pubId,
        );

      const { data } = await getPublication(
        {
          forId: pubId,
        },
        this.playerAuthedApolloClient,
      );

      const lensStats: LensStats = (data?.publication.__typename === "Post" ||
        data?.publication.__typename === "Comment") && {
        hasReacted: data?.publication?.operations.hasReacted,
        hasMirrored: data?.publication.operations.hasMirrored,
        hasActed: data?.publication.operations.hasActed.isFinalisedOnchain,
        hasNotInterested: data?.publication?.operations?.isNotInterested,
        hasBookmarked: data?.publication.operations.hasBookmarked,
      };

      if (existingMetrics) {
        const oldMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${existingMetrics?.split("ipfs://")[1]}`,
        );

        let oldMetricsValues: string = await JSON.parse(oldMetricsToParse.data);

        const isEncrypted =
          this.kinoraMetricsContract.getPlayerPlaybackIdMetricsEncrypted(
            playbackId,
            playerProfileId,
            this.questInvokerProfileId,
            pubId,
          );

        if (isEncrypted) {
          const {
            error: decryptError,
            message,
            decryptedString,
          } = await decryptMetrics(
            await JSON.parse(oldMetricsValues),
            this.questInvokerPKPData.ethAddress,
            playerProfileOwnerAddress,
            this.authSig,
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
            oldMetricsValues = await JSON.parse(decryptedString);
          }
        }

        const oldMetrics: PlayerMetrics = await JSON.parse(oldMetricsValues);

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
            oldMetrics.rawImpressionCount +
              this.metrics.getImpressionCount() ===
            0
              ? oldMetrics.averageBounceRate
              : ((oldMetrics.rawBounceCount + this.metrics.getBounceCount()) /
                  (oldMetrics.rawImpressionCount +
                    this.metrics.getImpressionCount())) *
                100,
          averageBufferDuration:
            oldMetrics.rawBufferCount + this.metrics.getBufferCount() === 0
              ? oldMetrics.averageBufferDuration
              : (oldMetrics.rawBufferDuration +
                  this.metrics.getBufferDuration()) /
                (oldMetrics.rawBufferCount + this.metrics.getBufferCount()),
          averageEngagementRate:
            (oldMetrics.rawPlayCount + this.metrics.getPlayCount()) *
              this.videoElement.duration ===
            0
              ? oldMetrics.averageEngagementRate
              : ((oldMetrics.rawTotalDuration +
                  this.metrics.getTotalDuration()) /
                  ((oldMetrics.rawPlayCount + this.metrics.getPlayCount()) *
                    this.videoElement.duration)) *
                100,
          averagePlayPauseRatio:
            oldMetrics.rawPauseCount + this.metrics.getPauseCount() === 0
              ? oldMetrics.averagePlayPauseRatio
              : (oldMetrics.rawPlayCount + this.metrics.getPlayCount()) /
                (oldMetrics.rawPauseCount + this.metrics.getPauseCount()),
          averageCtr:
            oldMetrics.rawImpressionCount +
              this.metrics.getImpressionCount() ===
            0
              ? oldMetrics.averageCtr
              : ((oldMetrics.rawClickCount + this.metrics.getClickCount()) /
                  (oldMetrics.rawImpressionCount +
                    this.metrics.getImpressionCount())) *
                100,
          averageAvd:
            oldMetrics.rawPlayCount + this.metrics.getPlayCount() === 0
              ? oldMetrics.averageAvd
              : (oldMetrics.rawTotalDuration +
                  this.metrics.getTotalDuration()) /
                (oldMetrics.rawPlayCount + this.metrics.getPlayCount()),
          hasMirrored: lensStats.hasMirrored,
          hasReacted: lensStats.hasReacted,
          hasBookmarked: lensStats.hasBookmarked,
          hasActed: lensStats.hasActed,
          hasNotInterested: lensStats.hasNotInterested,
        };
      } else {
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
          hasMirrored: lensStats.hasMirrored,
          hasReacted: lensStats.hasReacted,
          hasBookmarked: lensStats.hasBookmarked,
          hasActed: lensStats.hasActed,
          hasNotInterested: lensStats.hasNotInterested,
        };
      }

      this.log(
        LogCategory.METRICS,
        `Player metrics updated.`,
        JSON.stringify(playerMetrics),
        new Date().toISOString(),
      );

      return playerMetrics;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Get Player Quest metrics failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error getting Player metrics: ${err.message}`);
      }
    }
  };

  private checkQuestMilestoneMetrics = async (
    playbackId: string,
    playerProfileId: string,
    pubId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
  ): Promise<boolean> => {
    try {
      let playerElegible = false;

      let currentMetricsHash: string =
        await this.kinoraQuestDataContract.getPlayerPlaybackIdMetricsHash(
          playbackId,
          parseInt(playerProfileId, 16),
          this.questInvokerProfileId,
          parseInt(pubId, 16),
        );

      const currentMetricsToParse = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${currentMetricsHash}`,
      );

      let currentMetrics = await JSON.parse(currentMetricsToParse.data);

      const encrypted =
        await this.kinoraQuestDataContract.getPlayerPlaybackIdMetricsEncrypted(
          playbackId,
          parseInt(playerProfileId, 16),
          this.questInvokerProfileId,
          parseInt(pubId, 16),
        );

      if (encrypted) {
        const { error, message, decryptedString } = await decryptMetrics(
          await JSON.parse(currentMetrics),
          this.questInvokerPKPData.ethAddress,
          playerProfileOwnerAddress,
          this.authSig,
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

      const hashedCompletion =
        await this.kinoraQuestDataContract.getQuestMilestoneCompletionConditionHash(
          this.questInvokerProfileId,
          parseInt(pubId, 16),
          milestone,
        );

      const toParseCompletion: string = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${hashedCompletion?.split("ipfs://")[1]}`,
      );

      const uriParsed: MilestoneEligibility = await JSON.parse(
        toParseCompletion,
      );

      playerElegible = this.metricComparison(currentPlayerMetrics, uriParsed);

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
    eligibilityCriteria: MilestoneEligibility,
  ): boolean => {
    for (const key in eligibilityCriteria) {
      const criteria = eligibilityCriteria[key as keyof MilestoneEligibility];

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
