import axios from "axios";
import {
  ChainIds,
  LensQuestMetadata,
  Milestone,
  MilestoneEligibilityCriteria,
} from "./@types/kinora-sdk";
import { isValidBoolLensCriteria, isValidMetricCriteria } from "./utils/misc";
import {
  CHRONICLE_PKP_CONTRACT,
  CHRONICLE_PKP_PERMISSIONS_CONTRACT,
  INFURA_GATEWAY,
  KINORA_FACTORY_CONTRACT,
  KINORA_OPEN_ACTION_CONTRACT,
  KINORA_QUEST_DATA_CONTRACT,
  LIT_RPC,
} from "./constants";
import {
  assignLitAction,
  bundleCodeManual,
  generateSecureRandomKey,
  getBytesFromMultihash,
  getLitActionCode,
  hashHex,
  mintNextPKP,
  removeLitAction,
} from "./utils/lit-protocol";
import { v4 as uuidv4 } from "uuid";
import onChainPost from "./graphql/mutations/onChainPost";
import validateMetadata from "./graphql/queries/validateMetadata";
import PKPNFTAbi from "./abis/PKPNFT.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import PKPPermissionsAbi from "./abis/PKPPermissions.json";
import { PublicationMetadataMainFocusType } from "./@types/generated";
import { ethers } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";

export class Creator {
  /**
   * @private
   * @type {Object}
   * @description Quest envoker's PKP data including public key, token Id, and Ethereum address.
   */
  private questEnvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };

  /**
   * @private
   * @type {number}
   * @description Quest envoker's profile Id.
   */
  private questEnvokerProfileId: number;

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for quest envoker interactions.
   */
  private questEnvokerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {ethers.Signer}
   * @description Instance of ethers.Signer for signing transactions.
   */
  private signer: ethers.Signer;

  /**
   * @private
   * @type {JsonRpcProvider}
   * @description JSON-RPC provider for interacting with the Chronicle blockchain.
   */
  private chronicleProvider: JsonRpcProvider;

  /**
   * @private
   * @type {string}
   * @description Developer key for multihash.
   */
  private multihashDevKey: string;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the PKP contract.
   */
  private pkpContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Escrow contract.
   */
  private kinoraEscrowContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest contract.
   */
  private kinoraQuestContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the PKP Permissions contract.
   */
  private pkpPermissionsContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest Data contract.
   */
  private kinoraQuestDataContract: ethers.Contract;

  constructor(args: {
    questEnvokerProfileId: `0x${string}`;
    authedApolloClient: ApolloClient<NormalizedCacheObject>;
    signer?: ethers.Signer;
    multihashDevKey?: string;
    pkp?: {
      tokenId: string;
      publicKey: `0x04${string}`;
    };
    kinoraQuestContract?: `0x${string}`;
    kinoraEscrowContract?: `0x${string}`;
  }) {
    this.questEnvokerProfileId = parseInt(args.questEnvokerProfileId, 16);
    this.questEnvokerAuthedApolloClient = args.authedApolloClient;
    this.chronicleProvider = new ethers.providers.JsonRpcProvider(
      LIT_RPC,
      ChainIds["chronicle"],
    );
    this.signer = args.signer
      ? args.signer
      : ethers.Wallet.createRandom().connect(this.chronicleProvider);
    if (args.multihashDevKey) this.multihashDevKey = args.multihashDevKey;
    if (args.pkp)
      this.questEnvokerPKPData = {
        publicKey: args.pkp.publicKey,
        tokenId: args.pkp.tokenId,
        ethAddress: ethers.utils.computeAddress(
          args.pkp.publicKey,
        ) as `0x${string}`,
      };
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
  }

  /**
   * @method
   * @description Constructs a URI that is compatible with the quest structure by formatting provided quest details into a specific textual and image format.
   * @param {Object} args - The quest details including title, description, milestones, and cover image.
   * @param {string} args.questTitle - The title of the quest.
   * @param {string} args.questDescription - A description of the quest.
   * @param {string[]} args.questMilestonesDetails - Details of each milestone in the quest.
   * @param {string} args.questCoverImageIPFSCID - URI of the quest's cover image.
   * @returns {ImageMetadataV3} - The formatted data compliant with ImageMetadataV3 structure.
   */
  createQuestCompatibleURI = (args: {
    questTitle: string;
    questDescription: string;
    questMilestonesDetails: string[];
    questCoverImageIPFSCID: string;
  }): LensQuestMetadata => {
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

    const data: LensQuestMetadata = {
      $schema: "https://json-schemas.lens.dev/publications/image/3.0.0.json",
      lens: {
        mainContentFocus: PublicationMetadataMainFocusType.Image,
        image: {
          item: "ipfs://" + args.questCoverImageIPFSCID,
          type: "image/png",
        },
        title: args.questTitle,
        content: formattedText,
        attachments: [
          {
            item: "ipfs://" + args.questCoverImageIPFSCID,
            type: "image/png",
          },
        ],
        appId: "kinora",
        id: uuidv4(),
        hideFromFeed: false,
        locale: "en",
        tags: ["kinora", "kinora quest", "vision quest"],
      },
    };

    return data;
  };

  /**
   * @method
   * @description Instantiates a new quest with specified inputs. It checks for necessary setups, generates random keys if needed, and interacts with contracts to set up the quest.
   * @param {Object} questInputs - The details required for quest creation.
   * @param {string} questInputs.ipfsQuestDetailsCID - IPFS URI where quest details are stored.
   * @param {number} questInputs.maxPlayerCount - Maximum number of players for the quest.
   * @param {Milestone[]} questInputs.milestones - Array of milestone objects for the quest.
   * @throws Will throw an error if necessary data or setups are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing various contract addresses and other details relevant to the new quest.
   */
  instantiateNewQuest = async (questInputs: {
    ipfsQuestDetailsCID: string;
    maxPlayerCount: number;
    milestones: Milestone[];
  }): Promise<{
    kinoraAccessControl?: `0x${string}`;
    kinoraMetrics?: `0x${string}`;
    kinoraQuest?: `0x${string}`;
    kinoraEscrow?: `0x${string}`;
    pubId?: string;
    multiHashDevKey?: string;
    litActionCodesToHash?: string[];
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.questEnvokerAuthedApolloClient) {
      throw new Error(
        `Set Quest Envoker Authed Apollo Client before Continuing.`,
      );
    }
    if (!this.multihashDevKey) {
      this.multihashDevKey = generateSecureRandomKey();
    }

    for (let i = 0; i < questInputs.milestones.length; i++) {
      const valid = await this.validateMilestoneEligibilityHash(
        questInputs.milestones[i].eligibilityHash,
      );
      if (!valid) {
        throw new Error(`Milestone ${i + 1} Eligibility Hash is Invalid.`);
      }
    }

    if (!this.questEnvokerPKPData.ethAddress) {
      const { pkpTokenId, publicKey, error, message } = await mintNextPKP(
        this.pkpContract,
      );
      this.questEnvokerPKPData = {
        publicKey: publicKey,
        tokenId: pkpTokenId,
        ethAddress: ethers.utils.computeAddress(publicKey) as `0x${string}`,
      };
      if (error) {
        return {
          error: true,
          errorMessage: message,
        };
      }
    }

    try {
      const metadata = await validateMetadata({
        rawURI: "ipfs://" + questInputs.ipfsQuestDetailsCID,
      });

      if (!metadata?.data?.validatePublicationMetadata.valid) {
        throw new Error(
          `Metadata Verification Failed. Created your metadata with the createQuestCompatibleURI helper function.`,
        );
        return;
      }
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(address questEnvokerPKP, address questEnvoker, uint256 maxPlayerCount)",
          "tuple(tuple(uint256 type, address tokenAddress, uint256 amount) reward, string completionConditionHash, bytes32 conditionHash, uint256 milestone, string uri)[]",
        ],
        [
          {
            questEnvokerPKP: this.questEnvokerPKPData.ethAddress,
            questEnvoker: await this.signer.getAddress(),
            maxPlayerCount: questInputs.maxPlayerCount,
          },
          questInputs.milestones.map((milestone: Milestone) => {
            return {
              reward: milestone.reward,
              completionConditionHash: milestone.eligibilityHash,
              conditionHash: hashHex(
                milestone.eligibilityHash + this.multihashDevKey,
              ),
              milestone: milestone.milestone,
            };
          }),
        ],
      );

      const { data } = await onChainPost(
        {
          contentURI: "ipfs://" + questInputs.ipfsQuestDetailsCID,
          openActionModules: [
            {
              unknownOpenAction: {
                address: KINORA_OPEN_ACTION_CONTRACT,
                data: encodedData,
              },
            },
          ],
        },
        this.questEnvokerAuthedApolloClient,
      );

      const factoryContract = new ethers.Contract(
        KINORA_FACTORY_CONTRACT,
        KinoraFactoryAbi,
        this.signer,
      );

      const kinoraMetrics = await factoryContract.getPKPToDeployedKinoraMetrics(
        this.questEnvokerPKPData.ethAddress,
      );
      const kinoraQuest = await factoryContract.getPKPToDeployedKinoraQuest(
        this.questEnvokerPKPData.ethAddress,
      );
      const kinoraEscrow = await factoryContract.getPKPToDeployedKinoraEscrow(
        this.questEnvokerPKPData.ethAddress,
      );

      this.kinoraQuestContract = new ethers.Contract(
        kinoraQuest,
        KinoraQuestAbi,
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
                hashHex(this.questEnvokerProfileId.toString()),
            ),
            kinoraMetrics,
          );

          litActionCodesToHash.push(bundleCodeManual(code));
        }
      }

      return {
        kinoraAccessControl:
          await factoryContract.getPKPToDeployedKinoraAccessControl(
            this.questEnvokerPKPData.ethAddress,
          ),
        kinoraMetrics,
        kinoraQuest,
        kinoraEscrow,
        pubId: data.createOnchainPostTypedData.id,
        multiHashDevKey: this.multihashDevKey,
        litActionCodesToHash,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error minting Instantiating New Quest: ${err.message}`,
      };
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
    assignLitActionsTxes?: string[];
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.questEnvokerPKPData.tokenId)
      throw new Error("Set questEnvoker PKP Token Id before continuing.");

    try {
      let assignLitActionsTxes: string[] = [];

      for (let i = 0; i < litActionCodeHashes.length; i++) {
        const { error, message, txHash } = await assignLitAction(
          this.pkpPermissionsContract,
          this.questEnvokerPKPData.tokenId,
          getBytesFromMultihash(litActionCodeHashes[i]),
        );

        if (error) {
          return {
            error: true,
            errorMessage: message,
          };
        }
        assignLitActionsTxes.push(txHash);
      }

      return {
        assignLitActionsTxes,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error assigning Actions to new Quest: ${err.message}`,
      };
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
  ): Promise<{
    txHash?: string;
    withdrawTxes?: string[];
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.kinoraQuestContract)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.kinoraEscrowContract)
      throw new Error("Set Kinora Escrow Address before continuing.");
    if (!this.questEnvokerPKPData.publicKey)
      throw new Error("Set questEnvoker PKP Public Key before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");
    if (!this.questEnvokerPKPData.tokenId)
      throw new Error("Set questEnvoker PKP Token Id before continuing.");
    try {
      const txHash = await this.kinoraQuestContract.terminateQuest(
        parseInt(pubId, 16),
      );

      const milestoneCount =
        this.kinoraQuestDataContract.getQuestMilestoneCount(
          this.questEnvokerProfileId,
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
          this.questEnvokerPKPData.tokenId,
          getBytesFromMultihash(milestoneLitActionCodeHashes[i - 1]),
        );
      }

      removeLitAction(
        this.pkpPermissionsContract,
        this.questEnvokerPKPData.tokenId,
        getBytesFromMultihash(metricsLitActionCodeHash),
      );

      return {
        txHash,
        withdrawTxes,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error terminating Quest: ${err.message}`,
      };
    }
  };

  private validateMilestoneEligibilityHash = async (
    hash: string,
  ): Promise<boolean> => {
    const eligibility = await axios.get(`${INFURA_GATEWAY}/ipfs/${hash}`);

    const parsed: MilestoneEligibilityCriteria = await JSON.parse(
      eligibility.data,
    );

    return (
      isValidMetricCriteria(parsed.averageAvd) &&
      isValidMetricCriteria(parsed.averageCtr) &&
      isValidMetricCriteria(parsed.totalPlayCount) &&
      isValidMetricCriteria(parsed.totalPauseCount) &&
      isValidMetricCriteria(parsed.totalClickCount) &&
      isValidMetricCriteria(parsed.totalSkipCount) &&
      isValidMetricCriteria(parsed.totalDuration) &&
      isValidMetricCriteria(parsed.totalImpressionCount) &&
      isValidMetricCriteria(parsed.totalVolumeChangeCount) &&
      isValidMetricCriteria(parsed.totalBufferCount) &&
      isValidMetricCriteria(parsed.averageEngagementRate) &&
      isValidMetricCriteria(parsed.averagePlayPauseRatio) &&
      isValidBoolLensCriteria(parsed.mirrorLens) &&
      isValidBoolLensCriteria(parsed.likeLens) &&
      isValidBoolLensCriteria(parsed.bookmarkLens) &&
      isValidBoolLensCriteria(parsed.notInterestedLens)
    );
  };
}
