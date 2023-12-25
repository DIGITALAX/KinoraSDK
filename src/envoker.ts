import { omit } from "lodash";
import {
  GatingLogic,
  LensQuestMetadata,
  Milestone,
  MilestoneEligibility,
  RewardType,
} from "./@types/kinora-sdk";
import { isValidBoolLensCriteria, isValidMetricCriteria } from "./utils/misc";
import {
  IPFS_REGEX,
  KINORA_OPEN_ACTION_CONTRACT,
  LENS_HUB_PROXY_CONTRACT,
  KINORA_QUEST_CONTRACT,
  KINORA_QUEST_DATA_CONTRACT,
  KINORA_ESCROW_CONTRACT,
} from "./constants";
import { v4 as uuidv4 } from "uuid";
import onChainPost from "./graphql/mutations/onChainPost";
import validateMetadata from "./graphql/queries/validateMetadata";
import LensHubProxyAbi from "./abis/LensHubProxy.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import { ethers } from "ethers";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { PublicationMetadataMainFocusType } from "./@types/generated";

export class Envoker {
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
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Lens Hub Proxy contract.
   */
  private lensHubProxyContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest contract.
   */
  private kinoraQuestContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Escrow contract.
   */
  private kinoraEscrowContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest Data contract.
   */
  private kinoraQuestDataContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Wallet}
   * @description Instance of Wallet for signing transactions.
   */
  private wallet: ethers.Wallet;

  /**
   * Constructs an instance of the enclosing class, initializing necessary properties
   * and contracts based on the provided arguments.
   *
   * @param args - An object encompassing the necessary parameters for constructor invocation.
   * @param args.questEnvokerProfileId - A string representing the quest envoker's Lens Profile Id.
   * @param args.authedApolloClient - An authenticated Apollo client for interacting with the GraphQL API with Lens Protocol.
   * @param args.signer - A signer instance for authorizing transactions.
   */
  constructor(args: {
    questEnvokerProfileId: `0x${string}`;
    authedApolloClient: ApolloClient<NormalizedCacheObject>;
    wallet?: ethers.Wallet;
  }) {
    this.questEnvokerProfileId = parseInt(args.questEnvokerProfileId, 16);
    this.questEnvokerAuthedApolloClient = args.authedApolloClient;
    this.wallet = args.wallet;
    if (args.wallet) {
      this.lensHubProxyContract = new ethers.Contract(
        LENS_HUB_PROXY_CONTRACT,
        LensHubProxyAbi,
        this.wallet,
      );
      this.kinoraEscrowContract = new ethers.Contract(
        KINORA_ESCROW_CONTRACT,
        KinoraEscrowAbi,
        this.wallet,
      );
    }
    this.kinoraQuestContract = new ethers.Contract(
      KINORA_QUEST_CONTRACT,
      KinoraQuestAbi,
      this.wallet,
    );
    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
      this.wallet,
    );
  }

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
  instantiateNewQuest = async (args: {
    questDetails: {
      cover: `ipfs://${string}`;
      title: string;
      description: string;
    };
    maxPlayerCount: number;
    milestones: Milestone[];
    joinQuestTokenGatedLogic: GatingLogic;
    wallet?: ethers.Wallet;
  }): Promise<{
    postId?: `0x${string}`;
    transactionHash?: `0x${string}`;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.questEnvokerAuthedApolloClient) {
      throw new Error(
        `Set Quest Envoker Authed Apollo Client before Continuing.`,
      );
    }

    if (args.maxPlayerCount < 1) {
      throw new Error(`Invalid Max Player Count.`);
    }

    if (!IPFS_REGEX.test(args.questDetails.cover)) {
      throw new Error(`Invalid IPFS Cover Hash.`);
    }

    const data: LensQuestMetadata = {
      $schema: "https://json-schemas.lens.dev/publications/image/3.0.0.json",
      lens: {
        mainContentFocus: PublicationMetadataMainFocusType.Image,
        image: {
          item: args.questDetails.cover,
          type: "image/png",
        },
        title: args.questDetails.title,
        content: args.questDetails.description,
        attachments: [],
        appId: "kinora",
        id: uuidv4(),
        hideFromFeed: false,
        locale: "en",
        tags: ["kinora quest", "vision quest"],
      },
    };

    const hashedDetails = await hashToIPFS(JSON.stringify(data));

    try {
      const metadata = await validateMetadata({
        rawURI: hashedDetails,
      });

      if (!metadata?.data?.validatePublicationMetadata.valid) {
        throw new Error(`Lens Metadata Verification Failed.`);
      }

      const milestoneDetails = args.milestones
        .sort((a, b) => a.milestone - b.milestone)
        .map(async (milestone: Milestone) => {
          if (!this.validateMilestoneEligibilityHash(milestone.eligibility)) {
            throw new Error(`Invalid Milestone Eligibility Configuration.`);
          } else {
            return {
              gated: milestone.gated,
              reward: milestone.reward.map(async (reward) => {
                if (
                  !IPFS_REGEX.test(reward.erc721URI) &&
                  reward.type === RewardType.ERC721
                ) {
                  throw new Error(`Invalid ERC721 Reward URI Hash.`);
                } else {
                  return {
                    type: reward.type,
                    uri:
                      reward.type === RewardType.ERC721
                        ? "ipfs://" + reward.erc721URI
                        : "",
                    tokenAddress:
                      reward.type === RewardType.ERC721
                        ? "0x"
                        : reward.erc20tokenAddress,
                    amount:
                      reward.type === RewardType.ERC721
                        ? "0"
                        : reward.erc20tokenAmount,
                  };
                }
              }),
              milestone: milestone.milestone,
              videos: milestone.eligibility.internalCriteria.map((item) => {
                return {
                  profileId: parseInt(item?.postId?.split("-")[0], 16),
                  pubId: parseInt(item?.postId?.split("-")[1], 16),
                  minPlayCount: item.playbackCriteria.minPlayCount,
                  minCTR: item.playbackCriteria.minCtr,
                  minAVD: item.playbackCriteria.minAvd,
                  minImpressionCount: item.playbackCriteria.minImpressionCount,
                  minEngagementRate: item.playbackCriteria.minEngagementRate,
                  minDuration: item.playbackCriteria.minDuration,
                  quote: item.playbackCriteria.quoteLens,
                  mirror: item.playbackCriteria.mirrorLens,
                  comment: item.playbackCriteria.commentLens,
                  bookmark: item.playbackCriteria.bookmarkLens,
                  react: item.playbackCriteria.likeLens,
                };
              }),
            };
          }
        });

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(" +
            "tuple(" +
            "address[]," +
            "uint256[][]," +
            "address[]," +
            "uint256[]," +
            "bool" +
            ")," +
            "uint256," +
            "tuple(" +
            "tuple(" +
            "uint8," +
            "string," +
            "address," +
            "uint256" +
            ")[]," +
            "uint256," +
            "tuple(" +
            ")[]" +
            ")[]," +
            "address" +
            ")",
        ],
        [
          {
            gateLogic: args.joinQuestTokenGatedLogic,
            maxPlayerCount: args.maxPlayerCount,
            milestones: milestoneDetails,
            envokerAddress:
              this.wallet.getAddress() || args.wallet?.getAddress(),
          },
        ],
      );

      const { data } = await onChainPost(
        {
          contentURI: metadata,
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

      const typedData = data?.createOnchainPostTypedData?.typedData;

      await this.wallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            JSON.stringify({
              types: omit(typedData?.types, ["__typename"]),
              primaryType: "Post",
              domain: omit(typedData?.domain, ["__typename"]),
              message: omit(typedData?.value, ["__typename"]),
            }),
          ),
        ),
      );

      if (!this.lensHubProxyContract && !this.wallet && args.wallet) {
        this.lensHubProxyContract = new ethers.Contract(
          LENS_HUB_PROXY_CONTRACT,
          LensHubProxyAbi,
          args.wallet,
        );
      }

      const tx = await this.lensHubProxyContract.post({
        profileId: parseInt(typedData?.value.profileId, 16),
        contentURI: typedData?.value.contentURI,
        actionModules: typedData?.value?.actionModules,
        actionModulesInitDatas: typedData?.value?.actionModulesInitDatas,
        referenceModule: typedData?.value?.referenceModule,
        referenceModuleInitData: typedData?.value?.referenceModuleInitData,
      });

      const txHash = await tx.wait();

      return {
        postId: data.createOnchainPostTypedData.id,
        transactionHash: txHash,
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
   * @description Terminates a quest and triggers the withdrawal process for any remaining funds. Ensures necessary setups and data are present before proceeding.
   * @param {`0x${string}`} postId - The Lens Pub Id of the quest.
   * @param {`0x${string}`} toAddress - Ethereum address to which remaining funds will be sent.
   * @throws Will throw an error if necessary setups or data are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   */
  terminateQuestAndWithdraw = async (
    postId: `0x${string}`,
    toAddress: `0x${string}`,
    wallet?: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    withdrawTxes?: string[];
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      const txHash = await this.kinoraQuestContract.terminateQuest(
        parseInt(postId, 16),
      );

      const milestoneCount =
        await this.kinoraQuestDataContract.getQuestMilestoneCount(
          this.questEnvokerProfileId,
          parseInt(postId, 16),
        );

      const withdrawTxes: string[] = [];

      if (!this.wallet && !this.kinoraEscrowContract && wallet) {
        this.kinoraEscrowContract = new ethers.Contract(
          KINORA_ESCROW_CONTRACT,
          KinoraEscrowAbi,
          wallet,
        );
      }

      for (let i = 1; i <= milestoneCount; i++) {
        const withdrawTx =
          await this.kinoraEscrowContract.emergencyWithdrawERC20(
            toAddress,
            parseInt(postId, 16),
            i,
          );
        withdrawTxes.push(withdrawTx);
      }

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
   * Validates the milestone eligibility criteria.
   *
   * @param eligiblity - The eligibility object.
   * @returns A  boolean indicating whether the eligibility criteria within the hash are valid.
   *
   */
  private validateMilestoneEligibilityHash = (
    eligibility: MilestoneEligibility,
  ): boolean => {
    let valid = true;

    if (
      eligibility?.internalCriteria?.length < 1 ||
      !eligibility.internalCriteria
    ) {
      throw new Error(`Specify criteria for Milestones.`);
    }

    if (
      eligibility?.internalCriteria &&
      eligibility?.internalCriteria?.length > 0
    ) {
      for (let i = 0; i < eligibility?.internalCriteria?.length; i++) {
        valid =
          isValidMetricCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.minAvd,
          ) &&
          isValidMetricCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.minCtr,
          ) &&
          isValidMetricCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.minPlayCount,
          ) &&
          isValidMetricCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.minEngagementRate,
          ) &&
          isValidMetricCriteria(
            eligibility?.internalCriteria[i].playbackCriteria
              .minImpressionCount,
          ) &&
          isValidBoolLensCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.mirrorLens,
          ) &&
          isValidBoolLensCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.likeLens,
          ) &&
          isValidBoolLensCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.bookmarkLens,
          ) &&
          isValidBoolLensCriteria(
            eligibility?.internalCriteria[i].playbackCriteria.commentLens,
          );

        if (!valid) {
          return valid;
        }
      }

      if (!valid) {
        return;
      }
    }

    return valid;
  };
}
