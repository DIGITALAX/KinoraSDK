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

/**
 * @class Sequence
 * @description The Sequence class extends EventEmitter and encapsulates logic and state for a video sequence.
 * @extends EventEmitter
 */
export class Sequence extends EventEmitter {
  /**
   * @private
   * @type {Metrics}
   * @description Instance of Metrics class to handle metric data.
   */
  private metrics: Metrics;

  /**
   * @private
   * @type {HTMLVideoElement}
   * @description HTML element for video playback.
   */
  private videoElement: HTMLVideoElement;

  /**
   * @private
   * @type {JsonRpcProvider}
   * @description JSON-RPC provider for interacting with the Polygon blockchain.
   */
  private polygonProvider: JsonRpcProvider;

  /**
   * @private
   * @type {JsonRpcProvider}
   * @description JSON-RPC provider for interacting with the Chronicle blockchain.
   */
  private chronicleProvider: JsonRpcProvider;

  /**
   * @private
   * @type {number}
   * @description Maximum size of the logs array.
   */
  private logSize = 1000;

  /**
   * @private
   * @type {number}
   * @description Index for the next log entry.
   */
  private logIndex = 0;

  /**
   * @private
   * @type {ILogEntry[]}
   * @description Array to hold log entries.
   */
  private logs: ILogEntry[] = new Array(this.logSize);

  /**
   * @private
   * @type {string}
   * @description RPC URL for blockchain interactions.
   */
  private rpcURL: string;

  /**
   * @private
   * @type {string}
   * @description Parent Id associated with the sequence.
   */
  private parentId: string;

  /**
   * @private
   * @type {string}
   * @description Blockchain name/identifier.
   */
  private chain: string = CHAIN;

  /**
   * @private
   * @type {string}
   * @description Developer key for multihash.
   */
  private multihashDevKey: string;

  /**
   * @private
   * @type {number}
   * @description Quest invoker's profile Id.
   */
  private questInvokerProfileId: number;

  /**
   * @private
   * @type {Object}
   * @description Quest invoker's PKP data including public key, token Id, and Ethereum address.
   */
  private questInvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  /**
   * @private
   * @type {boolean}
   * @description Flag to determine the mode of error handling; strict or not.
   */
  private errorHandlingModeStrict: boolean = false;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the PKP contract.
   */
  private pkpContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the PKP Permissions contract.
   */
  private pkpPermissionsContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest contract.
   */
  private kinoraQuestContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Metrics contract.
   */
  private kinoraMetricsContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest Data contract.
   */
  private kinoraQuestDataContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Escrow contract.
   */
  private kinoraEscrowContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Signer}
   * @description Instance of ethers.Signer for signing transactions.
   */
  private signer: ethers.Signer;

  /**
   * @private
   * @type {LitAuthSig}
   * @description Authenticated signature object.
   */
  private authSig: LitAuthSig;

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for quest invoker interactions.
   */
  private questInvokerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {LitJsSdk.LitNodeClient}
   * @description Instance of LitJsSdk.LitNodeClient for managing LIT network interactions.
   */
  private litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: "cayenne",
    debug: false,
    alertWhenUnauthorized: true,
  });

  /**
   * @constructor
   * @param {Object} args - Constructor arguments
   * @param {string} args.questInvokerProfileId - Quest invoker's profile Id
   * @param {LitAuthSig} args.authSig - Authenticated signature
   * @param {string} [args.parentId] - Parent Id (optional)
   * @param {string} [args.redirectURL] - Redirect URL (optional)
   * @param {string} [args.rpcURL] - RPC URL for blockchain interactions (optional)
   * @param {boolean} [args.errorHandlingModeStrict] - Flag to set error handling mode to strict (optional)
   * @param {`0x04${string}`} [args.questInvokerPKPPublicKey] - Quest invoker's PKP public key (optional)
   * @param {string} [args.questInvokerPKPTokenId] - Quest invoker's PKP token Id (optional)
   * @param {string} [args.multihashDevKey] - Multihash developer key (optional)
   * @param {ethers.Signer} [args.signer] - Signer instance for signing transactions (optional)
   * @param {`0x${string}`} [args.kinoraMetricsContract] - Address of the KinoraMetrics contract (optional)
   * @param {`0x${string}`} [args.kinoraQuestContract] - Address of the KinoraQuest contract (optional)
   * @param {`0x${string}`} [args.kinoraEscrowContract] - Address of the KinoraEscrow contract (optional)
   * @param {ApolloClient<NormalizedCacheObject>} [args.playerAuthedApolloClient] - Authenticated Apollo client for the player (optional)
   * @param {ApolloClient<NormalizedCacheObject>} [args.questInvokerAuthedApolloClient] - Authenticated Apollo client for the quest invoker (optional)
   */
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

  /**
   * @method
   * @description Initializes the video element by querying the Livepeer Player element inside a specified parent div. It also binds certain event handlers to their respective contexts.
   * @throws Will throw an error if parent div Id is not specified, or if the Livepeer Player element is not found.
   * @returns {void}
   */

  videoInit = (): void => {
    if (!this.parentId)
      throw new Error(
        "Specify Id of parent div to Livepeer Player element in the constructor.",
      );
    if (typeof window !== "undefined") {
      this.videoElement = document
        ?.getElementById(this.parentId)
        ?.querySelector('[class*="livepeer-contents-container"]')
        ?.querySelector("video");

      if (!this.videoElement)
        throw new Error("Livepeer Player element not found.");

      this.timeUpdateHandler = this.timeUpdateHandler.bind(this);
      this.fullScreenChangeHandler = this.fullScreenChangeHandler.bind(this);

      window.addEventListener("beforeunload", this.beforeUnloadHandler);
    }
  };

  /**
   * @method
   * @description Binds various event listeners to the video element to track user interactions and metrics. Verifies the existence of necessary data before proceeding.
   * @throws Will throw an error if run outside a browser environment, or if certain preconditions are not met.
   * @returns {void}
   */
  bindEvents = (): void => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.videoElement)
      throw new Error(
        "Video element not detected. Make sure to set your Livepeer Player component in your app.",
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

  /**
   * @method
   * @description Constructs a URI that is compatible with the quest structure by formatting provided quest details into a specific textual and image format.
   * @param {Object} args - The quest details including title, description, milestones, and cover image.
   * @param {string} args.questTitle - The title of the quest.
   * @param {string} args.questDescription - A description of the quest.
   * @param {string[]} args.questMilestonesDetails - Details of each milestone in the quest.
   * @param {string} args.questCoverImage - URI of the quest's cover image.
   * @returns {ImageMetadataV3} - The formatted data compliant with ImageMetadataV3 structure.
   */
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

  /**
   * @method
   * @description Instantiates a new quest with specified inputs. It checks for necessary setups, generates random keys if needed, and interacts with contracts to set up the quest.
   * @param {Object} questInputs - The details required for quest creation.
   * @param {string} questInputs.ipfsQuestDetails - IPFS URI where quest details are stored.
   * @param {number} questInputs.maxPlayerCount - Maximum number of players for the quest.
   * @param {Milestone[]} questInputs.milestones - Array of milestone objects for the quest.
   * @throws Will throw an error if necessary data or setups are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing various contract addresses and other details relevant to the new quest.
   */
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
          "tuple(tuple(uint256 type, address tokenAddress, uint256 amount) reward, string completionConditionHash, bytes32 conditionHash, uint256 numberOfPoints, uint256 milestone, string uri)[]",
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

  /**
   * @method
   * @description Assigns a set of Lit action code hashes to a PKP. Ensures that a PKP Token Id has been set before proceeding.
   * @param {string[]} litActionCodeHashes - Array of Lit action code hashes to be assigned.
   * @throws Will throw an error if PKP Token Id is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing an array of transaction hashes for each assigned action.
   */
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

  /**
   * @method
   * @description Terminates a quest and triggers the withdrawal process for any remaining funds. Ensures necessary setups and data are present before proceeding.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} toAddress - Ethereum address to which remaining funds will be sent.
   * @param {string[]} milestoneLitActionCodeHashes - Array of Lit action code hashes for each milestone.
   * @param {string} metricsLitActionCodeHash - Lit action code hash for metrics.
   * @throws Will throw an error if necessary setups or data are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   */
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

  /**
   * @method
   * @description Allows a player to join a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
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

  /**
   * @method
   * @description Allows a player to complete a milestone in a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {number} milestone - The milestone number to be completed.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
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

  /**
   * @method
   * @description Collects and potentially encrypts player metrics for a quest, based on specified parameters. Ensures function is run in a browser environment with a video element present.
   * @param {string} playbackId - The playback Id for the quest.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {boolean} encrypt - A flag indicating whether to encrypt the metrics data.
   * @throws Will throw an error if run outside a browser environment, or if the video element is not detected.
   * @returns {Promise<string>} - Promise resolving to a JSON string containing the collected (and possibly encrypted) metrics data.
   */
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
        "Video element not detected. Make sure to set your Livepeer Player component in your app.",
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

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} playbackId - The playback Id associated with the metrics.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} playerMetricsHash - The hash of the player's metrics.
   * @param {string} litActionHash - The hash of the LIT action.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {boolean} metricsEncrypted - Flag indicating whether the metrics are encrypted.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
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

  /**
   * @method verifyPlayerMilestoneComplete
   * @description This function is responsible for verifying if a player has completed a milestone in a quest, and updates the blockchain accordingly. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {number} milestone - The milestone number.
   * @param {string} litActionMilestoneHash - The hash of the LIT action for the milestone.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<Object>} - A Promise that resolves to an object containing a check result indicating whether the milestone verification succeeded.
   */
  verifyPlayerMilestoneComplete = async (
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
          "playerEligibleToClaimMilestone",
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
          "playerEligibleToClaimMilestone",
          this.authSig ? this.authSig : litAuthSig,
          litActionMilestoneHash,
          this.questInvokerPKPData.publicKey,
          this.multihashDevKey,
          hashKeyItem, // GENERAL HASH!!,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player Update Eligible status on-chain failed on Broadcast.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error updating Player Eligibility status and broadcasting: ${message}`,
            );
          }
          return;
        } else {
          this.metrics.reset();

          this.log(
            LogCategory.RESPONSE,
            `Player Eligibility status updated successfully. Lit Action Response.`,
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

  /**
   * @method getLogs
   * @description Retrieves the logs stored in the instance, optionally filtered by a specified category.
   * @param {LogCategory} [category] - An optional parameter to filter logs by a specific category. If not provided, all logs are returned.
   * @returns {ILogEntry[]} - An array of log entries, either filtered by the specified category or all logs if no category is specified.
   */
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

  /**
   * @method collectMetrics
   * @description Collects and aggregates player metrics from both current and past interactions, integrating publication interactions.
   * @param {string} playbackId - The playback Id related to the player metrics.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @returns {Promise<PlayerMetrics>} - A Promise resolving to an aggregated PlayerMetrics object.
   * @throws Will throw an error if any issue occurs during metrics collection or aggregation.
   * @private
   */
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

  /**
   * @method checkQuestMilestoneMetrics
   * @description Checks whether the player's metrics meet the milestone requirements.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @param {number} milestone - The milestone number.
   * @returns {Promise<boolean>} - A Promise resolving to a boolean indicating whether the milestone requirements are met.
   * @throws Will throw an error if any issue occurs during the milestone check.
   * @private
   */
  private checkQuestMilestoneMetrics = async (
    playerProfileId: string,
    pubId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
  ): Promise<boolean> => {
    try {
      let playerEligible = false;

      const hashedCompletion =
        await this.kinoraQuestDataContract.getQuestMilestoneCompletionConditionHash(
          this.questInvokerProfileId,
          parseInt(pubId, 16),
          milestone,
        );

      const toParseCompletion: string = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${hashedCompletion?.split("ipfs://")[1]}`,
      );

      const uriParsed: MilestoneEligibility[] = await JSON.parse(
        toParseCompletion,
      );

      playerEligible = await this.metricComparison(
        uriParsed,
        playerProfileId,
        playerProfileOwnerAddress,
        pubId,
      );

      return playerEligible;
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

  /**
   * @method metricComparison
   * @description Compares player metrics against eligibility criteria for quest milestone completion.
   * @param {MilestoneEligibility[]} eligibilityCriteria - The eligibility criteria array.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @returns {Promise<boolean>} - A Promise resolving to a boolean indicating whether the player meets the eligibility criteria.
   * @private
   */
  private metricComparison = async (
    eligibilityCriteria: MilestoneEligibility[],
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    pubId: string,
  ): Promise<boolean> => {
    let result = true;
    for (let i = 0; i < eligibilityCriteria.length; i++) {
      let currentMetricsHash: string =
        await this.kinoraQuestDataContract.getPlayerPlaybackIdMetricsHash(
          eligibilityCriteria[i].playbackId,
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
          eligibilityCriteria[i].playbackId,
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

      for (const key in eligibilityCriteria[i].criteria) {
        const criteria =
          eligibilityCriteria[i].criteria[key as keyof MilestoneEligibility];

        if (!criteria) continue;

        const playerValue = currentPlayerMetrics[key as keyof PlayerMetrics];
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
            result = false;
          }
        } else if (criteria.operator === "or") {
          if (!conditions.some(Boolean)) {
            result = false;
          }
        }
      }

      if (!result) {
        return false;
      }
    }

    return result;
  };

  /**
   * @method cleanUpListeners
   * @description Removes event listeners related to video metrics collection.
   * @throws Will throw an error if not used in a browser environment or if the video element is not found.
   * @private
   */
  private cleanUpListeners = () => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.videoElement)
      throw new Error(
        "Video element not detected. Make sure to set your Livepeer Player component in your app.",
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

  /**
   * @method timeUpdateHandler
   * @description Event handler for video 'timeupdate' event, updates metrics and checks for bounce condition.
   * @param {Event} e - The event object.
   * @private
   */
  private timeUpdateHandler = (e: Event) => {
    const currentTime = (e.currentTarget as HTMLVideoElement).currentTime;
    this.metrics.onTimeUpdate(currentTime);
    if (currentTime < 10) {
      this.metrics.onBounce();
    }
  };

  /**
   * @method fullScreenChangeHandler
   * @description Event handler for document 'fullscreenchange' event, updates metrics.
   * @private
   */
  private fullScreenChangeHandler = () => {
    if (document.fullscreenElement === this.videoElement) {
      this.metrics.onFullScreen();
    }
  };

  /**
   * @method beforeUnloadHandler
   * @description Event handler for window 'beforeunload' event, performs cleanup.
   * @private
   */
  private beforeUnloadHandler = () => {
    this.cleanUpListeners();
  };

  /**
   * @method log
   * @description Logs messages along with associated data, managing log index and emitting log events.
   * @param {LogCategory} category - The category of the log.
   * @param {string} message - The log message.
   * @param {string} responseObject - The response object as a string.
   * @param {string} isoDate - The ISO string representation of the log date.
   * @private
   */
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
