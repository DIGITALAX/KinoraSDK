import { ethers } from "ethers";
import { KINORA_OPEN_ACTION_CONTRACT } from "./constants/index";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  MilestoneEligibilityCriteria,
  PlayerVideoActivity,
  ZeroString,
} from "./@types/kinora-sdk";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import KinoraOpenActionAbi from "./abis/KinoraOpenAction.json";
import KinoraAccesControlAbi from "./abis/KinoraAccesControl.json";
import { getMilestoneVideos } from "./graphql/queries/getMilestoneVideos";
import { getPlayerVideoData } from "./graphql/queries/getPlayerVideoData";
import { act } from "./graphql/mutations/actOn";
import {
  SelfFundedTransactionRequest,
  SponsoredTransactionRequest,
} from "@lens-protocol/client";

export class Dispatch {
  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

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
   * @param {number} postId - The Lens Pub Id of the quest.
   * @param {ethers.Wallet} wallet - The Player's wallet for signing and broadcasting the tx.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerJoinQuest = async (
    postId: string,
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
      const data = await act(
        {
          action: {
            unknown: {
              address: KINORA_OPEN_ACTION_CONTRACT,
            },
          },
          post: postId,
        },
        this.playerAuthedApolloClient,
      );

      const raw = (
        data as SponsoredTransactionRequest | SelfFundedTransactionRequest
      )?.raw;
      const tx = {
        chainId: raw?.chainId,
        from: raw?.from,
        to: raw?.to,
        nonce: raw?.nonce,
        gasLimit: raw?.gasLimit,
        maxFeePerGas: raw?.maxFeePerGas,
        maxPriorityFeePerGas: raw?.maxPriorityFeePerGas,
        value: raw?.value,
        data: raw?.data,
      };
      const txResponse = await wallet.sendTransaction(tx);

      const txHash = await txResponse.wait();
      return {
        txHash: txHash?.transactionHash,
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
    postId: string,
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
      const data = await act(
        {
          action: {
            unknown: {
              address: KINORA_OPEN_ACTION_CONTRACT,
            },
          },
          post: postId,
        },
        this.playerAuthedApolloClient,
      );

      const raw = (
        data as SponsoredTransactionRequest | SelfFundedTransactionRequest
      )?.raw;

      const tx = {
        chainId: raw?.chainId,
        from: raw?.from,
        to: raw?.to,
        nonce: raw?.nonce,
        gasLimit: raw?.gasLimit,
        maxFeePerGas: raw?.maxFeePerGas,
        maxPriorityFeePerGas: raw?.maxPriorityFeePerGas,
        value: raw?.value,
        data: raw?.data,
      };
      const txResponse = await wallet.sendTransaction(tx);

      const txHash = await txResponse.wait();

      return {
        txHash: txHash?.transactionHash,
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
   * @param playerProfile - Lens Profile Address of the player as a ZeroString.
   * @param questId - Numeric ID of the quest.
   * @param milestone - Numeric ID of the milestone within the quest.
   * @param kinoraQuestDataAddress - Instantiated Quest Data contract address.
   * @returns A Promise resolving to an object containing eligibility status, lists of completed
   *          and remaining video activities for the milestone, error status, and an optional error message.
   * @throws Error with a detailed message if there's an issue fetching milestone data or processing eligibility.
   */
  playerMilestoneEligibilityCheck = async (
    playerProfile: ZeroString,
    questId: number,
    milestone: number,
    kinoraQuestDataAddress: ZeroString,
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

      const milestoneData = await getMilestoneVideos(
        questId,
        kinoraQuestDataAddress,
      );

      if (
        !milestoneData?.data?.milestones?.[milestone - 1]?.videos ||
        (milestoneData?.data?.milestones?.[milestone - 1]?.videos &&
          milestoneData?.data?.milestones?.[milestone - 1]?.videos?.length < 1)
      ) {
        throw new Error(
          `Error fetching data. Ensure the correct milestone, quest Id and player profile Id are provided.`,
        );
      }

      const kinoraOpenAccessContract = new ethers.Contract(
        KINORA_OPEN_ACTION_CONTRACT,
        KinoraOpenActionAbi,
        new ethers.providers.JsonRpcProvider(
          "https://rpc.lens.xyz",
        ),
      );

      const milestonePromises = milestoneData?.data?.milestones?.[
        milestone - 1
      ]?.videos?.map(
        async (
          video: MilestoneEligibilityCriteria & {
            postId: string;
            factoryIds: string[];
          },
        ) => {
          const playerData = await getPlayerVideoData(
            video?.postId,
            playerProfile,
            kinoraQuestDataAddress,
          );
          const allVideoData: PlayerVideoActivity =
            playerData?.data?.videoActivities?.[0];

          if (video?.factoryIds?.length > 1) {
            this.checkGlobalMetrics(
              video?.factoryIds?.map((item) => Number(item)),
              kinoraQuestDataAddress,
              kinoraOpenAccessContract,
              video?.postId,
              playerProfile,
              video,
              completed,
              toComplete,
            );
          } else {
            this.checkLocalMetrics(allVideoData, video, completed, toComplete);
          }
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

  private async checkGlobalMetrics(
    factoryIds: number[],
    kinoraQuestDataAddress: ZeroString,
    kinoraOpenAccessContract: ethers.Contract,
    videoPostId: string,
    playerProfile: ZeroString,
    video: MilestoneEligibilityCriteria & {
      postId: string;
      factoryIds: string[];
    },
    completed: PlayerVideoActivity[],
    toComplete: PlayerVideoActivity[],
  ) {
    let metrics: PlayerVideoActivity = {
      secondaryCollectOnComment: 0,
      secondaryCollectOnQuote: 0,
      secondaryCommentOnQuote: 0,
      secondaryCommentOnComment: 0,
      secondaryMirrorOnComment: 0,
      secondaryMirrorOnQuote: 0,
      secondaryQuoteOnComment: 0,
      secondaryQuoteOnQuote: 0,
      secondaryReactOnQuote: 0,
      secondaryReactOnComment: 0,
      hasReacted: false,
      hasQuoted: false,
      hasMirrored: false,
      hasCommented: false,
      hasBookmarked: false,
      duration: 0,
      avd: 0,
      playCount: 0,
    };

    for (let i = 0; i <= factoryIds.length; i++) {
      let kinoraQuestDataContract: ethers.Contract;

      if (i == factoryIds.length) {
        kinoraQuestDataContract = new ethers.Contract(
          kinoraQuestDataAddress,
          KinoraQuestDataAbi,
          new ethers.providers.JsonRpcProvider(
            "https://rpc.lens.xyz",
          ),
        );
      } else {
        const kinoraAccessControl = new ethers.Contract(
          await kinoraOpenAccessContract.getContractFactoryMap(factoryIds[i]),
          KinoraAccesControlAbi,
          new ethers.providers.JsonRpcProvider(
            "https://rpc.lens.xyz",
          ),
        );

        const kqd = await kinoraAccessControl.getKinoraQuestData();
        kinoraQuestDataContract = new ethers.Contract(
          kqd,
          KinoraQuestDataAbi,
          new ethers.providers.JsonRpcProvider(
            "https://rpc.lens.xyz",
          ),
        );
      }

      metrics.avd += kinoraQuestDataContract.getPlayerVideoAVD(
        playerProfile,
        videoPostId,
      );
      metrics.playCount += kinoraQuestDataContract.getPlayerVideoPlayCount(
        playerProfile,
        videoPostId,
      );
      metrics.secondaryQuoteOnQuote +=
        kinoraQuestDataContract.getPlayerVideoSecondaryQuoteOnQuote(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryMirrorOnQuote +=
        kinoraQuestDataContract.getPlayerVideoSecondaryMirrorOnQuote(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryReactOnQuote +=
        kinoraQuestDataContract.getPlayerVideoSecondaryReactOnQuote(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryCommentOnQuote +=
        kinoraQuestDataContract.getPlayerVideoSecondaryCommentOnQuote(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryCollectOnQuote +=
        kinoraQuestDataContract.getPlayerVideoSecondaryCollectOnQuote(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryQuoteOnComment +=
        kinoraQuestDataContract.getPlayerVideoSecondaryQuoteOnComment(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryMirrorOnComment +=
        kinoraQuestDataContract.getPlayerVideoSecondaryMirrorOnComment(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryReactOnComment +=
        kinoraQuestDataContract.getPlayerVideoSecondaryReactOnComment(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryCommentOnComment +=
        kinoraQuestDataContract.getPlayerVideoSecondaryCommentOnComment(
          playerProfile,
          videoPostId,
        );
      metrics.secondaryCollectOnComment +=
        kinoraQuestDataContract.getPlayerVideoSecondaryCollectOnComment(
          playerProfile,
          videoPostId,
        );
      metrics.duration += kinoraQuestDataContract.getPlayerVideoDuration(
        playerProfile,
        videoPostId,
      );

      if (!metrics.hasQuoted) {
        metrics.hasQuoted = kinoraQuestDataContract.getPlayerVideoQuote(
          playerProfile,
          videoPostId,
        );
      }

      if (!metrics.hasReacted) {
        metrics.hasReacted = kinoraQuestDataContract.getPlayerVideoReact(
          playerProfile,
          videoPostId,
        );
      }

      if (!metrics.hasBookmarked) {
        metrics.hasBookmarked = kinoraQuestDataContract.getPlayerVideoBookmark(
          playerProfile,
          videoPostId,
        );
      }

      if (!metrics.hasCommented) {
        metrics.hasCommented = kinoraQuestDataContract.getPlayerVideoComment(
          playerProfile,
          videoPostId,
        );
      }

      if (!metrics.hasMirrored) {
        metrics.hasMirrored = kinoraQuestDataContract.getPlayerVideoMirror(
          playerProfile,
          videoPostId,
        );
      }
    }

    this.checkLocalMetrics(metrics, video, completed, toComplete);
  }

  private async checkLocalMetrics(
    allVideoData: PlayerVideoActivity,
    video: MilestoneEligibilityCriteria & {
      postId: string;
      factoryIds: string[];
    },
    completed: PlayerVideoActivity[],
    toComplete: PlayerVideoActivity[],
  ) {
    let currentCompleteVideo = {},
      currentToCompleteVideo = {};

    if (Number(allVideoData?.avd || 0) < Number(video?.minAvd || 0)) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        avd: allVideoData?.avd,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        avd: allVideoData?.avd,
      };
    }

    if (
      Number(allVideoData?.playCount || 0) < Number(video?.minPlayCount || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        playCount: allVideoData?.playCount,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        playCount: allVideoData?.playCount,
      };
    }

    if (Number(allVideoData?.duration || 0) < Number(video?.minDuration || 0)) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        duration: allVideoData?.duration,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        duration: allVideoData?.duration,
      };
    }

    if (
      Number(allVideoData?.secondaryQuoteOnQuote || 0) <
      Number(video?.minSecondaryQuoteOnQuote || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryQuoteOnQuote: allVideoData?.secondaryQuoteOnQuote,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryQuoteOnQuote: allVideoData?.secondaryQuoteOnQuote,
      };
    }
    if (
      Number(allVideoData?.secondaryMirrorOnQuote || 0) <
      Number(video?.minSecondaryMirrorOnQuote || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryMirrorOnQuote: allVideoData?.secondaryMirrorOnQuote,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryMirrorOnQuote: allVideoData?.secondaryMirrorOnQuote,
      };
    }

    if (
      Number(allVideoData?.secondaryReactOnQuote || 0) <
      Number(video?.minSecondaryReactOnQuote || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryReactOnQuote: allVideoData?.secondaryReactOnQuote,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryReactOnQuote: allVideoData?.secondaryReactOnQuote,
      };
    }

    if (
      Number(allVideoData?.secondaryCommentOnQuote || 0) <
      Number(video?.minSecondaryCommentOnQuote || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryCommentOnQuote: allVideoData?.secondaryCommentOnQuote,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryCommentOnQuote: allVideoData?.secondaryCommentOnQuote,
      };
    }
    if (
      Number(allVideoData?.secondaryCollectOnQuote || 0) <
      Number(video?.minSecondaryCollectOnQuote || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryCollectOnQuote: allVideoData?.secondaryCollectOnQuote,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryCollectOnQuote: allVideoData?.secondaryCollectOnQuote,
      };
    }

    if (
      Number(allVideoData?.secondaryQuoteOnComment || 0) <
      Number(video?.minSecondaryQuoteOnComment || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryQuoteOnComment: allVideoData?.secondaryQuoteOnComment,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryQuoteOnComment: allVideoData?.secondaryQuoteOnComment,
      };
    }
    if (
      Number(allVideoData?.secondaryMirrorOnComment || 0) <
      Number(video?.minSecondaryMirrorOnComment || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryMirrorOnComment: allVideoData?.secondaryMirrorOnComment,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryMirrorOnComment: allVideoData?.secondaryMirrorOnComment,
      };
    }

    if (
      Number(allVideoData?.secondaryReactOnComment || 0) <
      Number(video?.minSecondaryReactOnComment || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryReactOnComment: allVideoData?.secondaryReactOnComment,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryReactOnComment: allVideoData?.secondaryReactOnComment,
      };
    }

    if (
      Number(allVideoData?.secondaryCommentOnComment || 0) <
      Number(video?.minSecondaryCommentOnComment || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryCommentOnComment: allVideoData?.secondaryCommentOnComment,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryCommentOnComment: allVideoData?.secondaryCommentOnComment,
      };
    }

    if (
      Number(allVideoData?.secondaryCollectOnComment || 0) <
      Number(video?.minSecondaryCollectOnComment || 0)
    ) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        secondaryCollectOnComment: allVideoData?.secondaryCollectOnComment,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        secondaryCollectOnComment: allVideoData?.secondaryCollectOnComment,
      };
    }

    if (video?.bookmark && !allVideoData?.hasBookmarked) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        hasBookmarked: allVideoData?.hasBookmarked,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        hasBookmarked: allVideoData?.hasBookmarked,
      };
    }

    if (video?.comment && !allVideoData?.hasCommented) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        hasCommented: allVideoData?.hasCommented,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        hasCommented: allVideoData?.hasCommented,
      };
    }

    if (video?.quote && !allVideoData?.hasQuoted) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        hasQuoted: allVideoData?.hasQuoted,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        hasQuoted: allVideoData?.hasQuoted,
      };
    }

    if (video?.react && !allVideoData?.hasReacted) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        hasReacted: allVideoData?.hasReacted,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        hasReacted: allVideoData?.hasReacted,
      };
    }

    if (video?.mirror && !allVideoData?.hasMirrored) {
      currentToCompleteVideo = {
        ...currentToCompleteVideo,
        hasMirrored: allVideoData?.hasMirrored,
      };
    } else {
      currentCompleteVideo = {
        ...currentCompleteVideo,
        hasMirrored: allVideoData?.hasMirrored,
      };
    }

    completed.push(currentCompleteVideo as PlayerVideoActivity);
    toComplete.push(currentToCompleteVideo as PlayerVideoActivity);
  }
}
