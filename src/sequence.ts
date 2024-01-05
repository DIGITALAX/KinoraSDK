import { ZeroString, PlayerData } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import {
  KINORA_METRICS_CONTRACT,
  KINORA_QUEST_DATA_CONTRACT,
} from "./constants/index";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import getPublicationClient from "./graphql/queries/getPublicationClient";
import getPublicationsClient from "./graphql/queries/getPublicationsClient";
import { Post, Comment } from "./@types/generated";

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
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    postId: ZeroString,
    playerProfileId: ZeroString,
    wallet: ethers.Wallet,
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
      const { data } = await getPublicationClient({
        forId: postId,
      });
      let commentData: Comment[] = [];
      if ((data?.publication as Post)?.stats?.comments > 0) {
        const { data } = await getPublicationsClient({
          where: {
            commentOn: {
              id: postId,
            },
            from: [playerProfileId],
          },
        });

        commentData = data?.publications?.items as Comment[];
      }

      const kinoraMetricsContract = new ethers.Contract(
        KINORA_METRICS_CONTRACT,
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
      );

      if (error) {
        return {
          error: true,
          errorMessage: errorMessage,
        };
      }

      this.metrics[postId]?.getAVD();

      const tx = await kinoraMetricsContract.addPlayerMetrics({
        profileId: parseInt(postId?.split("-")[0], 16),
        pubId: parseInt(postId?.split("-")[1], 16),
        playCount: Number(playCount) + this.metrics[postId]?.getPlayCount(),
        ctr: 0,
        avd:
          (Number(avd) * Number(duration) +
            this.metrics[postId]?.getAVD() *
              this.metrics[postId]?.getTotalDuration()) /
          (Number(duration) + this.metrics[postId]?.getTotalDuration()) /
          1000,
        impressionCount: 0,
        engagementRate: 0,
        duration: Number(duration) + this.metrics[postId]?.getTotalDuration(),
        mostViewedSegment: 0,
        interactionRate: 0,
        mostReplayedArea: this.reconcileMostReplayedArea(
          mostReplayedArea!,
          this.metrics[postId]?.getMostReplayedArea(),
        ),
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

  getLivePlayerVideoMetrics = (
    postId: `0x${string}`,
  ): {
    playCount: number;
    avd: number;
    duration: number;
    mostReplayedArea: string;
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
    this.playerMap[postId].videoElement.addEventListener("seeked", () =>
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

  private getCurrentMetrics = async (
    wallet: ethers.Wallet,
    playerProfileId: number,
    videoPubId: number,
    videoProfileId: number,
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
        KINORA_QUEST_DATA_CONTRACT,
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
        mostReplayedArea,
        playCount,
        avd,
        duration,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  };

  private reconcileMostReplayedArea = (
    prevMostReplayedArea: string,
    currentMostReplayedArea: string,
  ): string => {
    if (
      prevMostReplayedArea?.toLowerCase() === "no replays" ||
      !prevMostReplayedArea ||
      prevMostReplayedArea?.trim() == ""
    ) {
      return currentMostReplayedArea;
    }
    if (
      currentMostReplayedArea?.toLowerCase() === "no replays" ||
      !currentMostReplayedArea ||
      currentMostReplayedArea?.trim() == ""
    ) {
      return prevMostReplayedArea;
    }

    const [prevStart, prevEnd] = prevMostReplayedArea.split("-");
    const [currentStart, currentEnd] = currentMostReplayedArea.split("-");

    const prevStartTime_ms = this.timeStringToMilliseconds(prevStart);
    const prevEndTime_ms = this.timeStringToMilliseconds(prevEnd);
    const currentStartTime_ms = this.timeStringToMilliseconds(currentStart);
    const currentEndTime_ms = this.timeStringToMilliseconds(currentEnd);

    const reconciledStart_ms =
      prevStartTime_ms < currentStartTime_ms
        ? prevStartTime_ms
        : currentStartTime_ms;

    const reconciledEnd_ms =
      prevEndTime_ms > currentEndTime_ms ? prevEndTime_ms : currentEndTime_ms;

    const reconciledStart = this.millisecondsToTimeStr(reconciledStart_ms);
    const reconciledEnd = this.millisecondsToTimeStr(reconciledEnd_ms);

    const reconciledArea = `${reconciledStart}-${reconciledEnd}`;

    return reconciledArea;
  };

  private timeStringToMilliseconds = (timeStr: string): number => {
    const [hours, minutes, seconds, milliseconds] = timeStr
      .split(/[:.]/)
      .map(Number);
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
  };

  private millisecondsToTimeStr = (milliseconds: number): string => {
    const date = new Date(milliseconds);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    const millisecondsStr = date
      .getUTCMilliseconds()
      .toString()
      .padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${millisecondsStr}`;
  };
}
