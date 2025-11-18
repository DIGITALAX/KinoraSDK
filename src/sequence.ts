import { ZeroString, PlayerData, TimeRange, IPFSConfig } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import getPublication from "./graphql/queries/getPublication";
import { fetchIPFS, hashToIPFS } from "./utils/ipfs";
import {
  PageSize,
  Post,
  PostReferenceType,
} from "@lens-protocol/client";
import getPublicationsReferences from "./graphql/queries/getPublicationReferences";

export class Sequence {
  /**
   * @private
   * @type {{ [postId: string]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [postId: string]: Metrics } = {};

  /**
   * @private
   * @type {{ [postId: string]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [postId: string]: PlayerData } = {};

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {IPFSConfig}
   * @description IPFS configuration for upload and gateway endpoints.
   */
  private ipfsConfig: IPFSConfig;

  constructor(
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>,
    ipfsConfig: IPFSConfig
  ) {
    this.playerAuthedApolloClient = playerAuthedApolloClient;
    this.ipfsConfig = ipfsConfig;
  }
  /**
   * Initializes a Livepeer video player with given Id and associates event handlers to the video element.
   *
   * @param postId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   */
  initializePlayer = (postId: string, videoElement: HTMLVideoElement): void => {
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
  destroyPlayer = (postId: string): void => {
    if (!this.playerMap[postId]) return;
    this.cleanUpListeners(postId);
    this.metrics[postId].reset();
    delete this.playerMap[postId];
  };

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {ZeroString} postId - The Lens Post Id of the for the connected video.
   * @param {ZeroString} playerProfile - The Profile Address of the Player.
   * @param {ethers.Wallet} wallet - The Ethers.Wallet object of the Player.
   * @param {ZeroString} kinoraMetricsContractAddress - Instantiated Kinora Metrics Contract.
   * @param {ZeroString} kinoraQuestDataContractAddress - Instantiated Kinora Quest Data Contract.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    postId: string,
    playerProfile: ZeroString,
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
      const data = await getPublication(
        {
          post: postId,
        },
        this.playerAuthedApolloClient,
      );

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
        playerProfile,
        postId,
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
      } = await this.secondaryData(playerProfile, postId);

      if (errorSecondary) {
        return {
          error: true,
          errorMessage: errorMessageSecondary,
        };
      }

      const tx = await kinoraMetricsContract.addPlayerMetrics({
        postId,
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
        mostReplayedArea: await this.reconcileMostReplayedArea(
          mostReplayedArea! as `ipfs://${string}`,
          this.metrics[postId]?.getMostReplayedArea(),
        ),
        hasQuoted: data?.operations?.hasQuoted?.optimistic,
        hasMirrored: data?.operations?.hasReposted?.optimistic,
        hasCommented: data?.operations?.hasCommented?.optimistic,
        hasBookmarked: data?.operations?.hasBookmarked,
        hasReacted: data?.operations?.hasUpvoted,
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
   * @param postId - Post ID of the post.
   * @returns An object containing the play count, average view duration (avd),
   *          total duration of the video, total interactions, and most replayed areas of the video.
   *          Returns undefined metrics for non-existent postId.
   */
  getLivePlayerVideoMetrics = (
    postId: string,
  ): {
    playCount: number;
    avd: number;
    duration: number;
    mostReplayedArea: string[];
    totalInteractions: number;
  } => {
    return {
      playCount: this.metrics[postId]?.getPlayCount(),
      avd: this.metrics[postId]?.getAVD(),
      duration: this.metrics[postId]?.getTotalDuration(),
      totalInteractions: this.metrics[postId]?.getTotalInteractions(),
      mostReplayedArea: this.metrics[postId]?.getMostReplayedArea(),
    };
  };

  /**
   * @method cleanUpListeners
   * @description Removes event listeners related to video metrics collection.
   * @param {string} postId - The video post Id.
   * @throws Will throw an error if not used in a browser environment or if the video element is not found.
   * @private
   */
  private cleanUpListeners = (postId: string) => {
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
   * @param playerProfile - Profile Address of the player's profile.
   * @param videoPost - ID of the video publication.
   * @param kinoraQuestDataContractAddress - Instantiated Kinora Quest Data Contract.
   * @returns A Promise resolving to an object with error status, optional error message,
   *          and metrics including most replayed area, play count, average view duration, and total duration.
   */
  private getCurrentMetrics = async (
    wallet: ethers.Wallet,
    playerProfile: ZeroString,
    videoPostId: string,
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
        playerProfile,
        videoPostId,
      );
      const mostReplayedArea =
        await kinoraQuestData.getPlayerVideoMostReplayedArea(
          playerProfile,
          videoPostId,
        );
      const playCount = await kinoraQuestData.getPlayerVideoPlayCount(
        playerProfile,
        videoPostId,
      );
      const avd = await kinoraQuestData.getPlayerVideoAVD(
        playerProfile,
        videoPostId,
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
   * @param previousArea - String representing the previous most replayed areas.
   * @param currentArea - String representing the current most replayed areas.
   * @returns An ipfshash of the reconciled areas.
   */
  private reconcileMostReplayedArea = async (
    previousArea: `ipfs://${string}`,
    currentArea: string[],
  ): Promise<`ipfs://${string}` | void> => {
    if (currentArea?.length < 1) {
      return previousArea;
    }

    let reconciledAreasString: string[] = [];

    try {
      if (previousArea?.includes("ipfs://")) {
        const previousAreaData = await fetchIPFS(previousArea, this.ipfsConfig);
        if (previousAreaData?.error) {
          throw new Error(
            `Error reconciling most replayed areas: ${previousAreaData?.message}`,
          );
        }
        const previousAreas = await JSON.parse(previousAreaData?.data!);
        const parsedPreviousAreas = previousAreas.map(this.parseAreaString);

        const parsedCurrentAreas = currentArea.map(this.parseAreaString);

        const reconciledAreas = this.reconcileAreas(
          parsedPreviousAreas,
          parsedCurrentAreas,
        );
        reconciledAreasString = reconciledAreas.map(
          (area) =>
            `${this.formatTime(area.start)} - ${this.formatTime(
              area.end,
            )} | Views: ${area.views}`,
        );
      } else {
        reconciledAreasString = currentArea;
      }

      return (await hashToIPFS(JSON.stringify(reconciledAreasString), this.ipfsConfig))?.cid!;
    } catch (err: any) {
      throw new Error(`Error reconciling most replayed areas: ${err.message}`);
    }
  };

  /**
   * Asynchronously fetches secondary data related to a player's interactions on specific posts, such as quotes and comments.
   *
   * @param playerProfile - Lens Profile Address of the player in the format ZeroString.
   * @param postId - Post ID of the post.
   * @returns A Promise resolving to an object containing error status, optional error message,
   *          and counts of various secondary interactions (quote, mirror, react, comment, collect) on quotes and comments.
   */
  secondaryData = async (
    playerProfile: ZeroString,
    postId: string,
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
      const { data: commentData } = await getPublicationsReferences(
        {
          referencedPost: postId,
          referenceTypes: [PostReferenceType.CommentOn],
          pageSize: PageSize.Fifty,
          authors: [playerProfile],
        },
        this.playerAuthedApolloClient,
      );
      let secondaryQuoteOnComment: number = 0,
        secondaryMirrorOnComment: number = 0,
        secondaryReactOnComment: number = 0,
        secondaryCommentOnComment: number = 0,
        secondaryCollectOnComment: number = 0;

      if (commentData && commentData?.length > 0) {
        commentData?.forEach((item: Post) => {
          if (item?.stats?.collects > secondaryCollectOnComment)
            secondaryCollectOnComment = item?.stats?.collects;
          if (item?.stats?.upvotes > secondaryReactOnComment)
            secondaryReactOnComment = item?.stats?.upvotes;
          if (item?.stats?.reposts > secondaryMirrorOnComment)
            secondaryMirrorOnComment = item?.stats?.reposts;
          if (item?.stats?.quotes > secondaryQuoteOnComment)
            secondaryQuoteOnComment = item?.stats?.quotes;
          if (item?.stats?.comments > secondaryCommentOnComment)
            secondaryCommentOnComment = item?.stats?.comments;
        });
      }

      let secondaryQuoteOnQuote: number = 0,
        secondaryMirrorOnQuote: number = 0,
        secondaryReactOnQuote: number = 0,
        secondaryCommentOnQuote: number = 0,
        secondaryCollectOnQuote: number = 0;
      const { data: quoteData } = await getPublicationsReferences(
        {
          referencedPost: postId,
          referenceTypes: [PostReferenceType.QuoteOf],
          authors: [playerProfile],
        },
        this.playerAuthedApolloClient,
      );

      if (quoteData && quoteData?.length > 0) {
        quoteData?.forEach((item: Post) => {
          if (item?.stats?.collects > secondaryCollectOnQuote)
            secondaryCollectOnQuote = item?.stats?.collects;
          if (item?.stats?.upvotes > secondaryReactOnQuote)
            secondaryReactOnQuote = item?.stats?.upvotes;
          if (item?.stats?.reposts > secondaryMirrorOnQuote)
            secondaryMirrorOnQuote = item?.stats?.reposts;
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
  private parseAreaString(areaString: string): TimeRange {
    const [range, viewsPart] = areaString.split(" | Views: ");
    const [startString, endString] = range.split(" - ");
    return {
      start: this.parseTime(startString),
      end: this.parseTime(endString),
      views: parseInt(viewsPart, 10),
    };
  }

  private parseTime(timeString: string): number {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private reconcileAreas(
    previousAreas: TimeRange[],
    currentAreas: TimeRange[],
  ): TimeRange[] {
    const allAreas = [...previousAreas, ...currentAreas];
    allAreas.sort((a, b) => a.start - b.start);

    const mergedAreas = allAreas.reduce((acc: TimeRange[], area) => {
      if (!acc.length) {
        return [area];
      }

      let last = acc[acc.length - 1];
      if (last.end >= area.start) {
        last.end = Math.max(last.end, area.end);
        last.views += area.views;
      } else {
        acc.push(area);
      }

      return acc;
    }, []);

    return mergedAreas;
  }

  private formatTime(seconds: number): string {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours().toString().padStart(2, "0");
    const mm = date.getUTCMinutes().toString().padStart(2, "0");
    const ss = date.getUTCSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
}
