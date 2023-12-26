import { ILogEntry, LogCategory, PlayerData } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import {
  KINORA_METRICS_CONTRACT,
  KINORA_QUEST_DATA_CONTRACT,
} from "./constants";
import { EventEmitter } from "events";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import getPublicationClient from "./graphql/queries/getPublicationClient";
import { Comment, Post } from "./@types/generated";
import getPublicationsClient from "./graphql/queries/getPublicationsClient";

export class Sequence extends EventEmitter {
  /**
   * @private
   * @type {boolean}
   * @description Flag to determine the mode of error handling; strict or not.
   */
  private errorHandlingModeStrict: boolean = false;

  /**
   * @private
   * @type {{ [postId: `0x${string}`]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [postId: `0x${string}`]: Metrics } = {};

  /**
   * @private
   * @type {{ [postId: `0x${string}`]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [postId: `0x${string}`]: PlayerData } = {};

  /**
   * @private
   * @type {number}
   * @description Maximum size of the logs array.
   */
  private logSize: number = 1000;

  /**
   * @private
   * @type {number}
   * @description Index for the next log entry.
   */
  private logIndex: number = 0;

  /**
   * @private
   * @type {ILogEntry[]}
   * @description Array to hold log entries.
   */
  private logs: ILogEntry[] = new Array(this.logSize);

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest Data contract.
   */
  private kinoraQuestDataContract: ethers.Contract;

  /**
   * Constructs an instance of the enclosing class, initializing necessary properties and contracts.
   * @param {boolean} errorHandlingModeStrict - A boolean indicating whether the error handling mode is strict. Optional.
   */
  constructor(errorHandlingModeStrict?: boolean | undefined) {
    super();
    this.errorHandlingModeStrict = errorHandlingModeStrict;

    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
    );
  }

  /**
   * Initializes a Livepeer video player with given Id and associates event handlers to the video element.
   *
   * @param postId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   */
  initializePlayer = (
    postId: `0x${string}`,
    videoElement: HTMLVideoElement,
  ): void => {
    const playerData = this.playerMap[postId];
    if (!playerData) return;

    this.metrics[postId] = new Metrics();

    this.playerMap[postId] = {
      videoElement,
      postId,
      eventHandlers: {
        play: this.metrics[postId].onPlay,
        pause: this.metrics[postId].onPause,
        click: this.metrics[postId].onClick,
      },
    };

    videoElement.addEventListener(
      "play",
      this.playerMap[postId].eventHandlers.play,
    );
    videoElement.addEventListener(
      "pause",
      this.playerMap[postId].eventHandlers.pause,
    );
    videoElement.addEventListener(
      "click",
      this.playerMap[postId].eventHandlers.click,
    );
  };

  /**
   * Destroys a player with given playback Id, cleaning up event listeners and removing video data.
   *
   * @param postId - A string representing the Lens Post Id.
   */
  destroyPlayer = (postId: `0x${string}`): void => {
    if (!this.playerMap[postId]) return;
    this.cleanUpListeners(postId);
    delete this.playerMap[postId];
  };

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {`0x${string}`} postId - The Lens Post Id of the for the connected video.
   * @param {`0x${string}`} playerProfileId - The Profile Id of the Player.
   * @param {ethers.Wallet} wallet - The Ethers.Wallet object of the Player.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    postId: `0x${string}`,
    playerProfileId: `0x${string}`,
    wallet: ethers.Wallet,
  ): Promise<void> => {
    if (Object.keys(this.playerMap).length === 0)
      throw new Error(
        "No video elements detected. Make sure to set your Livepeer Player component in your app.",
      );

    try {
      const { data } = await getPublicationClient({
        forId: postId,
      });
      let commentData: Comment[];
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

      const tx = await kinoraMetricsContract.addPlayerMetrics(
        {
          playCount: this.metrics[postId].getPlayCount(),
          ctr: this.metrics[postId].getCTR(),
          avd: this.metrics[postId].getAVD(),
          impressionCount: this.metrics[postId].getImpressionCount(),
          engagementRate: this.metrics[postId].getEngagementRate(
            this.playerMap[postId].videoElement.duration,
          ),
          duration: this.metrics[postId].getTotalDuration(),
          mostViewedSegment: this.metrics[postId].getMostViewedSegment(),
          interactionRate: this.metrics[postId].getInteractionRate(),
          mostReplayedArea: this.metrics[postId].getMostReplayedArea(),
          hasQuoted: (data?.publication as Post)?.operations?.hasQuoted,
          hasMirrored: (data?.publication as Post)?.operations.hasMirrored,
          hasCommented: commentData?.length > 0 ? true : false,
          hasBookmarked: (data?.publication as Post)?.operations.hasBookmarked,
          hasReacted: (data?.publication as Post)?.operations.hasReacted,
        },
        parseInt(playerProfileId, 16),
        parseInt(postId?.split("-")[0], 16),
        parseInt(postId?.split("-")[1], 16),
      );

      this.metrics[postId].reset();

      this.log(
        LogCategory.BROADCAST,
        `Broadcast on-chain.`,
        await tx.wait(),
        new Date().toISOString(),
      );
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Adding Player metrics failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error sending metrics on-chain: ${err.message}`);
      }
    }
  };

  /**
   * @method getLogs
   * @description Retrieves the logs stored in the instance, optionally filtered by a specified category.
   * @param {LogCategory} [category] - An optional parameter to filter logs by a specific category. If not provided, all logs are returned.
   * @returns {ILogEntry[]} - An array of log entries, either filtered by the specified category or all logs if no category is specified.
   */
  getLogs = (category?: LogCategory): ILogEntry[] => {
    const logsInOrder = [
      ...this.logs.slice(this.logIndex),
      ...this.logs.slice(0, this.logIndex),
    ].filter((log) => log !== undefined);

    if (!category) {
      return logsInOrder;
    }

    return logsInOrder.filter((log) => log.category === category);
  };

  /**
   * @method cleanUpListeners
   * @description Removes event listeners related to video metrics collection.
   * @param {string} playbackId - The player's playback Id.
   * @throws Will throw an error if not used in a browser environment or if the video element is not found.
   * @private
   */
  private cleanUpListeners = (playbackId: string) => {
    this.playerMap[playbackId].videoElement.removeEventListener(
      "play",
      this.playerMap[playbackId].eventHandlers.play,
    );
    this.playerMap[playbackId].videoElement.removeEventListener(
      "pause",
      this.playerMap[playbackId].eventHandlers.pause,
    );
    this.playerMap[playbackId].videoElement.removeEventListener(
      "timeupdate",
      this.playerMap[playbackId].eventHandlers.timeupdate,
    );
    this.playerMap[playbackId].videoElement.removeEventListener(
      "click",
      this.playerMap[playbackId].eventHandlers.click,
    );
    this.playerMap[playbackId].videoElement.removeEventListener(
      "seeking",
      this.playerMap[playbackId].eventHandlers.seeking,
    );

    this.playerMap[playbackId].videoElement.removeEventListener(
      "volumechange",
      this.playerMap[playbackId].eventHandlers.volumechange,
    );
    this.playerMap[playbackId].videoElement.removeEventListener(
      "fullscreenchange",
      this.playerMap[playbackId].eventHandlers.fullscreenchange,
    );

    this.playerMap[playbackId].videoElement.removeEventListener(
      "waiting",
      this.playerMap[playbackId].eventHandlers.waiting,
    );

    this.playerMap[playbackId].videoElement.removeEventListener(
      "playing",
      this.playerMap[playbackId].eventHandlers.playing,
    );
  };

  /**
   * @method log
   * @description Logs messages along with associated data, managing log index and emitting log events.
   * @param {LogCategory} category - The category of the log.
   * @param {string} message - The log message.
   * @param {string} responseObject - The response object as a string.
   * @param {string} isoDate - The ISO string representation of the log date.
   * @private
   */
  private log = (
    category: LogCategory,
    message: string,
    responseObject: string,
    isoDate: string,
  ) => {
    if (typeof responseObject === "object") {
      responseObject = JSON.stringify(responseObject);
    }

    this.logs[this.logIndex] = { category, message, responseObject, isoDate };
    this.logIndex = (this.logIndex + 1) % this.logSize;
    this.emit(
      "log",
      JSON.stringify({
        message,
        responseObject,
        isoDate,
      }),
    );
  };
}
