import { ethers } from "ethers";
import { PlayerVideoActivity, ZeroString } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import { KINORA_QUEST_DATA_CONTRACT } from "./constants";
import {
  getActivityByPlayerId,
  getActivityByPostId,
  getCompletedMilestones,
  getCompletedQuests,
  getDetailsOfPlayer,
  getJoinedQuests,
  getPlaybackIdQuests,
  getPlayersByQuest,
  getQuestEnvoker,
  getQuests,
  getVideoIdQuests,
  getVideoMetricActivity,
  getVideoMetrics,
} from "./graphql/queries/getPlayer";
import toHex from "./utils/toHex";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

  /**
   * Constructs a new instance of the Kinora SDK with the provided configuration.
   */
  private constructor(
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
  ) {
    this.sequence = new Sequence(playerAuthedApolloClient);
  }

  /**
   * Provides access to the singleton instance of Kinora, creating it if necessary.
   *
   * @returns The singleton instance of Kinora.
   */
  static getInstance(
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
  ): Kinora {
    if (!Kinora.instance) {
      Kinora.instance = new Kinora(playerAuthedApolloClient);
    }
    return Kinora.instance;
  }

  /**
   * @method livepeerAdd
   * @description Initializes a Livepeer video player with given playback Id and associates event handlers to the video element.
   *
   * @param postId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   */
  livepeerAdd = (postId: ZeroString, videoElement: HTMLVideoElement): void => {
    this.sequence.initializePlayer(postId, videoElement);
  };

  /**
   * @method playbackId
   * @description Destroys a Livepeer player with given post Id, cleaning up event listeners and removing video data.
   *
   * @param postId - A string representing the video post Id.
   */
  livepeerDestroy(postId: ZeroString): void {
    this.sequence.destroyPlayer(postId);
  }

  /**
   * @method setPlayerMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain.
   * @param {ZeroString} args.postId - The Lens Post Id of the video.
   * @param {ZeroString} args.playerProfileId - The Lens Profile Id of the Player.
   * @param {ethers.Wallet} args.wallet - The Player's wallet object for signing the metrics on-chain.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  public async sendPlayerMetricsOnChain(
    postId: ZeroString,
    playerProfileId: ZeroString,
    wallet: ethers.Wallet,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    txHash?: string;
  }> {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return await this.sequence.sendMetricsOnChain(
      postId,
      playerProfileId,
      wallet,
    );
  }

  /**
   * Retrieves live video metrics for a given publication.
   *
   * @param pubId - Lens Profile ID of the publication in the format `0x${string}`.
   * @returns An object containing various metrics: play count, average view duration (avd),
   *          video duration, most replayed area (as a Map of time segments to count),
   *          and total interactions count.
   * @throws Error if the Kinora Provider is not set in the root of the application.
   */
  public getLiveVideoMetrics(pubId: ZeroString): {
    playCount: number;
    avd: number;
    duration: number;
    mostReplayedArea: Map<number, number>;
    totalInteractions: number;
  } {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return this.sequence.getLivePlayerVideoMetrics(pubId);
  }

  /**
   * Asynchronously fetches secondary data related to a player's video post.
   *
   * @param playerProfileId - Lens Profile ID of the player in the format `0x${string}`.
   * @param postId - Lens Post ID of the post in the format `0x${string}`.
   * @returns A Promise resolving to an object containing boolean status for error,
   *          optional error message, and various secondary interaction counts
   *          (quote, mirror, react, comment, collect) on quotes and comments.
   */
  public async getPlayerVideoSecondaryData(
    playerProfileId: ZeroString,
    postId: ZeroString,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    secondaryQuoteOnQuote?: number;
    secondaryMirrorOnQuote?: number;
    secondaryReactOnQuote?: number;
    secondaryCommentOnQuote?: number;
    secondaryCollectOnQuote?: number;
    secondaryQuoteOnComment?: number;
    secondaryMirrorOnComment?: number;
    secondaryReactOnComment?: number;
    secondaryCommentOnComment?: number;
    secondaryCollectOnComment?: number;
  }> {
    return await this.sequence.secondaryData(playerProfileId, postId);
  }

  /**
   * Asynchronously retrieves the quest ID associated with a given publication.
   *
   * @param postId - Lens Post ID of the post in the format `0x${string}`.
   * @returns A Promise resolving to an object containing boolean status for error,
   *          optional quest ID, and an optional error message.
   * @throws Any errors encountered during the process are caught and returned with their message.
   */
  public async getQuestIdFromPublication(postId: ZeroString): Promise<{
    error: boolean;
    questId?: number;
    errorMessage?: string;
  }> {
    try {
      const kinoraQuestData = new ethers.Contract(
        KINORA_QUEST_DATA_CONTRACT,
        KinoraQuestDataAbi,
      );

      const questId = await kinoraQuestData.getQuestIdFromLensData(
        parseInt(postId?.split("-")?.[0], 16),
        parseInt(postId?.split("-")?.[1], 16),
      );
      return {
        error: false,
        questId: Number(questId),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously fetches a list of quests completed by a player.
   *
   * @param playerProfileId - Lens Profile ID of the player as a `0x${string}`.
   * @param questId - Numeric ID of the quest.
   * @returns A Promise resolving to an object containing boolean status for error,
   *          optional error message, and an array of completed quests with their details.
   * @throws Any errors encountered during the process are caught and returned with their message.
   */
  public async getPlayerCompletedQuests(
    playerProfileId: ZeroString,
    questId: number,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: {
      questId: string;
      playerProfileId: string;
      blockTimestamp: string;
    }[];
  }> {
    try {
      const data = await getCompletedQuests(
        parseInt(playerProfileId, 16),
        questId,
      );

      return {
        error: false,
        quests: data?.data?.questCompleteds,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves the quests a player has joined.
   *
   * @param playerProfileId - Lens Profile ID of the player as a `0x${string}`.
   * @returns A Promise resolving to an object containing a boolean error status, optional error message,
   *          and an array of quest IDs the player has joined.
   */
  public async getPlayerJoinedQuests(playerProfileId: ZeroString): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: string[];
  }> {
    try {
      const data = await getJoinedQuests(parseInt(playerProfileId, 16));

      return {
        error: false,
        quests: data?.data?.players?.[0]?.questsJoined,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously fetches the milestones completed by a player in a specific quest.
   *
   * @param playerProfileId - Lens Profile ID of the player as a `0x${string}`.
   * @param questId - Numeric ID of the quest.
   * @returns A Promise resolving to an object detailing any errors, optional error message,
   *          and an array of milestone numbers completed in the quest.
   */
  public async getPlayerQuestMilestonesCompleted(
    playerProfileId: ZeroString,
    questId: number,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    milestones?: number[];
  }> {
    try {
      const data = await getCompletedMilestones(
        parseInt(playerProfileId, 16),
        questId,
      );

      return {
        error: false,
        milestones: Array.from(
          { length: Number(data?.data?.milestoneCompleteds?.[0]?.milestone) },
          (_, i) => Number(data?.data?.milestoneCompleteds?.[0]?.milestone) - i,
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously gathers metric activity data for a player's video.
   *
   * @param playerProfileId - Lens Profile ID of the player as a `0x${string}`.
   * @returns A Promise resolving to an object containing error status, optional error message,
   *          and an array of video metric activities (including interactions and engagement metrics).
   */
  public async getPlayerVideoMetricActivity(
    playerProfileId: ZeroString,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    videoMetrics?: (PlayerVideoActivity & {
      playerProfileId: ZeroString;
      profileId: ZeroString;
      pubId: ZeroString;
    })[];
  }> {
    try {
      const data = await getVideoMetricActivity(parseInt(playerProfileId, 16));

      return {
        error: false,
        videoMetrics: data?.data?.players?.[0]?.videoActivities?.map(
          (video: {
            playerProfileId: string;
            profileId: string;
            pubId: string;
            secondaryReactOnQuote: string;
            secondaryReactOnComment: string;
            secondaryQuoteOnQuote: string;
            secondaryQuoteOnComment: string;
            secondaryMirrorOnComment: string;
            secondaryMirrorOnQuote: string;
            secondaryCommentOnQuote: string;
            secondaryCommentOnComment: string;
            secondaryCollectOnQuote: string;
            secondaryCollectOnComment: string;
            avd: string;
            duration: string;
            playCount: string;
          }) => ({
            ...video,
            playerProfileId: toHex(Number(video?.playerProfileId)),
            profileId: toHex(Number(video?.profileId)),
            pubId: toHex(Number(video?.pubId)),
            secondaryReactOnQuote: Number(video?.secondaryReactOnQuote),
            minSecondaryReactOnComment: Number(video?.secondaryReactOnComment),
            secondaryQuoteOnQuote: Number(video?.secondaryQuoteOnQuote),
            secondaryQuoteOnComment: Number(video?.secondaryQuoteOnComment),
            secondaryMirrorOnComment: Number(video?.secondaryMirrorOnComment),
            secondaryMirrorOnQuote: Number(video?.secondaryMirrorOnQuote),
            secondaryCommentOnQuote: Number(video?.secondaryCommentOnQuote),
            secondaryCommentOnComment: Number(video?.secondaryCommentOnComment),
            secondaryCollectOnQuote: Number(video?.secondaryCollectOnQuote),
            secondaryCollectOnComment: Number(video?.secondaryCollectOnComment),
            avd: Number(video?.avd) / 10 ** 18,
            duration: Number(video?.duration) / 10 ** 18,
            playCount: Number(video?.playCount),
          }),
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves detailed information about a player, including video activities, quests joined, and milestones completed.
   *
   * @param playerProfileId - Lens Profile ID of the player as a `0x${string}`.
   * @returns A Promise resolving to an object with error status, optional error message, and detailed player information.
   */
  public async getPlayerDetails(playerProfileId: ZeroString): Promise<{
    error: boolean;
    errorMessage?: string;
    details?: {
      videos: (PlayerVideoActivity & {
        playerProfileId: ZeroString;
        profileId: ZeroString;
        pubId: ZeroString;
      })[];
      questsJoined: string[];
      questsCompleted: string[];
      profileId: ZeroString;
      eligibile: {
        milestone: string;
        questId: string;
        status: boolean;
      }[];
      milestonesCompleted: {
        questId: string;
        milestonesCompleted: number[];
      }[];
    };
  }> {
    try {
      const data = await getDetailsOfPlayer(parseInt(playerProfileId, 16));

      const playerData = data?.data?.players?.[0];

      const details = {
        videos: playerData?.videos?.map(
          (video: {
            playerProfileId: string;
            profileId: string;
            pubId: string;
            secondaryReactOnQuote: string;
            secondaryReactOnComment: string;
            secondaryQuoteOnQuote: string;
            secondaryQuoteOnComment: string;
            secondaryMirrorOnComment: string;
            secondaryMirrorOnQuote: string;
            secondaryCommentOnQuote: string;
            secondaryCommentOnComment: string;
            secondaryCollectOnQuote: string;
            secondaryCollectOnComment: string;
            avd: string;
            duration: string;
            playCount: string;
          }) => ({
            ...video,
            playerProfileId: toHex(Number(video?.playerProfileId)),
            profileId: toHex(Number(video?.profileId)),
            pubId: toHex(Number(video?.pubId)),
            secondaryReactOnQuote: Number(video?.secondaryReactOnQuote),
            minSecondaryReactOnComment: Number(video?.secondaryReactOnComment),
            secondaryQuoteOnQuote: Number(video?.secondaryQuoteOnQuote),
            secondaryQuoteOnComment: Number(video?.secondaryQuoteOnComment),
            secondaryMirrorOnComment: Number(video?.secondaryMirrorOnComment),
            secondaryMirrorOnQuote: Number(video?.secondaryMirrorOnQuote),
            secondaryCommentOnQuote: Number(video?.secondaryCommentOnQuote),
            secondaryCommentOnComment: Number(video?.secondaryCommentOnComment),
            secondaryCollectOnQuote: Number(video?.secondaryCollectOnQuote),
            secondaryCollectOnComment: Number(video?.secondaryCollectOnComment),
            avd: Number(video?.avd) / 10 ** 18,
            duration: Number(video?.duration) / 10 ** 18,
            playCount: Number(video?.playCount),
          }),
        ),
        questsJoined: playerData?.questsJoined,
        questsCompleted: playerData?.questsCompleted,
        profileId: toHex(Number(playerData?.profileId)),
        eligibile: playerData?.eligible?.map(
          (item: { milestone: string; questId: string; status: string }) => ({
            milestone: item?.milestone,
            questId: item?.questId,
            status: item?.status == "0" ? true : false,
          }),
        ),
        milestonesCompleted: playerData?.milestonesCompleted?.map(
          (item: { questId: string; milestonesCompleted: string }) => ({
            questId: item?.questId,
            milestonesCompleted: Array.from(
              { length: Number(item?.milestonesCompleted) },
              (_, i) => Number(item?.milestonesCompleted) - i,
            ),
          }),
        ),
      };

      return {
        error: false,
        details,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously fetches all players participating in a specific quest.
   *
   * @param questId - Numeric ID of the quest.
   * @returns A Promise resolving to an object with error status, optional error message, and an array of player IDs.
   */
  public async getAllQuestPlayers(questId: number): Promise<{
    error: boolean;
    errorMessage?: string;
    players?: ZeroString[];
  }> {
    try {
      const data = await getPlayersByQuest(questId);

      return {
        error: false,
        players: data?.data?.questInstantiateds?.[0]?.players,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves quests initiated by a specific player (envoker).
   *
   * @param envokerProfileId - Lens Profile ID of the envoker as a `0x${string}`.
   * @returns A Promise resolving to an object containing error status, optional error message, and an array of quest IDs initiated by the envoker.
   */
  public async getQuestByEnvoker(envokerProfileId: ZeroString): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: string[];
  }> {
    try {
      const data = await getQuestEnvoker(parseInt(envokerProfileId, 16));
      return {
        error: false,
        quests: data?.data?.questInstantiateds?.map(
          (item: { questId: string }) => item.questId,
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves all available quests.
   *
   * @returns A Promise resolving to an object with error status, optional error message, and an array of all quest IDs.
   */
  public async getAllQuests(): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: string[];
  }> {
    try {
      const data = await getQuests();
      return {
        error: false,
        quests: data?.data?.questInstantiateds?.map(
          (item: { questId: string }) => item.questId,
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously gathers all video metrics.
   *
   * @returns A Promise resolving to an object containing error status, optional error message,
   *          and an array of metrics for all videos including engagement and interaction details.
   */
  public async getAllVideoMetrics(): Promise<{
    error: boolean;
    errorMessage?: string;
    videos?: {
      playerId: string;
      profileId: ZeroString;
      pubId: ZeroString;
      questId: number;
      videoBytes: string;
      minSecondaryReactOnQuote: number;
      minSecondaryReactOnComment: number;
      minSecondaryQuoteOnQuote: number;
      minSecondaryQuoteOnComment: number;
      minSecondaryMirrorOnComment: number;
      minSecondaryMirrorOnQuote: number;
      minSecondaryCommentOnQuote: number;
      minSecondaryCommentOnComment: number;
      minSecondaryCollectOnQuote: number;
      minSecondaryCollectOnComment: number;
      bookmark: boolean;
      comment: boolean;
      quote: boolean;
      react: boolean;
      mirror: boolean;
      minAVD: number;
      minDuration: number;
      minPlayCount: number;
    }[];
  }> {
    try {
      const data = await getVideoMetrics();
      return {
        error: false,
        videos: data?.data?.videos?.map(
          (video: {
            playerId: string;
            profileId: string;
            pubId: string;
            questId: string;
            videoBytes: string;
            minSecondaryReactOnQuote: string;
            minSecondaryReactOnComment: string;
            minSecondaryQuoteOnQuote: string;
            minSecondaryQuoteOnComment: string;
            minSecondaryMirrorOnComment: string;
            minSecondaryMirrorOnQuote: string;
            minSecondaryCommentOnQuote: string;
            minSecondaryCommentOnComment: string;
            minSecondaryCollectOnQuote: string;
            minSecondaryCollectOnComment: string;
            bookmark: boolean;
            comment: boolean;
            quote: boolean;
            react: boolean;
            mirror: boolean;
            minAVD: string;
            minDuration: string;
            minPlayCount: string;
          }) => ({
            ...video,
            profileId: toHex(Number(video?.profileId)),
            pubId: toHex(Number(video?.pubId)),
            questId: Number(video?.questId),
            minSecondaryReactOnQuote: Number(video?.minSecondaryReactOnQuote),
            minSecondaryReactOnComment: Number(
              video?.minSecondaryReactOnComment,
            ),
            minSecondaryQuoteOnQuote: Number(video?.minSecondaryQuoteOnQuote),
            minSecondaryQuoteOnComment: Number(
              video?.minSecondaryQuoteOnComment,
            ),
            minSecondaryMirrorOnComment: Number(
              video?.minSecondaryMirrorOnComment,
            ),
            minSecondaryMirrorOnQuote: Number(video?.minSecondaryMirrorOnQuote),
            minSecondaryCommentOnQuote: Number(
              video?.minSecondaryCommentOnQuote,
            ),
            minSecondaryCommentOnComment: Number(
              video?.minSecondaryCommentOnComment,
            ),
            minSecondaryCollectOnQuote: Number(
              video?.minSecondaryCollectOnQuote,
            ),
            minSecondaryCollectOnComment: Number(
              video?.minSecondaryCollectOnComment,
            ),
            minAVD: Number(video?.minAVD) / 10 ** 18,
            minDuration: Number(video?.minDuration) / 10 ** 18,
            minPlayCount: Number(video?.minPlayCount),
          }),
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves quests associated with a specific playback ID.
   *
   * @param playbackId - String ID of the playback.
   * @returns A Promise resolving to an object with error status, optional error message, and an array of quest IDs linked to the playback ID.
   */
  public async getQuestsByPlaybackId(playbackId: string): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: string[];
  }> {
    try {
      const data = await getPlaybackIdQuests(playbackId);

      return {
        error: false,
        quests: data?.data?.questInstantiateds?.map(
          (item: { questId: string }) => item.questId,
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously fetches quests associated with a specific video post.
   *
   * @param postId - Lens publication ID of the post as a `0x${string}`.
   * @returns A Promise resolving to an object with error status, optional error message, and an array of quest IDs related to the video post.
   */
  public async getQuestsByVideoPost(postId: ZeroString): Promise<{
    error: boolean;
    errorMessage?: string;
    quests?: string[];
  }> {
    try {
      const data = await getVideoIdQuests(
        parseInt(postId?.split("-")?.[0], 16),
        parseInt(postId?.split("-")?.[1], 16),
      );

      return {
        error: false,
        quests: data?.data?.questInstantiateds?.map(
          (item: { questId: string }) => item.questId,
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously retrieves player activity based on a specific playback ID.
   *
   * @param playbackId - String ID representing the playback.
   * @returns A Promise resolving to an object with error status, optional error message, and an array of player activities related to the playback ID.
   */
  public async getPlayerActivityByPlaybackId(playbackId: string): Promise<{
    error: boolean;
    errorMessage?: string;
    activity?: (PlayerVideoActivity & {
      playerProfileId: ZeroString;
      profileId: ZeroString;
      pubId: ZeroString;
    })[];
  }> {
    try {
      const data = await getActivityByPlayerId(playbackId);

      return {
        error: false,
        activity: data?.data?.videoActivities?.map(
          (video: {
            playerProfileId: string;
            profileId: string;
            pubId: string;
            secondaryReactOnQuote: string;
            secondaryReactOnComment: string;
            secondaryQuoteOnQuote: string;
            secondaryQuoteOnComment: string;
            secondaryMirrorOnComment: string;
            secondaryMirrorOnQuote: string;
            secondaryCommentOnQuote: string;
            secondaryCommentOnComment: string;
            secondaryCollectOnQuote: string;
            secondaryCollectOnComment: string;
            avd: string;
            duration: string;
            playCount: string;
          }) => ({
            ...video,
            playerProfileId: toHex(Number(video?.playerProfileId)),
            profileId: toHex(Number(video?.profileId)),
            pubId: toHex(Number(video?.pubId)),
            secondaryReactOnQuote: Number(video?.secondaryReactOnQuote),
            minSecondaryReactOnComment: Number(video?.secondaryReactOnComment),
            secondaryQuoteOnQuote: Number(video?.secondaryQuoteOnQuote),
            secondaryQuoteOnComment: Number(video?.secondaryQuoteOnComment),
            secondaryMirrorOnComment: Number(video?.secondaryMirrorOnComment),
            secondaryMirrorOnQuote: Number(video?.secondaryMirrorOnQuote),
            secondaryCommentOnQuote: Number(video?.secondaryCommentOnQuote),
            secondaryCommentOnComment: Number(video?.secondaryCommentOnComment),
            secondaryCollectOnQuote: Number(video?.secondaryCollectOnQuote),
            secondaryCollectOnComment: Number(video?.secondaryCollectOnComment),
            avd: Number(video?.avd) / 10 ** 18,
            duration: Number(video?.duration) / 10 ** 18,
            playCount: Number(video?.playCount),
          }),
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Asynchronously gathers player activity data for a specific video post.
   *
   * @param postId - Lens publication ID of the video post as a `0x${string}`.
   * @returns A Promise resolving to an object with error status, optional error message, and an array of player activities related to the video post.
   */
  public async getPlayerActivityByVideoPost(postId: ZeroString): Promise<{
    error: boolean;
    errorMessage?: string;
    activity?: (PlayerVideoActivity & {
      playerProfileId: ZeroString;
      profileId: ZeroString;
      pubId: ZeroString;
    })[];
  }> {
    try {
      const data = await getActivityByPostId(
        parseInt(postId?.split("-")?.[0], 16),
        parseInt(postId?.split("-")?.[1], 16),
      );

      return {
        error: false,
        activity: data?.data?.videoActivities?.map(
          (video: {
            playerProfileId: string;
            profileId: string;
            pubId: string;
            secondaryReactOnQuote: string;
            secondaryReactOnComment: string;
            secondaryQuoteOnQuote: string;
            secondaryQuoteOnComment: string;
            secondaryMirrorOnComment: string;
            secondaryMirrorOnQuote: string;
            secondaryCommentOnQuote: string;
            secondaryCommentOnComment: string;
            secondaryCollectOnQuote: string;
            secondaryCollectOnComment: string;
            avd: string;
            duration: string;
            playCount: string;
          }) => ({
            ...video,
            playerProfileId: toHex(Number(video?.playerProfileId)),
            profileId: toHex(Number(video?.profileId)),
            pubId: toHex(Number(video?.pubId)),
            secondaryReactOnQuote: Number(video?.secondaryReactOnQuote),
            minSecondaryReactOnComment: Number(video?.secondaryReactOnComment),
            secondaryQuoteOnQuote: Number(video?.secondaryQuoteOnQuote),
            secondaryQuoteOnComment: Number(video?.secondaryQuoteOnComment),
            secondaryMirrorOnComment: Number(video?.secondaryMirrorOnComment),
            secondaryMirrorOnQuote: Number(video?.secondaryMirrorOnQuote),
            secondaryCommentOnQuote: Number(video?.secondaryCommentOnQuote),
            secondaryCommentOnComment: Number(video?.secondaryCommentOnComment),
            secondaryCollectOnQuote: Number(video?.secondaryCollectOnQuote),
            secondaryCollectOnComment: Number(video?.secondaryCollectOnComment),
            avd: Number(video?.avd) / 10 ** 18,
            duration: Number(video?.duration) / 10 ** 18,
            playCount: Number(video?.playCount),
          }),
        ),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }
}

export default Kinora;
