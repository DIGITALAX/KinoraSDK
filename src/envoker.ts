import { omit } from "lodash";
import {
  IPFS_REGEX,
  KINORA_OPEN_ACTION_CONTRACT,
  LENS_HUB_PROXY_CONTRACT,
  KINORA_ESCROW_CONTRACT,
  KINORA_METRICS_CONTRACT,
  ZERO_ADDRESS,
  ERROR_CODES,
  LENS_MODULE_CONTRACT,
} from "./constants/index";
import { v4 as uuidv4 } from "uuid";
import LensModuleAbi from "./abis/LensModule.json";
import onChainPost from "./graphql/mutations/onChainPost";
import validateMetadata from "./graphql/queries/validateMetadata";
import LensHubProxyAbi from "./abis/LensHubProxy.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import { BigNumber, ethers } from "ethers";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { PublicationMetadataMainFocusType } from "./@types/generated";
import {
  ZeroString,
  LensQuestMetadata,
  GatingLogic,
  Milestone,
  RewardType,
} from "./@types/kinora-sdk";
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
   * @param args.authedApolloClient - An authenticated Apollo client for interacting with the GraphQL API with Lens Protocol.
   * @param args.wallet - (Optional) A ethers wallet instance for authorizing transactions.
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
   * @param {Object} args - The details required for quest creation.
   * @param {string} args.questDetails - Title, cover, description and (optional) tags of the quest.
   * @param {number} args.maxPlayerCount - Maximum number of players for the quest.
   * @param {Milestone[]} args.milestones - Array of milestone objects for the quest.
   * @param {GatingLogic} args.joinQuestTokenGatedLogic - The token gated logic for joining the quest.
   * @param {ethers.Wallet} args.wallet - (Optional) The ethers wallet object of the quest envoker.
   * @param {boolean} args.approveRewardTokens - (Optional) For automating approval and whitelisting of currencies. Set this to true for terminal or node set up.
   * @throws Will throw an error if necessary data or setups are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing various contract addresses and other details relevant to the new quest.
   */
  instantiateNewQuest = async (args: {
    questDetails: {
      cover: `ipfs://${string}`;
      title: string;
      description: string;
      tags?: string[];
    };
    maxPlayerCount: number;
    milestones: Milestone[];
    joinQuestTokenGatedLogic: GatingLogic;
    wallet?: ethers.Wallet;
    approveRewardTokens?: boolean;
  }): Promise<{
    postId?: ZeroString;
    transactionHash?: ZeroString;
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

    if (!this.wallet && !args.wallet) {
      throw new Error(`Pass a valid Ethers wallet object.`);
    }

    if (args.wallet) {
      this.wallet = args.wallet;
    }

    if (
      args?.milestones?.some((milestone) => {
        milestone?.reward?.some((reward) => {
          if (reward?.type == RewardType.ERC20) {
            return (
              Number(reward?.erc20tokenAmount || 0) <= 0 ||
              reward?.erc20tokenAddress ||
              reward?.erc20tokenAddress?.trim() == "" ||
              reward?.erc20tokenAddress == "0x" ||
              reward.erc20tokenAddress !== "0x00"
            );
          }
        });
      })
    ) {
      throw new Error(
        "Invalid ERC20 Rewards. Make sure your addresses and amounts are correctly defined.",
      );
    }

    if (
      (args?.joinQuestTokenGatedLogic?.erc20Thresholds &&
        args?.joinQuestTokenGatedLogic?.erc20Addresses &&
        args?.joinQuestTokenGatedLogic?.erc20Thresholds?.length !==
          args?.joinQuestTokenGatedLogic?.erc20Addresses?.length) ||
      args?.joinQuestTokenGatedLogic?.erc20Thresholds?.some(
        (threshold) => Number(threshold || 0) <= 0,
      ) ||
      args?.joinQuestTokenGatedLogic?.erc20Addresses?.some(
        (address) => !address || address === "0x" || address === "0x00",
      )
    ) {
      throw new Error("Invalid Quest Join Gated Logic.");
    }

    if (
      args?.milestones?.some((milestone) => {
        const thresholds = milestone?.gated?.erc20Thresholds;
        const addresses = milestone?.gated?.erc20Addresses;

        const sizeMismatch =
          thresholds && addresses && thresholds.length !== addresses.length;

        const invalidValue =
          thresholds?.some((threshold) => Number(threshold || 0) <= 0) ||
          addresses?.some(
            (address) => !address || address === "0x" || address === "0x00",
          );

        const erc721Addresses =
          milestone?.gated?.erc721Addresses?.filter(Boolean);

        return (
          sizeMismatch ||
          invalidValue ||
          erc721Addresses?.length !==
            milestone?.gated?.erc721TokenIds?.length +
              milestone?.gated?.erc721TokenURIs?.length
        );
      })
    ) {
      throw new Error("Invalid Milestone Gated Logic.");
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
        appId: "kinora",
        id: uuidv4(),
        hideFromFeed: false,
        locale: "en",
        tags: [
          "kinora quest",
          "vision quest",
          ...(args?.questDetails?.tags || []),
        ],
      },
    };

    const hashedDetails = await hashToIPFS(JSON.stringify(data));

    if (hashedDetails.error) {
      throw new Error(`Error hashing content: ${hashedDetails.message}`);
    }

    try {
      const metadata = await validateMetadata({
        rawURI: hashedDetails.cid,
      });

      if (!metadata?.data?.validatePublicationMetadata.valid) {
        throw new Error(`Lens Metadata Verification Failed.`);
      }

      const milestoneDetails = await Promise.all(
        args?.milestones
          ?.sort((a, b) => a.milestone - b.milestone)
          ?.filter((v, i, a) => !i || v.milestone != a[i - 1].milestone)
          ?.map(async (milestone: Milestone) => {
            return {
              gated: {
                erc721TokenURIs: milestone.gated.erc721TokenURIs,
                erc721TokenIds: milestone.gated.erc721TokenIds,
                erc721Addresses: milestone.gated.erc721Addresses,
                erc20Addresses: milestone.gated.erc20Addresses,
                erc20Thresholds: milestone.gated.erc20Thresholds,
                oneOf: milestone.gated.oneOf,
              },
              rewards: await Promise.all(
                milestone?.reward?.map(async (reward) => {
                  if (
                    !IPFS_REGEX.test(reward.erc721URI as string) &&
                    reward.type === RewardType.ERC721
                  ) {
                    throw new Error(`Invalid ERC721 Reward URI Hash.`);
                  } else {
                    return {
                      rewardType: reward.type,
                      uri:
                        reward.type === RewardType.ERC721
                          ? reward.erc721URI
                          : "",
                      tokenAddress:
                        reward.type === RewardType.ERC721
                          ? ZERO_ADDRESS
                          : reward.erc20tokenAddress,
                      amount:
                        reward.type === RewardType.ERC721
                          ? "0"
                          : reward.erc20tokenAmount,
                    };
                  }
                }),
              ),
              videos: milestone.eligibility.internalCriteria?.map((item) => {
                return {
                  playerId: item?.playbackId,
                  videoBytes: item?.postId,
                  profileId: parseInt(item?.postId?.split("-")[0], 16),
                  pubId: parseInt(item?.postId?.split("-")[1], 16),
                  minPlayCount:
                    item.playbackCriteria.minPlayCount &&
                    item.playbackCriteria.minPlayCount > 0
                      ? item.playbackCriteria.minPlayCount
                      : 0,
                  minAVD:
                    item.playbackCriteria.minAvd &&
                    item.playbackCriteria.minAvd > 0
                      ? (
                          BigInt(item.playbackCriteria.minAvd) *
                          BigInt(10 ** 18)
                        ).toString()
                      : "0",
                  minDuration:
                    item.playbackCriteria.minDuration &&
                    item.playbackCriteria.minDuration > 0
                      ? (
                          BigInt(item.playbackCriteria.minDuration) *
                          BigInt(10 ** 18)
                        ).toString()
                      : "0",
                  minSecondaryQuoteOnQuote:
                    item.playbackCriteria.minSecondaryQuoteOnQuote &&
                    item.playbackCriteria.minSecondaryQuoteOnQuote > 0
                      ? item.playbackCriteria.minSecondaryQuoteOnQuote
                      : 0,
                  minSecondaryMirrorOnQuote:
                    item.playbackCriteria.minSecondaryMirrorOnQuote &&
                    item.playbackCriteria.minSecondaryMirrorOnQuote > 0
                      ? item.playbackCriteria.minSecondaryMirrorOnQuote
                      : 0,
                  minSecondaryReactOnQuote:
                    item.playbackCriteria.minSecondaryReactOnQuote &&
                    item.playbackCriteria.minSecondaryReactOnQuote > 0
                      ? item.playbackCriteria.minSecondaryReactOnQuote
                      : 0,
                  minSecondaryCommentOnQuote:
                    item.playbackCriteria.minSecondaryCommentOnQuote &&
                    item.playbackCriteria.minSecondaryCommentOnQuote > 0
                      ? item.playbackCriteria.minSecondaryCommentOnQuote
                      : 0,
                  minSecondaryCollectOnQuote:
                    item.playbackCriteria.minSecondaryCollectOnQuote &&
                    item.playbackCriteria.minSecondaryCollectOnQuote > 0
                      ? item.playbackCriteria.minSecondaryCollectOnQuote
                      : 0,
                  minSecondaryQuoteOnComment:
                    item.playbackCriteria.minSecondaryQuoteOnComment &&
                    item.playbackCriteria.minSecondaryQuoteOnComment > 0
                      ? item.playbackCriteria.minSecondaryQuoteOnComment
                      : 0,
                  minSecondaryMirrorOnComment:
                    item.playbackCriteria.minSecondaryMirrorOnComment &&
                    item.playbackCriteria.minSecondaryMirrorOnComment > 0
                      ? item.playbackCriteria.minSecondaryMirrorOnComment
                      : 0,
                  minSecondaryReactOnComment:
                    item.playbackCriteria.minSecondaryReactOnComment &&
                    item.playbackCriteria.minSecondaryReactOnComment > 0
                      ? item.playbackCriteria.minSecondaryReactOnComment
                      : 0,
                  minSecondaryCommentOnComment:
                    item.playbackCriteria.minSecondaryCommentOnComment &&
                    item.playbackCriteria.minSecondaryCommentOnComment > 0
                      ? item.playbackCriteria.minSecondaryCommentOnComment
                      : 0,
                  minSecondaryCollectOnComment:
                    item.playbackCriteria.minSecondaryCollectOnComment &&
                    item.playbackCriteria.minSecondaryCollectOnComment > 0
                      ? item.playbackCriteria.minSecondaryCollectOnComment
                      : 0,
                  quote: item.playbackCriteria.quote || false,
                  mirror: item.playbackCriteria.mirror || false,
                  comment: item.playbackCriteria.comment || false,
                  bookmark: item.playbackCriteria.bookmark || false,
                  react: item.playbackCriteria.react || false,
                };
              }),
              uri: (
                await hashToIPFS(
                  JSON.stringify({
                    title: milestone?.details?.title,
                    description: milestone?.details?.description,
                    cover: milestone?.details?.cover,
                  }),
                )
              ).cid,
              milestone: milestone.milestone,
            };
          }),
      );

      const moduleContract = new ethers.Contract(
        LENS_MODULE_CONTRACT,
        LensModuleAbi,
        args.wallet,
      );

      // approve data
      if (args.approveRewardTokens && milestoneDetails) {
        for (const item of milestoneDetails) {
          for (const reward of item.rewards || []) {
            if (reward.rewardType === RewardType.ERC20) {
              const registered = await moduleContract.isErc20CurrencyRegistered(
                reward.tokenAddress,
              );
              if (!registered) {
                let tx = await moduleContract.registerErc20Currency(
                  reward.tokenAddress,
                );
                await tx.wait();
                tx = await moduleContract.verifyErc20Currency(
                  reward.tokenAddress,
                );
                await tx.wait();
              }

              const erc20Contract = new ethers.Contract(
                reward.tokenAddress as string,
                [
                  {
                    inputs: [
                      {
                        internalType: "address",
                        name: "spender",
                        type: "address",
                      },
                      {
                        internalType: "uint256",
                        name: "amount",
                        type: "uint256",
                      },
                    ],
                    name: "approve",
                    outputs: [
                      {
                        internalType: "bool",
                        name: "",
                        type: "bool",
                      },
                    ],
                    stateMutability: "nonpayable",
                    type: "function",
                  },
                ],
                args.wallet,
              );

              const tx = await erc20Contract.approve(
                KINORA_ESCROW_CONTRACT,
                Number(reward.amount) * args.maxPlayerCount,
              );
              await tx.wait();
            }
          }
        }
      }

      let encodedData: string;
      try {
        encodedData = ethers.utils.defaultAbiCoder.encode(
          [
            "tuple(" +
              "tuple(tuple(string[][] erc721TokenURIs, uint256[][] erc721TokenIds, address[] erc721Addresses, address[] erc20Addresses, uint256[] erc20Thresholds, bool oneOf) gated, tuple(uint8 rewardType, string uri, address tokenAddress, uint256 amount)[] rewards, tuple(string playerId, string videoBytes, uint256 profileId, uint256 pubId, uint256 minPlayCount, uint256 minAVD, uint256 minDuration,  uint256 minSecondaryQuoteOnQuote, uint256 minSecondaryMirrorOnQuote, uint256 minSecondaryReactOnQuote, uint256 minSecondaryCommentOnQuote, uint256 minSecondaryCollectOnQuote, uint256 minSecondaryQuoteOnComment, uint256 minSecondaryMirrorOnComment, uint256 minSecondaryReactOnComment, uint256 minSecondaryCommentOnComment, uint256 minSecondaryCollectOnComment, bool quote, bool mirror, bool comment, bool bookmark, bool react)[] videos, string uri, uint256 milestone)[] milestones, " +
              "tuple(" +
              "string[][] erc721TokenURIs, " +
              "uint256[][] erc721TokenIds, " +
              "address[] erc721Addresses, " +
              "address[] erc20Addresses, " +
              "uint256[] erc20Thresholds, " +
              "bool oneOf" +
              ") gateLogic, " +
              " string uri, " +
              " address envokerAddress, " +
              "uint256 maxPlayerCount" +
              ")",
          ],
          [
            {
              milestones: milestoneDetails,
              gateLogic: {
                erc721TokenURIs: args.joinQuestTokenGatedLogic.erc721TokenURIs,
                erc721TokenIds: args.joinQuestTokenGatedLogic.erc721TokenIds,
                erc721Addresses: args.joinQuestTokenGatedLogic.erc721Addresses,
                erc20Addresses: args.joinQuestTokenGatedLogic.erc20Addresses,
                erc20Thresholds: args.joinQuestTokenGatedLogic.erc20Thresholds,
                oneOf: args.joinQuestTokenGatedLogic.oneOf,
              },
              uri: (await hashToIPFS(JSON.stringify(args.questDetails))).cid,
              envokerAddress: await (this.wallet?.getAddress() ||
                args.wallet?.getAddress()),
              maxPlayerCount: args.maxPlayerCount,
            },
          ],
        );
      } catch (err: any) {
        throw new Error(`There was an error encoding your data ${err.message}`);
      }

      const { data } = await onChainPost(
        {
          contentURI: hashedDetails.cid,
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

      const typedDataHash = ethers.utils._TypedDataEncoder.hash(
        omit(typedData?.domain, ["__typename"]),
        omit(typedData?.types, ["__typename"]),
        omit(typedData?.value, ["__typename"]),
      );
      await this.wallet?.signMessage(ethers.utils.arrayify(typedDataHash));

      if (!this.lensHubProxyContract) {
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
      let errorMessage = `Error minting Instantiating New Quest: ${err.message}`;
      const errorParts = err?.message?.split("error=");
      if (errorParts?.length > 1) {
        const data = errorParts[1]?.split('"data":"')?.[1]?.split('",')?.[0];

        if (data) {
          const friendlyError =
            ERROR_CODES[data as keyof typeof ERROR_CODES] ||
            "Unknown Solidity Error";
          errorMessage = `Error Instantiating New Quest: ${friendlyError}`;
        }
      }

      return {
        error: true,
        errorMessage,
      };
    }
  };

  /**
   * @method
   * @description Terminates a quest and triggers the withdrawal process for any remaining funds. Ensures necessary setups and data are present before proceeding.
   * @param {ZeroString} questId - The Quest Id.
   * @param {ethers.Wallet} wallet - (Optional) Ethereum wallet boject for signing the transaction.
   * @throws Will throw an error if necessary setups or data are missing.
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   */
  terminateQuestAndWithdraw = async (
    questId: number,
    wallet?: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      if (!this.kinoraEscrowContract && !wallet && !this.wallet) {
        throw new Error(`Pass a valid Ethers wallet object.`);
      }

      if (!this.wallet) {
        this.kinoraEscrowContract = new ethers.Contract(
          KINORA_ESCROW_CONTRACT,
          KinoraEscrowAbi,
          wallet,
        );
      }

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
   * @param playerProfileId - The Player's Lens profile Id.
   * @param eligible - The eligibility boolean.
   * @param wallet - (Optional)
   * @returns {Promise<Object>} - Promise resolving to an object containing transaction hashes for termination and withdrawal processes.
   *
   */
  setPlayerEligibleToClaimMilestone = async (
    questId: number,
    milestone: number,
    playerProfileId: string,
    eligible: boolean,
    wallet?: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      if (!this.kinoraMetricsContract && !wallet && !this.wallet) {
        throw new Error(`Pass a valid Ethers wallet object.`);
      }

      if (!this.wallet) {
        this.kinoraMetricsContract = new ethers.Contract(
          KINORA_METRICS_CONTRACT,
          KinoraMetricsAbi,
          wallet,
        );
      }

      const tx =
        await this.kinoraMetricsContract?.playerEligibleToClaimMilestone(
          questId,
          milestone,
          parseInt(playerProfileId, 16),
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
        errorMessage: `Error Verifying Player: ${err.message}`,
      };
    }
  };
}
