import { omit } from "lodash";
import {
  EthereumAddress,
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
  KINORA_ESCROW_CONTRACT,
  KINORA_METRICS_CONTRACT,
} from "./constants/index";
import { v4 as uuidv4 } from "uuid";
import onChainPost from "./graphql/mutations/onChainPost";
import validateMetadata from "./graphql/queries/validateMetadata";
import LensHubProxyAbi from "./abis/LensHubProxy.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import { ethers } from "ethers";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { PublicationMetadataMainFocusType } from "./@types/generated";
import { hashToIPFS } from "./utils/ipfs";

export class Envoker {
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
  private lensHubProxyContract: ethers.Contract | undefined;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Metrics contract.
   */
  private kinoraMetricsContract: ethers.Contract | undefined;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Escrow contract.
   */
  private kinoraEscrowContract: ethers.Contract | undefined;

  /**
   * @private
   * @type {ethers.Wallet}
   * @description Instance of Wallet for signing transactions.
   */
  private wallet: ethers.Wallet | undefined;

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
    authedApolloClient: ApolloClient<NormalizedCacheObject>;
    wallet?: ethers.Wallet;
  }) {
    this.questEnvokerAuthedApolloClient = args.authedApolloClient;
    if (args.wallet) {
      this.wallet = args.wallet;
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
      this.kinoraMetricsContract = new ethers.Contract(
        KINORA_METRICS_CONTRACT,
        KinoraMetricsAbi,
        this.wallet,
      );
    }
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
    postId?: EthereumAddress;
    transactionHash?: EthereumAddress;
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
                  !IPFS_REGEX.test(reward.erc721URI as string) &&
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
              videos: milestone.eligibility.internalCriteria?.map((item) => {
                return {
                  playbackId: item?.playbackId,
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
            "tuple(uint256[][],address[],address[],uint256[],bool)," +
            "uint256," +
            "tuple(" +
            "tuple(string[][],uint256[][],address[],address[],uint256[],bool)," +
            "tuple(uint8,string,address,uint256)[]," +
            "tuple(string,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,bool,bool,bool)[]" +
            "uint256" +
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
              this.wallet?.getAddress() || args.wallet?.getAddress(),
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

      await this.wallet?.signMessage(
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

      const tx = await this.lensHubProxyContract?.post({
        profileId: parseInt(typedData?.value.profileId, 16),
        contentURI: typedData?.value.contentURI,
        actionModules: typedData?.value?.actionModules,
        actionModulesInitDatas: typedData?.value?.actionModulesInitDatas,
        referenceModule: typedData?.value?.referenceModule,
        referenceModuleInitData: typedData?.value?.referenceModuleInitData,
      });

      const txHash = await tx.wait();

      return {
        postId: data?.createOnchainPostTypedData.id,
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
   * @param {EthereumAddress} questId - The Quest Id.
   * @param {EthereumAddress} wallet - (Optional) Ethereum wallet boject for signing the transaction.
   * @throws Will throw an error if necessary setups or data are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   */
  terminateQuestAndWithdraw = async (
    questId: EthereumAddress,
    wallet?: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      const tx = await this.kinoraEscrowContract?.emergencyWithdrawERC20(
        this.wallet?.getAddress() || wallet?.getAddress(),
        questId,
      );

      const txHash = await tx.wait();

      return {
        txHash,
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
   * Quest Envoker to verify Player can claim milestone.
   *
   * @param questId - The Quest Id.
   * @param milestone - The Milestone to verify.
   * @param playerProfileId - The Player's profile Id.
   * @param eligible - The eligibility boolean.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   *
   */
  setPlayerEligibleToClaimMilestone = async (
    questId: number,
    milestone: number,
    playerProfileId: string,
    eligible: boolean,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      const tx =
        await this.kinoraMetricsContract?.playerEligibleToClaimMilestone(
          questId,
          milestone,
          playerProfileId,
          eligible,
        );

      const txHash = await tx.wait();

      return {
        error: false,
        txHash,
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
      !eligibility.internalCriteria ||
      (eligibility.internalCriteria &&
        eligibility?.internalCriteria?.length < 1)
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
        return false;
      }
    }

    return valid;
  };
}
