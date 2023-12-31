import {
  EthereumAddress,
  ILogEntry,
  LogCategory,
  PlayerData,
} from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import { KINORA_METRICS_CONTRACT } from "./constants/index";
import { EventEmitter } from "events";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import getPublicationClient from "./graphql/queries/getPublicationClient";
import getPublicationsClient from "./graphql/queries/getPublicationsClient";
import { Post, Comment } from "./@types/generated";

export class Sequence extends EventEmitter {
  /**
   * @private
   * @type {boolean}
   * @description Flag to determine the mode of error handling; strict or not.
   */
  private errorHandlingModeStrict: boolean | undefined = false;

  /**
   * @private
   * @type {{ [postId: EthereumAddress]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [postId: EthereumAddress]: Metrics } = {};

  /**
   * @private
   * @type {{ [postId: EthereumAddress]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [postId: EthereumAddress]: PlayerData } = {};

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
   * Constructs an instance of the enclosing class, initializing necessary properties and contracts.
   * @param {boolean} errorHandlingModeStrict - A boolean indicating whether the error handling mode is strict. Optional.
   */
  constructor(errorHandlingModeStrict?: boolean | undefined) {
    super();
    this.errorHandlingModeStrict = errorHandlingModeStrict;
  }

  /**
   * Initializes a Livepeer video player with given Id and associates event handlers to the video element.
   *
   * @param postId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   */
  initializePlayer = (
    postId: EthereumAddress,
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
  destroyPlayer = (postId: EthereumAddress): void => {
    if (!this.playerMap[postId]) return;
    this.cleanUpListeners(postId);
    delete this.playerMap[postId];
  };

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {EthereumAddress} postId - The Lens Post Id of the for the connected video.
   * @param {EthereumAddress} playerProfileId - The Profile Id of the Player.
   * @param {ethers.Wallet} wallet - The Ethers.Wallet object of the Player.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    postId: EthereumAddress,
    playerProfileId: EthereumAddress,
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

      const tx = await kinoraMetricsContract.addPlayerMetrics(
        {
          profileId: parseInt(postId?.split("-")[0], 16),
          pubId: parseInt(postId?.split("-")[1], 16),
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
  private cleanUpListeners = (postId: EthereumAddress) => {
    this.playerMap[postId].videoElement.removeEventListener(
      "play",
      this.playerMap[postId].eventHandlers.play,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "pause",
      this.playerMap[postId].eventHandlers.pause,
    );
    this.playerMap[postId].videoElement.removeEventListener(
      "click",
      this.playerMap[postId].eventHandlers.click,
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
