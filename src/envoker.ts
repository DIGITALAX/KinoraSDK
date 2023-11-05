import axios from "axios";
import {
  ChainIds,
  GatingLogic,
  LensQuestMetadata,
  Milestone,
  MilestoneEligibility,
  RewardType,
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

export class Envoker {
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
   * @description The correct length of Lit Action Hashes that should be provided to be assigned to the PKP.
   */
  private litActionHashLength: number = 0;

  /**
   * @private
   * @type {string}
   * @description Pub Id returned from Quest instantiation.
   */
  private pubId: string;

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

  /**
   * Constructs an instance of the enclosing class, initializing necessary properties
   * and contracts based on the provided arguments.
   *
   * @param args - An object encompassing the necessary parameters for constructor invocation.
   * @param args.questEnvokerProfileId - A string representing the quest envoker's Lens Profile Id.
   * @param args.authedApolloClient - An authenticated Apollo client for interacting with the GraphQL API with Lens Protocol.
   * @param args.signer - (Optional) A signer instance for authorizing transactions. If omitted, a random signer is generated.
   * @param args.multihashDevKey - (Optional) A string representing the developer's multihash key.
   * @param args.pkp - (Optional) An object containing the public key and token ID for the quest envoker's PKP data.
   * @param args.pkp.tokenId - A string representing the PKP token ID.
   * @param args.pkp.publicKey - A string representing the PKP public key.
   * @param args.kinoraQuestContract - (Optional) A string representing the address of the Kinora Quest contract deployed by the envoker.
   * @param args.kinoraEscrowContract - (Optional) A string representing the address of the Kinora Escrow contract deployed by the envoker.
   */
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
   * @param {GatingLogic} questInputs.joinQuestTokenGatedLogic - The token gated logic for joining the quest.
   * @throws Will throw an error if necessary data or setups are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing various contract addresses and other details relevant to the new quest.
   */
  instantiateNewQuest = async (questInputs: {
    ipfsQuestDetailsCID: string;
    maxPlayerCount: number;
    milestones: Milestone[];
    joinQuestTokenGatedLogic: GatingLogic;
  }): Promise<{
    kinoraAccessControl?: `0x${string}`;
    kinoraMetrics?: `0x${string}`;
    kinoraQuest?: `0x${string}`;
    kinoraEscrow?: `0x${string}`;
    pubId?: string;
    multiHashDevKey?: string;
    milestonesLitActionCodeToHash?: string[];
    metricsLitActionCodeToHash?: string;
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
        questInputs.milestones[i].eligibilityURI,
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
          "tuple(tuple(address[] erc721Addresses, uint256[][] erc721TokenIds, address[] erc20Addresses, address[] erc20Thresholds, bool oneOf), address questEnvokerPKP, address questEnvoker, uint256 maxPlayerCount)",
          "tuple(tuple(uint256 type, address tokenAddress, uint256 amount) reward, string completionCriteria, bytes32 conditionHash, uint256 milestone, string uri)[]",
        ],
        [
          {
            gated: questInputs.joinQuestTokenGatedLogic,
            questEnvokerPKP: this.questEnvokerPKPData.ethAddress,
            questEnvoker: await this.signer.getAddress(),
            maxPlayerCount: questInputs.maxPlayerCount,
          },
          questInputs.milestones
            .sort((a, b) => a.milestone - b.milestone)
            .map((milestone: Milestone) => {
              return {
                gated: milestone.gated,
                reward: {
                  type: milestone.reward.type,
                  uri:
                    milestone.reward.type === RewardType.ERC721
                      ? milestone.reward.erc721URI?.includes("ipfs://")
                        ? milestone.reward.erc721URI
                        : "ipfs://" + milestone.reward.erc721URI
                      : "",
                  tokenAddress:
                    milestone.reward.type === RewardType.ERC721
                      ? "0x"
                      : milestone.reward.erc20tokenAddress,
                  amount:
                    milestone.reward.type === RewardType.ERC721
                      ? "0"
                      : milestone.reward.erc20tokenAmount,
                },
                completionCriteria: milestone.eligibilityURI,
                conditionHash: hashHex(
                  milestone.eligibilityURI + this.multihashDevKey,
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

      let milestonesLitActionCodeToHash: string[] = [];
      let metricsLitActionCodeToHash: string;

      for (let i = 0; i <= questInputs.milestones.length; i++) {
        if (i < questInputs.milestones.length) {
          const code = getLitActionCode(
            hashHex(
              this.multihashDevKey +
                JSON.stringify(questInputs.milestones[i].eligibilityURI),
            ),
            kinoraMetrics,
          );

          milestonesLitActionCodeToHash.push(bundleCodeManual(code));
        } else {
          const code = getLitActionCode(
            hashHex(
              this.multihashDevKey +
                hashHex(this.questEnvokerProfileId.toString()),
            ),
            kinoraMetrics,
          );
          metricsLitActionCodeToHash = bundleCodeManual(code);
        }
      }

      this.litActionHashLength = milestonesLitActionCodeToHash.length;
      this.pubId = data.createOnchainPostTypedData.id.split("-")[1];

      return {
        kinoraAccessControl:
          await factoryContract.getPKPToDeployedKinoraAccessControl(
            this.questEnvokerPKPData.ethAddress,
          ),
        kinoraMetrics,
        kinoraQuest,
        kinoraEscrow,
        pubId: this.pubId,
        multiHashDevKey: this.multihashDevKey,
        milestonesLitActionCodeToHash,
        metricsLitActionCodeToHash,
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
   * @param {string[]} litActionMilestoneHashes - Array of Lit action Milestone code hashes to be assigned.
   * @param {string[]} litActionMetricsHash - The Lit action Metric code hash to be assigned.
   * @throws Will throw an error if PKP Token Id is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing an array of transaction hashes for each assigned action.
   */
  assignQuestActionsToPKP = async (
    litActionMilestoneHashes: string[],
    litActionMetricsHash: string,
  ): Promise<{
    assignLitActionsTxes?: string[];
    error: boolean;
    errorMessage?: string;
  }> => {
    if (this.litActionHashLength !== litActionMilestoneHashes.length)
      throw new Error("Incorrect Lit Action Milestone Code Hashes length.");
    if (!this.pubId)
      throw new Error(
        "Pub Id not set. Did you correctly instantiate your Quest?",
      );
    if (!this.questEnvokerPKPData.tokenId)
      throw new Error("Set questEnvoker PKP Token Id before continuing.");

    try {
      let assignLitActionsTxes: string[] = [];

      for (let i = 0; i <= litActionMilestoneHashes.length; i++) {
        const { error, message, txHash } = await assignLitAction(
          this.pkpPermissionsContract,
          this.questEnvokerPKPData.tokenId,
          i === litActionMilestoneHashes.length
            ? getBytesFromMultihash(litActionMetricsHash)
            : getBytesFromMultihash(litActionMilestoneHashes[i]),
        );

        if (error) {
          return {
            error: true,
            errorMessage: message,
          };
        }
        assignLitActionsTxes.push(txHash);
      }

      await this.kinoraQuestContract.setLitActions(
        litActionMilestoneHashes,
        litActionMetricsHash,
        parseInt(this.pubId, 16),
      );

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
   * @throws Will throw an error if necessary setups or data are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   */
  terminateQuestAndWithdraw = async (
    pubId: string,
    toAddress: `0x${string}`,
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

        const litAction =
          await this.kinoraQuestDataContract.getMilestoneLitActionHash(
            this.questEnvokerProfileId,
            parseInt(pubId, 16),
            i,
          );

        removeLitAction(
          this.pkpPermissionsContract,
          this.questEnvokerPKPData.tokenId,
          getBytesFromMultihash(litAction),
        );
      }

      const litAction = await this.kinoraQuestContract.metricsHash();

      removeLitAction(
        this.pkpPermissionsContract,
        this.questEnvokerPKPData.tokenId,
        getBytesFromMultihash(litAction),
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

  /**
   * Validates the milestone eligibility criteria contained within a specified hash. The hash content is fetched and parsed to a MilestoneEligibility object, which is then scrutinized to ensure all criteria adhere to the defined validation rules.
   *
   * @param hash - A string representing the hash of the eligibility criteria.
   * @returns A promise that resolves to a boolean indicating whether the eligibility criteria within the hash are valid.
   *
   * @throws Will throw an error if the axios.get or JSON.parse operation fails.
   */
  private validateMilestoneEligibilityHash = async (
    hash: string,
  ): Promise<boolean> => {
    let valid = true;
    const eligibility = await axios.get(`${INFURA_GATEWAY}/ipfs/${hash}`);

    const parsed: MilestoneEligibility = await JSON.parse(eligibility.data);

    if (parsed?.internalPlaybackCriteria) {
      for (let i = 0; i < parsed?.internalPlaybackCriteria?.length; i++) {
        valid =
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.averageAvd,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.averageCtr,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.totalPlayCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .totalPauseCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .totalClickCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.totalSkipCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.totalDuration,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .totalImpressionCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .totalVolumeChangeCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .totalBufferCount,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .averageEngagementRate,
          ) &&
          isValidMetricCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .averagePlayPauseRatio,
          ) &&
          isValidBoolLensCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.mirrorLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.likeLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria.bookmarkLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.internalPlaybackCriteria[i].playbackCriteria
              .notInterestedLens,
          );

        if (!valid) {
          return valid;
        }
      }

      if (!valid) {
        return;
      }
    }

    if (parsed?.averageGlobalPlaybackCriteria) {
      for (let i = 0; i < parsed?.averageGlobalPlaybackCriteria?.length; i++) {
        valid =
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .averageAvd,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .averageCtr,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalPlayCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalPauseCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalClickCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalSkipCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalDuration,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalImpressionCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalVolumeChangeCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .totalBufferCount,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .averageEngagementRate,
          ) &&
          isValidMetricCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .averagePlayPauseRatio,
          ) &&
          isValidBoolLensCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .mirrorLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria.likeLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .bookmarkLens,
          ) &&
          isValidBoolLensCriteria(
            parsed?.averageGlobalPlaybackCriteria[i].playbackCriteria
              .notInterestedLens,
          );

        if (!valid) {
          return valid;
        }
      }

      if (!valid) {
        return;
      }
    }

    if (parsed?.averageGlobalVideoStats) {
      valid =
        isValidMetricCriteria(parsed?.averageGlobalVideoStats.averageAvd) &&
        isValidMetricCriteria(parsed?.averageGlobalVideoStats.averageCtr) &&
        isValidMetricCriteria(parsed?.averageGlobalVideoStats.totalPlayCount) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.totalPauseCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.totalClickCount,
        ) &&
        isValidMetricCriteria(parsed?.averageGlobalVideoStats.totalSkipCount) &&
        isValidMetricCriteria(parsed?.averageGlobalVideoStats.totalDuration) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.totalImpressionCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.totalVolumeChangeCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.totalBufferCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.averageEngagementRate,
        ) &&
        isValidMetricCriteria(
          parsed?.averageGlobalVideoStats.averagePlayPauseRatio,
        ) &&
        isValidBoolLensCriteria(parsed?.averageGlobalVideoStats.mirrorLens) &&
        isValidBoolLensCriteria(parsed?.averageGlobalVideoStats.likeLens) &&
        isValidBoolLensCriteria(parsed?.averageGlobalVideoStats.bookmarkLens) &&
        isValidBoolLensCriteria(
          parsed?.averageGlobalVideoStats.notInterestedLens,
        );

      if (!valid) {
        return valid;
      }
    }

    if (parsed?.averageInternalVideoStats) {
      valid =
        isValidMetricCriteria(parsed?.averageInternalVideoStats.averageAvd) &&
        isValidMetricCriteria(parsed?.averageInternalVideoStats.averageCtr) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalPlayCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalPauseCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalClickCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalSkipCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalDuration,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalImpressionCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalVolumeChangeCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.totalBufferCount,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.averageEngagementRate,
        ) &&
        isValidMetricCriteria(
          parsed?.averageInternalVideoStats.averagePlayPauseRatio,
        ) &&
        isValidBoolLensCriteria(parsed?.averageInternalVideoStats.mirrorLens) &&
        isValidBoolLensCriteria(parsed?.averageInternalVideoStats.likeLens) &&
        isValidBoolLensCriteria(
          parsed?.averageInternalVideoStats.bookmarkLens,
        ) &&
        isValidBoolLensCriteria(
          parsed?.averageInternalVideoStats.notInterestedLens,
        );

      if (!valid) {
        return valid;
      }
    }

    return valid;
  };
}
