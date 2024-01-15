import { ZeroString, PlayerData } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import { Post, Comment, Quote } from "./@types/generated";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import getPublication from "./graphql/queries/getPublication";
import getPublications from "./graphql/queries/getPublications";

export class Sequence {
  /**
   * @private
   * @type {{ [postId: ZeroString]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [postId: ZeroString]: Metrics } = {};

  /**
   * @private
   * @type {{ [postId: ZeroString]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [postId: ZeroString]: PlayerData } = {};

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  constructor(playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>) {
    this.playerAuthedApolloClient = playerAuthedApolloClient;
  }
  /**
   * Initializes a Livepeer video player with given Id and associates event handlers to the video element.
   *
   * @param postId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   */
  initializePlayer = (
    postId: ZeroString,
    videoElement: HTMLVideoElement,
  ): void => {
    if (!this.metrics[postId]) {
      this.metrics[postId] = new Metrics();
    }

    if (
      !this.playerMap[postId] ||
      this.playerMap[postId].videoElement !== videoElement
    ) {
      this.playerMap[postId] = {
        videoElement,
        postId,
        eventHandlers: {
          play: () => this.metrics[postId].onPlay(videoElement),
          end: () => this.metrics[postId].onEnd(videoElement),
          pause: () => this.metrics[postId].onPause(),
          volumeChange: () => this.metrics[postId].onVolumeChange(),
          muteToggle: () => this.metrics[postId].onMuteToggle(),
          qualityChange: () => this.metrics[postId].onQualityChange(),
          fullscreenToggle: () => this.metrics[postId].onFullscreenToggle(),
          click: () => this.metrics[postId].onClick(),
          onTimeUpdate: () => this.metrics[postId].onTimeUpdate(videoElement),
          onSeeked: () => this.metrics[postId].onSeeked(videoElement),
          onSeeking: () => this.metrics[postId].onSeeking(),
        },
      };
      videoElement.addEventListener("ended", () =>
        this.playerMap[postId].eventHandlers.end(videoElement),
      );
      videoElement.addEventListener("play", () =>
        this.playerMap[postId].eventHandlers.play(videoElement),
      );
      videoElement.addEventListener(
        "pause",
        this.playerMap[postId].eventHandlers.pause,
      );
      videoElement.addEventListener("seeking", this.metrics[postId].onSeeking);
      videoElement.addEventListener("seeked", () =>
        this.metrics[postId].onSeeked(videoElement),
      );
      videoElement.addEventListener(
        "volumechange",
        this.playerMap[postId].eventHandlers.volumeChange,
      );
      videoElement.addEventListener(
        "click",
        this.playerMap[postId].eventHandlers.click,
      );

      videoElement.addEventListener(
        "qualityChange",
        this.playerMap[postId].eventHandlers.qualityChange,
      );
      videoElement.addEventListener(
        "muteToggle",
        this.playerMap[postId].eventHandlers.muteToggle,
      );
      videoElement.addEventListener(
        "fullscreenToggle",
        this.playerMap[postId].eventHandlers.fullscreenToggle,
      );
      videoElement.addEventListener("timeupdate", () =>
        this.metrics[postId].onTimeUpdate(videoElement),
      );
    }
  };

  /**
   * Destroys a player with given playback Id, cleaning up event listeners and removing video data.
   *
   * @param postId - A string representing the Lens Post Id.
   */
  destroyPlayer = (postId: ZeroString): void => {
    if (!this.playerMap[postId]) return;
    this.cleanUpListeners(postId);
    this.metrics[postId].reset();
    delete this.playerMap[postId];
  };

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {ZeroString} postId - The Lens Post Id of the for the connected video.
   * @param {ZeroString} playerProfileId - The Profile Id of the Player.
   * @param {ethers.Wallet} wallet - The Ethers.Wallet object of the Player.
   * @param {ZeroString} kinoraMetricsContractAddress - Instantiated Kinora Metrics Contract.
   * @param {ZeroString} kinoraQuestDataContractAddress - Instantiated Kinora Quest Data Contract.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    postId: ZeroString,
    playerProfileId: ZeroString,
    wallet: ethers.Wallet,
    kinoraMetricsContractAddress: ZeroString,
    kinoraQuestDataContractAddress: ZeroString,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    txHash?: string;
  }> => {
    if (Object.keys(this.playerMap).length === 0)
      throw new Error(
        "No video elements detected. Make sure to set your Livepeer Player component in your app.",
      );

    if (!this.metrics[postId]) {
      throw new Error(
        "Player Not Found in App. Make sure you've correctly added the Post Id.",
      );
    }

    try {
      const { data } = await getPublication(
        {
          forId: postId,
        },
        this.playerAuthedApolloClient,
      );
      let commentData: Comment[] = [];
      if ((data?.publication as Post)?.stats?.comments > 0) {
        const { data } = await getPublications(
          {
            where: {
              commentOn: {
                id: postId,
              },
              from: [playerProfileId],
            },
          },
          this.playerAuthedApolloClient,
        );

        commentData = data?.publications?.items as Comment[];
      }

      const kinoraMetricsContract = new ethers.Contract(
        kinoraMetricsContractAddress,
        KinoraMetricsAbi,
        wallet,
      );

      const {
        error,
        errorMessage,
        playCount,
        avd,
        duration,
        mostReplayedArea,
      } = await this.getCurrentMetrics(
        wallet,
        parseInt(playerProfileId, 16),
        parseInt(postId?.split("-")[1], 16),
        parseInt(postId?.split("-")[0], 16),
        kinoraQuestDataContractAddress,
      );

      if (error) {
        return {
          error: true,
          errorMessage: errorMessage,
        };
      }

      const {
        error: errorSecondary,
        errorMessage: errorMessageSecondary,
        secondaryQuoteOnQuote,
        secondaryMirrorOnQuote,
        secondaryReactOnQuote,
        secondaryCommentOnQuote,
        secondaryCollectOnQuote,
        secondaryQuoteOnComment,
        secondaryMirrorOnComment,
        secondaryReactOnComment,
        secondaryCommentOnComment,
        secondaryCollectOnComment,
      } = await this.secondaryData(playerProfileId, postId);

      if (errorSecondary) {
        return {
          error: true,
          errorMessage: errorMessageSecondary,
        };
      }

      const tx = await kinoraMetricsContract.addPlayerMetrics({
        profileId: parseInt(postId?.split("-")[0], 16),
        pubId: parseInt(postId?.split("-")[1], 16),
        playCount: Number(playCount) + this.metrics[postId]?.getPlayCount(),
        secondaryQuoteOnQuote: secondaryQuoteOnQuote || 0,
        secondaryMirrorOnQuote: secondaryMirrorOnQuote || 0,
        secondaryReactOnQuote: secondaryReactOnQuote || 0,
        secondaryCommentOnQuote: secondaryCommentOnQuote || 0,
        secondaryCollectOnQuote: secondaryCollectOnQuote || 0,
        secondaryQuoteOnComment: secondaryQuoteOnComment || 0,
        secondaryMirrorOnComment: secondaryMirrorOnComment || 0,
        secondaryReactOnComment: secondaryReactOnComment || 0,
        secondaryCommentOnComment: secondaryCommentOnComment || 0,
        secondaryCollectOnComment: secondaryCollectOnComment || 0,
        avd: (
          Number(
            (Number(duration) + this.metrics[postId]?.getTotalDuration() == 0
              ? 0
              : (Number(avd) * Number(duration) +
                  this.metrics[postId]?.getAVD() *
                    this.metrics[postId]?.getTotalDuration()) /
                (Number(duration) + this.metrics[postId]?.getTotalDuration()) /
                1000
            ).toFixed(2),
          ) *
          10 ** 18
        ).toString(),
        duration: (
          Number(
            (
              Number(duration) + this.metrics[postId]?.getTotalDuration()
            ).toFixed(2),
          ) *
          10 ** 18
        ).toString(),
        mostReplayedArea: "",
        // this.reconcileMostReplayedArea(
        //   mostReplayedArea!,
        //   this.metrics[postId]?.getMostReplayedArea()
        // ),
        hasQuoted: (data?.publication as Post)?.operations?.hasQuoted,
        hasMirrored: (data?.publication as Post)?.operations.hasMirrored,
        hasCommented: commentData?.length > 0 ? true : false,
        hasBookmarked: (data?.publication as Post)?.operations.hasBookmarked,
        hasReacted: (data?.publication as Post)?.operations.hasReacted,
      });

      this.destroyPlayer(postId);

      const txHash = await tx.wait();

      return {
        error: false,
        txHash,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  };

  /**
   * Retrieves the live video metrics for a specific post.
   *
   * @param postId - Lens Profile ID of the post in the format ZeroString.
   * @returns An object containing the play count, average view duration (avd),
   *          total duration of the video, total interactions, and most replayed area of the video.
   *          Returns undefined metrics for non-existent postId.
   */
  getLivePlayerVideoMetrics = (
    postId: ZeroString,
  ): {
    playCount: number;
    avd: number;
    duration: number;
    // mostReplayedArea: (Map<number, number>);
    totalInteractions: number;
  } => {
    return {
      playCount: this.metrics[postId]?.getPlayCount(),
      avd: this.metrics[postId]?.getAVD(),
      duration: this.metrics[postId]?.getTotalDuration(),
      totalInteractions: this.metrics[postId]?.getTotalInteractions(),
      // mostReplayedArea: this.metrics[postId]?.getMostReplayedArea(),
    };
  };

  /**
   * @method cleanUpListeners
   * @description Removes event listeners related to video metrics collection.
   * @param {string} postId - The video post Id.
   * @throws Will throw an error if not used in a browser environment or if the video element is not found.
   * @private
   */
  private cleanUpListeners = (postId: ZeroString) => {
    if (typeof window == "undefined") {
      throw new Error("Make sure you are in a browser environment.");
    }
    this.playerMap[postId].videoElement.removeEventListener("ended", () =>
      this.playerMap[postId].eventHandlers.end(
        this.playerMap[postId].videoElement,
      ),
    );
    this.playerMap[postId].videoElement.removeEventListener("play", () =>
      this.playerMap[postId].eventHandlers.play(
        this.playerMap[postId].videoElement,
      ),
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "pause",
      this.playerMap[postId].eventHandlers.pause,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "volumechange",
      this.playerMap[postId].eventHandlers.volumeChange,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "click",
      this.playerMap[postId].eventHandlers.click,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "seeking",
      this.playerMap[postId].eventHandlers.onSeeking,
    );
    this.playerMap[postId].videoElement.removeEventListener("seeked", () =>
      this.playerMap[postId].eventHandlers.onSeeked(
        this.playerMap[postId].videoElement,
      ),
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "qualityChange",
      this.playerMap[postId].eventHandlers.qualityChange,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "muteToggle",
      this.playerMap[postId].eventHandlers.muteToggle,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "fullscreenToggle",
      this.playerMap[postId].eventHandlers.fullscreenToggle,
    );
    this.playerMap[postId].videoElement.removeEventListener("timeupdate", () =>
      this.metrics[postId].onTimeUpdate(this.playerMap[postId].videoElement),
    );
  };

  /**
   * Asynchronously retrieves current metrics for a video associated with a player's profile.
   *
   * @param wallet - ethers.Wallet instance for transactions.
   * @param playerProfileId - Numeric ID of the player's profile.
   * @param videoPubId - Numeric ID of the video publication.
   * @param videoProfileId - Numeric ID of the video's profile.
   * @param kinoraQuestDataContractAddress - Instantiated Kinora Quest Data Contract.
   * @returns A Promise resolving to an object with error status, optional error message,
   *          and metrics including most replayed area, play count, average view duration, and total duration.
   */
  private getCurrentMetrics = async (
    wallet: ethers.Wallet,
    playerProfileId: number,
    videoPubId: number,
    videoProfileId: number,
    kinoraQuestDataContractAddress: ZeroString,
  ): Promise<{
    error: boolean;
    errorMessage?: string;
    mostReplayedArea?: string;
    playCount?: number;
    avd?: number;
    duration?: number;
  }> => {
    try {
      const kinoraQuestData = new ethers.Contract(
        kinoraQuestDataContractAddress,
        KinoraQuestDataAbi,
        wallet,
      );

      const duration = await kinoraQuestData.getPlayerVideoDuration(
        playerProfileId,
        videoPubId,
        videoProfileId,
      );
      const mostReplayedArea =
        await kinoraQuestData.getPlayerVideoMostReplayedArea(
          playerProfileId,
          videoPubId,
          videoProfileId,
        );
      const playCount = await kinoraQuestData.getPlayerVideoPlayCount(
        playerProfileId,
        videoPubId,
        videoProfileId,
      );
      const avd = await kinoraQuestData.getPlayerVideoAVD(
        playerProfileId,
        videoPubId,
        videoProfileId,
      );

      return {
        error: false,
        mostReplayedArea: mostReplayedArea?.toString(),
        playCount: Number(playCount) || 0,
        avd: (Number(avd) || 0) / 10 ** 18,
        duration: (Number(duration) || 0) / 10 ** 18,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  };

  /**
   * Reconciles and calculates the most replayed area between previous and current video data.
   *
   * @param previousArea - String representing the previous most replayed area.
   * @param currentArea - String representing the current most replayed area.
   * @returns A number representing the reconciled most replayed area, considering both previous and current data.
   */
  private reconcileMostReplayedArea = (
    previousArea: string,
    currentArea: string,
  ): number => {
    if (currentArea === "No replays") {
      if (previousArea?.toString() == "0") {
        return 0;
      }
      return Number(this.formatToNumber(previousArea).start);
    }

    if (previousArea == "No replays") {
      return Number(this.formatToNumber(currentArea).start);
    }

    return this.formatToNumber(currentArea).start >
      this.formatToNumber(previousArea).start
      ? Number(
          this.formatToNumber(currentArea).start.toString() +
            "0000" +
            this.formatToNumber(currentArea).end.toString(),
        )
      : Number(
          this.formatToNumber(previousArea).start.toString() +
            "0000" +
            this.formatToNumber(previousArea).end.toString(),
        );
  };

  /**
   * Asynchronously fetches secondary data related to a player's interactions on specific posts, such as quotes and comments.
   *
   * @param playerProfileId - Lens Profile ID of the player in the format ZeroString.
   * @param postId - Lens Profile ID of the post in the format ZeroString.
   * @returns A Promise resolving to an object containing error status, optional error message,
   *          and counts of various secondary interactions (quote, mirror, react, comment, collect) on quotes and comments.
   */
  secondaryData = async (
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
  }> => {
    try {
      const { data: commentData } = await getPublications(
        {
          where: {
            commentOn: {
              id: postId,
            },
            from: [playerProfileId],
          },
        },
        this.playerAuthedApolloClient,
      );
      let secondaryQuoteOnComment: number = 0,
        secondaryMirrorOnComment: number = 0,
        secondaryReactOnComment: number = 0,
        secondaryCommentOnComment: number = 0,
        secondaryCollectOnComment: number = 0;

      if (
        commentData?.publications?.items &&
        commentData?.publications?.items?.length > 0
      ) {
        (commentData?.publications?.items as Comment[])?.forEach(
          (item: Comment) => {
            if (item?.stats?.countOpenActions > secondaryCollectOnComment)
              secondaryCollectOnComment = item?.stats?.countOpenActions;
            if (item?.stats?.reactions > secondaryReactOnComment)
              secondaryReactOnComment = item?.stats?.reactions;
            if (item?.stats?.mirrors > secondaryMirrorOnComment)
              secondaryMirrorOnComment = item?.stats?.mirrors;
            if (item?.stats?.quotes > secondaryQuoteOnComment)
              secondaryQuoteOnComment = item?.stats?.quotes;
            if (item?.stats?.comments > secondaryCommentOnComment)
              secondaryCommentOnComment = item?.stats?.comments;
          },
        );
      }

      let secondaryQuoteOnQuote: number = 0,
        secondaryMirrorOnQuote: number = 0,
        secondaryReactOnQuote: number = 0,
        secondaryCommentOnQuote: number = 0,
        secondaryCollectOnQuote: number = 0;
      const { data: quoteData } = await getPublications(
        {
          where: {
            quoteOn: postId,
            from: [playerProfileId],
          },
        },
        this.playerAuthedApolloClient,
      );

      if (
        quoteData?.publications?.items &&
        quoteData?.publications?.items?.length > 0
      ) {
        (quoteData?.publications?.items as Quote[])?.forEach((item: Quote) => {
          if (item?.stats?.countOpenActions > secondaryCollectOnQuote)
            secondaryCollectOnQuote = item?.stats?.countOpenActions;
          if (item?.stats?.reactions > secondaryReactOnQuote)
            secondaryReactOnQuote = item?.stats?.reactions;
          if (item?.stats?.mirrors > secondaryMirrorOnQuote)
            secondaryMirrorOnQuote = item?.stats?.mirrors;
          if (item?.stats?.quotes > secondaryQuoteOnQuote)
            secondaryQuoteOnQuote = item?.stats?.quotes;
          if (item?.stats?.comments > secondaryCommentOnQuote)
            secondaryCommentOnQuote = item?.stats?.comments;
        });
      }

      return {
        error: false,
        secondaryQuoteOnQuote,
        secondaryMirrorOnQuote,
        secondaryReactOnQuote,
        secondaryCommentOnQuote,
        secondaryCollectOnQuote,
        secondaryQuoteOnComment,
        secondaryMirrorOnComment,
        secondaryReactOnComment,
        secondaryCommentOnComment,
        secondaryCollectOnComment,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  };

  /**
   * Converts a time string to a numerical representation.
   *
   * @param timeString - String representing a time range in the format "HH:MM:SS:MS".
   * @returns An object with 'start' and 'end' properties as numerical values derived from the time string.
   */
  private formatToNumber(timeString: string) {
    const [s, e] = timeString.split("-");
    let start: number | undefined, end: number | undefined;
    if (s) {
      const [shh, smm, sss, sms] = s.split(":");
      start = parseInt(`${shh}${smm}${sss}${sms}`);
    }
    if (e) {
      const [ehh, emm, ess, ems] = e.split(":");
      end = parseInt(`${ehh}${emm}${ess}${ems}`);
    }

    return {
      start: start ? start : "00000000",
      end: end ? end : "00000000",
    };
  }
}
