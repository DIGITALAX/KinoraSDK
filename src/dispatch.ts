import { ethers } from "ethers";
import {
  KINORA_OPEN_ACTION_CONTRACT,
  LENS_HUB_PROXY_CONTRACT,
} from "./constants/index";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { omit } from "lodash";
import { act } from "./graphql/mutations/actOn";
import LensHubProxyAbi from "./abis/LensHubProxy.json";
import {
  MilestoneEligibilityCriteria,
  PlayerVideoActivity,
  ZeroString,
} from "./@types/kinora-sdk";
import { getMilestoneVideos } from "./graphql/queries/getMilestoneVideos";
import { getPlayerVideoData } from "./graphql/queries/getPlayerVideoData";

export class Dispatch {
  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Lens Hub Proxy contract.
   */
  private lensHubProxyContract: ethers.Contract | undefined;

  /**
   * @constructor
   * @param {ApolloClient<NormalizedCacheObject>} [args.playerAuthedApolloClient] - Authenticated Apollo client for the player
   */
  constructor(args: {
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  }) {
    this.playerAuthedApolloClient = args.playerAuthedApolloClient;
  }

  /**
   * @method
   * @description Allows a player to join a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} postId - The Lens Pub Id of the quest.
   * @param {ethers.Wallet} wallet - The Player's wallet for signing and broadcasting the tx.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerJoinQuest = async (
    postId: ZeroString,
    wallet: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }
    try {
      this.lensHubProxyContract = new ethers.Contract(
        LENS_HUB_PROXY_CONTRACT,
        LensHubProxyAbi,
        wallet,
      );

      const { data } = await act(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: "0x00",
            },
          },
          for: postId,
        },
        this.playerAuthedApolloClient,
      );

      const typedData = data?.createActOnOpenActionTypedData.typedData;

      const typedDataHash = ethers.utils._TypedDataEncoder.hash(
        omit(typedData?.domain, ["__typename"]),
        omit(typedData?.types, ["__typename"]),
        omit(typedData?.value, ["__typename"]),
      );
      await wallet?.signMessage(ethers.utils.arrayify(typedDataHash));
      const tx = await this.lensHubProxyContract.act({
        publicationActedProfileId: parseInt(
          typedData?.value.publicationActedProfileId,
          16,
        ),
        publicationActedId: parseInt(typedData?.value.publicationActedId, 16),
        actorProfileId: parseInt(typedData?.value.actorProfileId, 16),
        referrerProfileIds: typedData?.value.referrerProfileIds,
        referrerPubIds: typedData?.value.referrerPubIds,
        actionModuleAddress: typedData?.value.actionModuleAddress,
        actionModuleData: typedData?.value.actionModuleData,
      });

      const txHash = await tx.wait();

      return {
        txHash: txHash,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error Player joining new Quest: ${err.message}`,
      };
    }
  };

  /**
   * @method
   * @description Player to complete Milestone and claim associated rewards. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} postId - The Lens Pub Id of the quest.
   * @param {ethers.Wallet} wallet - The Player's wallet for signing and broadcasting the tx.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerCompleteQuestMilestone = async (
    postId: ZeroString,
    wallet: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }

    try {
      const { data } = await act(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: "0x00",
            },
          },
          for: postId,
        },
        this.playerAuthedApolloClient,
      );

      const typedData = data?.createActOnOpenActionTypedData?.typedData;

      const typedDataHash = ethers.utils._TypedDataEncoder.hash(
        omit(typedData?.domain, ["__typename"]),
        omit(typedData?.types, ["__typename"]),
        omit(typedData?.value, ["__typename"]),
      );
      await wallet?.signMessage(ethers.utils.arrayify(typedDataHash));

      this.lensHubProxyContract = new ethers.Contract(
        LENS_HUB_PROXY_CONTRACT,
        LensHubProxyAbi,
        wallet,
      );

      const tx = await this.lensHubProxyContract?.act({
        publicationActedProfileId: parseInt(
          typedData?.value.publicationActedProfileId,
          16,
        ),
        publicationActedId: parseInt(typedData?.value.publicationActedId, 16),
        actorProfileId: parseInt(typedData?.value.actorProfileId, 16),
        referrerProfileIds: typedData?.value.referrerProfileIds,
        referrerPubIds: typedData?.value.referrerPubIds,
        actionModuleAddress: typedData?.value.actionModuleAddress,
        actionModuleData: typedData?.value.actionModuleData,
      });

      const txHash = await tx.wait();

      return {
        txHash: txHash,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error completing player Milestone: ${err.message}`,
      };
    }
  };

  /**
   * Asynchronously checks the eligibility of a player for a specific milestone in a quest.
   *
   * @param playerProfileId - Lens Profile ID of the player as a ZeroString.
   * @param questId - Numeric ID of the quest.
   * @param milestone - Numeric ID of the milestone within the quest.
   * @returns A Promise resolving to an object containing eligibility status, lists of completed
   *          and remaining video activities for the milestone, error status, and an optional error message.
   * @throws Error with a detailed message if there's an issue fetching milestone data or processing eligibility.
   */
  playerMilestoneEligibilityCheck = async (
    playerProfileId: ZeroString,
    questId: number,
    milestone: number,
  ): Promise<{
    eligible?: boolean;
    completed?: PlayerVideoActivity[];
    toComplete?: PlayerVideoActivity[];
    error: boolean;
    errorMessage?: string;
  }> => {
    try {
      let completed: PlayerVideoActivity[] = [],
        toComplete: PlayerVideoActivity[] = [];

      const milestoneData = await getMilestoneVideos(questId, milestone);

      if (
        !milestoneData?.data?.milestones?.[0]?.videos ||
        (milestoneData?.data?.milestones?.[0]?.videos &&
          milestoneData?.data?.milestones?.[0]?.videos?.length < 1)
      ) {
        throw new Error(
          `Error fetching data. Ensure the correct milestone, quest Id and player profile Id are provided.`,
        );
      }

      const milestonePromises =
        milestoneData?.data?.milestones?.[0]?.videos?.map(
          async (
            video: MilestoneEligibilityCriteria & {
              pubId: string;
              profileId: string;
            },
          ) => {
            let currentCompleteVideo = {},
              currentToCompleteVideo = {};
            const playerData = await getPlayerVideoData(
              Number(video?.pubId),
              Number(video?.profileId),
              parseInt(playerProfileId, 16),
            );

            const allVideoData: PlayerVideoActivity =
              playerData?.data?.videoActivities?.[0];

            if (Number(allVideoData.avd || 0) < Number(video.minAvd || 0)) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                avd: allVideoData.avd,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                avd: allVideoData.avd,
              };
            }

            if (
              Number(allVideoData.playCount || 0) <
              Number(video.minPlayCount || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                playCount: allVideoData.playCount,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                playCount: allVideoData.playCount,
              };
            }

            if (
              Number(allVideoData.duration || 0) <
              Number(video.minDuration || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                duration: allVideoData.duration,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                duration: allVideoData.duration,
              };
            }

            if (
              Number(allVideoData.secondaryQuoteOnQuote || 0) <
              Number(video.minSecondaryQuoteOnQuote || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryQuoteOnQuote: allVideoData.secondaryQuoteOnQuote,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryQuoteOnQuote: allVideoData.secondaryQuoteOnQuote,
              };
            }
            if (
              Number(allVideoData.secondaryMirrorOnQuote || 0) <
              Number(video.minSecondaryMirrorOnQuote || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryMirrorOnQuote: allVideoData.secondaryMirrorOnQuote,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryMirrorOnQuote: allVideoData.secondaryMirrorOnQuote,
              };
            }

            if (
              Number(allVideoData.secondaryReactOnQuote || 0) <
              Number(video.minSecondaryReactOnQuote || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryReactOnQuote: allVideoData.secondaryReactOnQuote,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryReactOnQuote: allVideoData.secondaryReactOnQuote,
              };
            }

            if (
              Number(allVideoData.secondaryCommentOnQuote || 0) <
              Number(video.minSecondaryCommentOnQuote || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryCommentOnQuote: allVideoData.secondaryCommentOnQuote,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryCommentOnQuote: allVideoData.secondaryCommentOnQuote,
              };
            }
            if (
              Number(allVideoData.secondaryCollectOnQuote || 0) <
              Number(video.minSecondaryCollectOnQuote || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryCollectOnQuote: allVideoData.secondaryCollectOnQuote,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryCollectOnQuote: allVideoData.secondaryCollectOnQuote,
              };
            }

            if (
              Number(allVideoData.secondaryQuoteOnComment || 0) <
              Number(video.minSecondaryQuoteOnComment || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryQuoteOnComment: allVideoData.secondaryQuoteOnComment,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryQuoteOnComment: allVideoData.secondaryQuoteOnComment,
              };
            }
            if (
              Number(allVideoData.secondaryMirrorOnComment || 0) <
              Number(video.minSecondaryMirrorOnComment || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryMirrorOnComment: allVideoData.secondaryMirrorOnComment,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryMirrorOnComment: allVideoData.secondaryMirrorOnComment,
              };
            }

            if (
              Number(allVideoData.secondaryReactOnComment || 0) <
              Number(video.minSecondaryReactOnComment || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryReactOnComment: allVideoData.secondaryReactOnComment,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryReactOnComment: allVideoData.secondaryReactOnComment,
              };
            }

            if (
              Number(allVideoData.secondaryCommentOnComment || 0) <
              Number(video.minSecondaryCommentOnComment || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryCommentOnComment:
                  allVideoData.secondaryCommentOnComment,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryCommentOnComment:
                  allVideoData.secondaryCommentOnComment,
              };
            }

            if (
              Number(allVideoData.secondaryCollectOnComment || 0) <
              Number(video.minSecondaryCollectOnComment || 0)
            ) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                secondaryCollectOnComment:
                  allVideoData.secondaryCollectOnComment,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                secondaryCollectOnComment:
                  allVideoData.secondaryCollectOnComment,
              };
            }

            if (video.bookmark && !allVideoData.hasBookmarked) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                hasBookmarked: allVideoData.hasBookmarked,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                hasBookmarked: allVideoData.hasBookmarked,
              };
            }

            if (video.comment && !allVideoData.hasCommented) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                hasCommented: allVideoData.hasCommented,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                hasCommented: allVideoData.hasCommented,
              };
            }

            if (video.quote && !allVideoData.hasQuoted) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                hasQuoted: allVideoData.hasQuoted,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                hasQuoted: allVideoData.hasQuoted,
              };
            }

            if (video.react && !allVideoData.hasReacted) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                hasReacted: allVideoData.hasReacted,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                hasReacted: allVideoData.hasReacted,
              };
            }

            if (video.mirror && !allVideoData.hasMirrored) {
              currentToCompleteVideo = {
                ...currentToCompleteVideo,
                hasMirrored: allVideoData.hasMirrored,
              };
            } else {
              currentCompleteVideo = {
                ...currentCompleteVideo,
                hasMirrored: allVideoData.hasMirrored,
              };
            }

            completed.push(currentCompleteVideo as PlayerVideoActivity);
            toComplete.push(currentToCompleteVideo as PlayerVideoActivity);
          },
        );

      await Promise.all(milestonePromises);

      return {
        eligible: completed?.every(
          (obj) =>
            Object.keys(obj).length === 18 &&
            Object.values(obj).every((item) => item !== undefined),
        ),
        completed: completed?.filter((obj) =>
          Object.values(obj).every((value) => value !== undefined),
        ),
        toComplete: toComplete?.filter((obj) =>
          Object.values(obj).every((value) => value !== undefined),
        ),
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error checking player milestone eligibility: ${err.message}`,
      };
    }
  };
}
