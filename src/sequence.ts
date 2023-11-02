import {
  ChainIds,
  ILogEntry,
  LensStats,
  LitAuthSig,
  LogCategory,
  MilestoneEligibility,
  PlayerData,
  PlayerMetrics,
} from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import {
  CHAIN,
  INFURA_GATEWAY,
  KINORA_QUEST_DATA_CONTRACT,
  POINT_SCORES,
} from "./constants";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import {
  createTxData,
  decryptMetrics,
  encryptMetrics,
  hashHex,
  litExecute,
} from "./utils/lit-protocol";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import axios from "axios";
import getPublicationClient from "./graphql/queries/getPublicationClient";

export class Sequence extends EventEmitter {
  /**
   * @private
   * @type {boolean}
   * @description Flag to determine the mode of error handling; strict or not.
   */
  private errorHandlingModeStrict: boolean = false;

  /**
   * @private
   * @type {{ [playerId: string]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [playerId: string]: Metrics } = {};

  /**
   * @private
   * @type {{ [playerId: string]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [playerId: string]: PlayerData } = {};

  /**
   * @private
   * @type {string}
   * @description Developer key for multihash.
   */
  private multihashDevKey: string;

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
   * @type {LitAuthSig}
   * @description Lit Auth Signature.
   */
  private litAuthSig: LitAuthSig;

  /**
   * @private
   * @type {JsonRpcProvider}
   * @description JSON-RPC provider for interacting with the Polygon blockchain.
   */
  private polygonProvider: JsonRpcProvider;

  /**
   * @private
   * @type {string}
   * @description RPC URL for blockchain interactions.
   */
  private rpcURL: string;

  /**
   * @private
   * @type {number}
   * @description Quest envoker's profile Id.
   */
  private questEnvokerProfileId: number;

  /**
   * @private
   * @type {string}
   * @description Blockchain name/identifier.
   */
  private chain: string = CHAIN;

  /**
   * @private
   * @type {Object}
   * @description Quest envoker's PKP data including public key, token Id, and Ethereum address.
   */
  private questEnvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };

  /**
   * @private
   * @type {LitJsSdk.LitNodeClient}
   * @description Instance of LitJsSdk.LitNodeClient for managing LIT network interactions.
   */
  private litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: "cayenne",
    debug: false,
    alertWhenUnauthorized: true,
  });

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Metrics contract.
   */
  private kinoraMetricsContract: ethers.Contract;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest Data contract.
   */
  private kinoraQuestDataContract: ethers.Contract;

  constructor(
    questEnvokerProfileId: `0x${string}`,
    questEnvokerPKPData: {
      publicKey: `0x04${string}`;
      tokenId: string;
    },
    multihashDevKey: string,
    rpcURL: string,
    kinoraMetricsContract: `0x${string}`,
    errorHandlingModeStrict?: boolean,
  ) {
    super();
    this.multihashDevKey = multihashDevKey;
    this.questEnvokerPKPData = {
      publicKey: questEnvokerPKPData.publicKey,
      tokenId: questEnvokerPKPData.tokenId,
      ethAddress: ethers.utils.computeAddress(
        questEnvokerPKPData.publicKey,
      ) as `0x${string}`,
    };
    this.errorHandlingModeStrict = errorHandlingModeStrict;
    this.rpcURL = rpcURL;
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      this.rpcURL,
      ChainIds[this.chain],
    );
    this.kinoraMetricsContract = new ethers.Contract(
      kinoraMetricsContract,
      KinoraMetricsAbi,
    );
    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
    );

    this.questEnvokerProfileId = parseInt(questEnvokerProfileId, 16);
  }

  initializePlayer = (
    playerId: string,
    videoElement: HTMLVideoElement,
    litAuthSig: LitAuthSig,
  ): void => {
    if (!this.litAuthSig) this.litAuthSig = litAuthSig;

    const playerData = this.playerMap[playerId];
    if (!playerData) return;

    this.metrics[playerId] = new Metrics();

    const timeUpdateHandler = this.getTimeUpdateHandler(this.metrics[playerId]);

    this.playerMap[playerId] = {
      videoElement,
      eventHandlers: {
        play: this.metrics[playerId].onPlay,
        pause: this.metrics[playerId].onPause,
        timeupdate: timeUpdateHandler,
        click: this.metrics[playerId].onClick,
        seeking: this.metrics[playerId].onSkip,
        volumechange: this.metrics[playerId].onVolumeChange,
        fullscreenchange: this.metrics[playerId].onFullScreen,
        waiting: this.metrics[playerId].onBufferStart,
        playing: this.metrics[playerId].onBufferEnd,
      },
    };

    videoElement.addEventListener(
      "play",
      this.playerMap[playerId].eventHandlers.play,
    );
    videoElement.addEventListener(
      "pause",
      this.playerMap[playerId].eventHandlers.pause,
    );
    videoElement.addEventListener(
      "timeupdate",
      this.playerMap[playerId].eventHandlers.timeupdate,
    );
    videoElement.addEventListener(
      "click",
      this.playerMap[playerId].eventHandlers.click,
    );
    videoElement.addEventListener(
      "seeking",
      this.playerMap[playerId].eventHandlers.seeking,
    );
    videoElement.addEventListener(
      "volumechange",
      this.playerMap[playerId].eventHandlers.volumechange,
    );
    videoElement.addEventListener(
      "fullscreenchange",
      this.playerMap[playerId].eventHandlers.fullscreenchange,
    );
    videoElement.addEventListener(
      "waiting",
      this.playerMap[playerId].eventHandlers.waiting,
    );
    videoElement.addEventListener(
      "playing",
      this.playerMap[playerId].eventHandlers.playing,
    );
  };

  destroyPlayer = (playerId: string): void => {
    if (!this.playerMap[playerId]) return;
    this.cleanUpListeners(playerId);
    delete this.playerMap[playerId];
  };

  /**
   * @method
   * @description Collects and potentially encrypts player metrics for a quest, based on specified parameters. Ensures function is run in a browser environment with a video element present.
   * @param {string} playbackId - The playback Id for the quest.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {boolean} encrypt - A flag indicating whether to encrypt the metrics data.
   * @throws Will throw an error if run outside a browser environment, or if the video element is not detected.
   * @returns {Promise<string>} - Promise resolving to a JSON string containing the collected (and possibly encrypted) metrics data.
   */
  getPlayerMetrics = async (
    playbackId: string,
    pubId: string,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    encrypt: boolean,
  ): Promise<string> => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.litAuthSig)
      throw new Error("Generate and Set Lit Auth Sig before continuing.");
    if (!this.playerMap[playbackId])
      throw new Error(
        "Video element not detected. Make sure to set your Livepeer Player component in your app.",
      );

    try {
      const playerMetrics = await this.collectMetrics(
        playbackId,
        pubId,
        playerProfileId,
        playerProfileOwnerAddress,
      );
      let metrics = JSON.stringify(playerMetrics);
      if (encrypt) {
        const { error, message, encryptedString } = await encryptMetrics(
          metrics,
          this.questEnvokerPKPData.ethAddress,
          playerProfileOwnerAddress,
          this.litAuthSig,
          this.litNodeClient,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player encrypt metrics failed.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(`Error encrypting player metrics: ${message}`);
          }
          return;
        } else {
          metrics = encryptedString;
        }
      }

      return metrics;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Send metrics on-chain failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error sending metrics on-chain: ${err.message}`);
      }
    }
  };

  /**
   * @method sendMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} playbackId - The playback Id associated with the metrics.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} playerMetricsHash - The hash of the player's metrics.
   * @param {string} litActionHash - The hash of the LIT action.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {boolean} metricsEncrypted - Flag indicating whether the metrics are encrypted.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (
    playbackId: string,
    playerProfileId: string,
    playerMetricsHash: string,
    litActionHash: string,
    pubId: string,
    metricsEncrypted: boolean,
  ): Promise<void> => {
    if (!this.questEnvokerPKPData.publicKey)
      throw new Error("Set questEnvoker PKP Public Key before continuing.");
    if (!this.questEnvokerPKPData.tokenId)
      throw new Error("Set questEnvoker PKP Token Id before continuing.");
    if (!this.kinoraMetricsContract)
      throw new Error("Set Kinora Metrics Address before continuing.");
    if (!this.litAuthSig)
      throw new Error("Generate and Set Lit Auth Sig before continuing.");
    try {
      const metricsToSend = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${playerMetricsHash}`,
      );

      const parsed: PlayerMetrics = await JSON.parse(metricsToSend.data);

      const pointScore =
        parsed.totalViewDuration * POINT_SCORES.totalDuration +
        (parsed.hasActed ? POINT_SCORES.acted : 0) +
        (parsed.hasMirrored ? POINT_SCORES.mirrored : 0) +
        (parsed.hasBookmarked ? POINT_SCORES.bookmarked : 0) +
        (parsed.hasNotInterested ? POINT_SCORES.notInterested : 0) +
        (parsed.hasReacted ? POINT_SCORES.reacted : 0) +
        parsed.averageAvd * POINT_SCORES.avd +
        parsed.totalFullScreenCount * POINT_SCORES.fullScreenCount;

      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraMetricsAbi,
        "addPlayerMetrics",
        [
          playbackId,
          "ipfs://" + playerMetricsHash,
          playerProfileId,
          pubId,
          pointScore,
          metricsEncrypted,
        ],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on Add Player Metrics.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on Add Player Metrics: ${txMessage}`,
          );
        }

        return;
      }

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "addPlayerMetrics",
        this.litAuthSig,
        litActionHash,
        this.questEnvokerPKPData.publicKey,
        this.multihashDevKey,
        hashHex(this.questEnvokerProfileId.toString()),
      );

      if (error) {
        this.log(
          LogCategory.ERROR,
          `Player add Metrics on-chain failed on Broadcast.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error adding Player Metrics and broadcasting: ${message}`,
          );
        }
        return;
      } else {
        this.metrics[playbackId].reset();

        this.log(
          LogCategory.RESPONSE,
          `Player Metrics added successfully. Lit Action Response.`,
          litResponse,
          new Date().toISOString(),
        );
        this.log(
          LogCategory.BROADCAST,
          `Broadcast on-chain.`,
          txHash,
          new Date().toISOString(),
        );
      }
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Send metrics on-chain failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error sending metrics on-chain: ${err.message}`);
      }
    }
  };

  /**
   * @method verifyPlayerMilestoneComplete
   * @description This function is responsible for verifying if a player has completed a milestone in a quest, and updates the blockchain accordingly. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {number} milestone - The milestone number.
   * @param {string} litActionMilestoneHash - The hash of the LIT action for the milestone.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<Object>} - A Promise that resolves to an object containing a check result indicating whether the milestone verification succeeded.
   */
  verifyPlayerMilestoneComplete = async (
    playerProfileId: string,
    pubId: string,
    playbackId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
    litActionMilestoneHash: string,
  ): Promise<boolean> => {
    if (!this.litAuthSig)
      throw new Error("Generate and Set Lit Auth Sig before continuing.");
    try {
      const passed = await this.checkQuestMilestoneMetrics(
        playerProfileId,
        pubId,
        playerProfileOwnerAddress,
        milestone,
      );

      if (passed) {
        const {
          error: txError,
          message: txMessage,
          generatedTxData,
        } = await createTxData(
          this.polygonProvider,
          KinoraMetricsAbi,
          "playerEligibleToClaimMilestone",
          [parseInt(pubId, 16), milestone, parseInt(playerProfileId, 16), true],
        );

        if (txError) {
          this.log(
            LogCategory.ERROR,
            `Generate Tx data error on Add Player Metrics.`,
            txMessage,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error generating Tx data on Add Player Metrics: ${txMessage}`,
            );
          }

          return;
        }

        const hashKeyItem =
          await this.kinoraQuestDataContract.getQuestMilestoneCompletionConditionHash(
            this.questEnvokerProfileId,
            parseInt(pubId, 16),
            milestone,
          );

        const { txHash, error, message, litResponse } = await litExecute(
          this.polygonProvider,
          this.litNodeClient,
          generatedTxData,
          "playerEligibleToClaimMilestone",
          this.litAuthSig,
          litActionMilestoneHash,
          this.questEnvokerPKPData.publicKey,
          this.multihashDevKey,
          hashKeyItem, // GENERAL HASH!!,
        );

        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player Update Eligible status on-chain failed on Broadcast.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error updating Player Eligibility status and broadcasting: ${message}`,
            );
          }
          return;
        } else {
          this.metrics[playbackId].reset();

          this.log(
            LogCategory.RESPONSE,
            `Player Eligibility status updated successfully. Lit Action Response.`,
            litResponse,
            new Date().toISOString(),
          );
          this.log(
            LogCategory.BROADCAST,
            `Broadcast on-chain.`,
            txHash,
            new Date().toISOString(),
          );
        }

        return true;
      } else {
        return false;
      }
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Verify Player Milestone Complete failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(
          `Error verifying Player milestone complete: ${err.message}`,
        );
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
   * @throws Will throw an error if not used in a browser environment or if the video element is not found.
   * @private
   */
  private cleanUpListeners = (playerId: string) => {
    this.playerMap[playerId].videoElement.removeEventListener(
      "play",
      this.playerMap[playerId].eventHandlers.play,
    );
    this.playerMap[playerId].videoElement.removeEventListener(
      "pause",
      this.playerMap[playerId].eventHandlers.pause,
    );
    this.playerMap[playerId].videoElement.removeEventListener(
      "timeupdate",
      this.playerMap[playerId].eventHandlers.timeupdate,
    );
    this.playerMap[playerId].videoElement.removeEventListener(
      "click",
      this.playerMap[playerId].eventHandlers.click,
    );
    this.playerMap[playerId].videoElement.removeEventListener(
      "seeking",
      this.playerMap[playerId].eventHandlers.seeking,
    );

    this.playerMap[playerId].videoElement.removeEventListener(
      "volumechange",
      this.playerMap[playerId].eventHandlers.volumechange,
    );
    this.playerMap[playerId].videoElement.removeEventListener(
      "fullscreenchange",
      this.playerMap[playerId].eventHandlers.fullscreenchange,
    );

    this.playerMap[playerId].videoElement.removeEventListener(
      "waiting",
      this.playerMap[playerId].eventHandlers.waiting,
    );

    this.playerMap[playerId].videoElement.removeEventListener(
      "playing",
      this.playerMap[playerId].eventHandlers.playing,
    );
  };

  /**
   * @method getTimeUpdateHandler
   * @description Event handler for video 'timeupdate' event, updates metrics and checks for bounce condition.
   * @param {Metrics} metrics - The metrics object.
   * @private
   */
  private getTimeUpdateHandler = (metrics: Metrics) => {
    return (e: Event) => {
      const currentTime = (e.currentTarget as HTMLVideoElement).currentTime;
      metrics.onTimeUpdate(currentTime);
      if (currentTime < 10) {
        metrics.onBounce();
      }
    };
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

  /**
   * @method collectMetrics
   * @description Collects and aggregates player metrics from both current and past interactions, integrating publication interactions.
   * @param {string} playbackId - The playback Id related to the player metrics.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @returns {Promise<PlayerMetrics>} - A Promise resolving to an aggregated PlayerMetrics object.
   * @throws Will throw an error if any issue occurs during metrics collection or aggregation.
   * @private
   */
  private collectMetrics = async (
    playbackId: string,
    pubId: string,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
  ): Promise<PlayerMetrics> => {
    let playerMetrics: PlayerMetrics;
    try {
      const existingMetrics =
        await this.kinoraMetricsContract.getPlayerPlaybackIdMetricsHash(
          playbackId,
          playerProfileId,
          this.questEnvokerProfileId,
          pubId,
        );

      const { data } = await getPublicationClient({
        forId: pubId,
      });

      const lensStats: LensStats = (data?.publication.__typename === "Post" ||
        data?.publication.__typename === "Comment") && {
        hasReacted: data?.publication?.operations.hasReacted,
        hasMirrored: data?.publication.operations.hasMirrored,
        hasActed: data?.publication.operations.hasActed.isFinalisedOnchain,
        hasNotInterested: data?.publication?.operations?.isNotInterested,
        hasBookmarked: data?.publication.operations.hasBookmarked,
      };

      if (existingMetrics) {
        const oldMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${existingMetrics?.split("ipfs://")[1]}`,
        );

        let oldMetricsValues: string = await JSON.parse(oldMetricsToParse.data);

        const isEncrypted =
          this.kinoraMetricsContract.getPlayerPlaybackIdMetricsEncrypted(
            playbackId,
            playerProfileId,
            this.questEnvokerProfileId,
            pubId,
          );

        if (isEncrypted) {
          const {
            error: decryptError,
            message,
            decryptedString,
          } = await decryptMetrics(
            await JSON.parse(oldMetricsValues),
            this.questEnvokerPKPData.ethAddress,
            playerProfileOwnerAddress,
            this.litAuthSig,
            this.litNodeClient,
          );

          if (decryptError) {
            this.log(
              LogCategory.ERROR,
              `Decrypt previously collected metrics failed.`,
              message,
              new Date().toISOString(),
            );
            if (this.errorHandlingModeStrict) {
              throw new Error(
                `Error decrypting player collected metrics: ${message}`,
              );
            }
            return;
          } else {
            oldMetricsValues = await JSON.parse(decryptedString);
          }
        }

        const oldMetrics: PlayerMetrics = await JSON.parse(oldMetricsValues);

        playerMetrics = {
          rawTotalDuration: this.metrics[playbackId].getTotalDuration(),
          rawPlayCount: this.metrics[playbackId].getPlayCount(),
          rawPauseCount: this.metrics[playbackId].getPauseCount(),
          rawSkipCount: this.metrics[playbackId].getSkipCount(),
          rawClickCount: this.metrics[playbackId].getClickCount(),
          rawImpressionCount: this.metrics[playbackId].getImpressionCount(),
          rawBounceCount: this.metrics[playbackId].getBounceCount(),
          rawBounceRate: this.metrics[playbackId].getBounceRate(),
          rawVolumeChangeCount: this.metrics[playbackId].getVolumeChangeCount(),
          rawFullScreenCount: this.metrics[playbackId].getFullScreenCount(),
          rawBufferCount: this.metrics[playbackId].getBufferCount(),
          rawBufferDuration: this.metrics[playbackId].getBufferDuration(),
          rawEngagementRate: this.metrics[playbackId].getEngagementRate(
            this.playerMap[playbackId].videoElement.duration,
          ),
          rawPreferredTimeToWatch:
            this.metrics[playbackId].getMostPreferredTimeToWatch(),
          rawMostViewedSegment: this.metrics[playbackId].getMostViewedSegment(),
          rawInteractionRate: this.metrics[playbackId].getInteractionRate(),
          rawMostReplayedArea: this.metrics[playbackId].getMostReplayedArea(),
          rawPlayPauseRatio: this.metrics[playbackId].getPlayPauseRatio(),
          rawCtr: this.metrics[playbackId].getCTR(),
          rawAvd: this.metrics[playbackId].getAVD(),
          totalViewDuration:
            this.metrics[playbackId].getTotalDuration() +
            oldMetrics.totalViewDuration,
          totalFullScreenCount:
            this.metrics[playbackId].getFullScreenCount() +
            oldMetrics.totalFullScreenCount,
          totalPlayCount:
            this.metrics[playbackId].getPlayCount() + oldMetrics.totalPlayCount,
          totalPauseCount:
            this.metrics[playbackId].getPauseCount() +
            oldMetrics.totalPauseCount,
          totalSkipCount:
            this.metrics[playbackId].getSkipCount() + oldMetrics.totalSkipCount,
          totalClickCount:
            this.metrics[playbackId].getClickCount() +
            oldMetrics.totalClickCount,
          totalVolumeChangeCount:
            this.metrics[playbackId].getVolumeChangeCount() +
            oldMetrics.totalVolumeChangeCount,
          totalBufferCount:
            this.metrics[playbackId].getBufferCount() +
            oldMetrics.totalBufferCount,
          averageBounceRate:
            oldMetrics.rawImpressionCount +
              this.metrics[playbackId].getImpressionCount() ===
            0
              ? oldMetrics.averageBounceRate
              : ((oldMetrics.rawBounceCount +
                  this.metrics[playbackId].getBounceCount()) /
                  (oldMetrics.rawImpressionCount +
                    this.metrics[playbackId].getImpressionCount())) *
                100,
          averageBufferDuration:
            oldMetrics.rawBufferCount +
              this.metrics[playbackId].getBufferCount() ===
            0
              ? oldMetrics.averageBufferDuration
              : (oldMetrics.rawBufferDuration +
                  this.metrics[playbackId].getBufferDuration()) /
                (oldMetrics.rawBufferCount +
                  this.metrics[playbackId].getBufferCount()),
          averageEngagementRate:
            (oldMetrics.rawPlayCount +
              this.metrics[playbackId].getPlayCount()) *
              this.playerMap[playbackId].videoElement.duration ===
            0
              ? oldMetrics.averageEngagementRate
              : ((oldMetrics.rawTotalDuration +
                  this.metrics[playbackId].getTotalDuration()) /
                  ((oldMetrics.rawPlayCount +
                    this.metrics[playbackId].getPlayCount()) *
                    this.playerMap[playbackId].videoElement.duration)) *
                100,
          averagePlayPauseRatio:
            oldMetrics.rawPauseCount +
              this.metrics[playbackId].getPauseCount() ===
            0
              ? oldMetrics.averagePlayPauseRatio
              : (oldMetrics.rawPlayCount +
                  this.metrics[playbackId].getPlayCount()) /
                (oldMetrics.rawPauseCount +
                  this.metrics[playbackId].getPauseCount()),
          averageCtr:
            oldMetrics.rawImpressionCount +
              this.metrics[playbackId].getImpressionCount() ===
            0
              ? oldMetrics.averageCtr
              : ((oldMetrics.rawClickCount +
                  this.metrics[playbackId].getClickCount()) /
                  (oldMetrics.rawImpressionCount +
                    this.metrics[playbackId].getImpressionCount())) *
                100,
          averageAvd:
            oldMetrics.rawPlayCount +
              this.metrics[playbackId].getPlayCount() ===
            0
              ? oldMetrics.averageAvd
              : (oldMetrics.rawTotalDuration +
                  this.metrics[playbackId].getTotalDuration()) /
                (oldMetrics.rawPlayCount +
                  this.metrics[playbackId].getPlayCount()),
          hasMirrored: lensStats.hasMirrored,
          hasReacted: lensStats.hasReacted,
          hasBookmarked: lensStats.hasBookmarked,
          hasActed: lensStats.hasActed,
          hasNotInterested: lensStats.hasNotInterested,
        };
      } else {
        playerMetrics = {
          rawTotalDuration: this.metrics[playbackId].getTotalDuration(),
          rawPlayCount: this.metrics[playbackId].getPlayCount(),
          rawPauseCount: this.metrics[playbackId].getPauseCount(),
          rawSkipCount: this.metrics[playbackId].getSkipCount(),
          rawClickCount: this.metrics[playbackId].getClickCount(),
          rawImpressionCount: this.metrics[playbackId].getImpressionCount(),
          rawBounceCount: this.metrics[playbackId].getBounceCount(),
          rawBounceRate: this.metrics[playbackId].getBounceRate(),
          rawVolumeChangeCount: this.metrics[playbackId].getVolumeChangeCount(),
          rawFullScreenCount: this.metrics[playbackId].getFullScreenCount(),
          rawPreferredTimeToWatch:
            this.metrics[playbackId].getMostPreferredTimeToWatch(),
          rawMostViewedSegment: this.metrics[playbackId].getMostViewedSegment(),
          rawInteractionRate: this.metrics[playbackId].getInteractionRate(),
          rawBufferCount: this.metrics[playbackId].getBufferCount(),
          rawBufferDuration: this.metrics[playbackId].getBufferDuration(),
          rawEngagementRate: this.metrics[playbackId].getEngagementRate(
            this.playerMap[playbackId].videoElement.duration,
          ),
          rawMostReplayedArea: this.metrics[playbackId].getMostReplayedArea(),
          rawPlayPauseRatio: this.metrics[playbackId].getPlayPauseRatio(),
          rawCtr: this.metrics[playbackId].getCTR(),
          rawAvd: this.metrics[playbackId].getAVD(),
          totalViewDuration: this.metrics[playbackId].getTotalDuration(),
          totalFullScreenCount: this.metrics[playbackId].getFullScreenCount(),
          totalPlayCount: this.metrics[playbackId].getPlayCount(),
          totalPauseCount: this.metrics[playbackId].getPauseCount(),
          totalSkipCount: this.metrics[playbackId].getSkipCount(),
          totalClickCount: this.metrics[playbackId].getClickCount(),
          totalVolumeChangeCount:
            this.metrics[playbackId].getVolumeChangeCount(),
          totalBufferCount: this.metrics[playbackId].getBufferCount(),
          hasMirrored: lensStats.hasMirrored,
          hasReacted: lensStats.hasReacted,
          hasBookmarked: lensStats.hasBookmarked,
          hasActed: lensStats.hasActed,
          hasNotInterested: lensStats.hasNotInterested,
        };
      }

      this.log(
        LogCategory.METRICS,
        `Player metrics updated.`,
        JSON.stringify(playerMetrics),
        new Date().toISOString(),
      );

      return playerMetrics;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Get Player Quest metrics failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error getting Player metrics: ${err.message}`);
      }
    }
  };

  /**
   * @method checkQuestMilestoneMetrics
   * @description Checks whether the player's metrics meet the milestone requirements.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @param {number} milestone - The milestone number.
   * @returns {Promise<boolean>} - A Promise resolving to a boolean indicating whether the milestone requirements are met.
   * @throws Will throw an error if any issue occurs during the milestone check.
   * @private
   */
  private checkQuestMilestoneMetrics = async (
    playerProfileId: string,
    pubId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
  ): Promise<boolean> => {
    try {
      let playerEligible = false;

      const hashedCompletion =
        await this.kinoraQuestDataContract.getQuestMilestoneCompletionConditionHash(
          this.questEnvokerProfileId,
          parseInt(pubId, 16),
          milestone,
        );

      const toParseCompletion = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${hashedCompletion?.split("ipfs://")[1]}`,
      );

      const uriParsed: MilestoneEligibility[] = await JSON.parse(
        toParseCompletion.data,
      );

      playerEligible = await this.metricComparison(
        uriParsed,
        playerProfileId,
        playerProfileOwnerAddress,
        pubId,
      );

      return playerEligible;
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Check Quest metrics failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error checking Quest metrics: ${err.message}`);
      }
    }
  };

  /**
   * @method metricComparison
   * @description Compares player metrics against eligibility criteria for quest milestone completion.
   * @param {MilestoneEligibility[]} eligibilityCriteria - The eligibility criteria array.
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @returns {Promise<boolean>} - A Promise resolving to a boolean indicating whether the player meets the eligibility criteria.
   * @private
   */
  private metricComparison = async (
    eligibilityCriteria: MilestoneEligibility[],
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    pubId: string,
  ): Promise<boolean> => {
    let result = true;
    for (let i = 0; i < eligibilityCriteria.length; i++) {
      if (eligibilityCriteria[i].playbackId) {
        let currentMetricsHash: string =
          await this.kinoraQuestDataContract.getPlayerPlaybackIdMetricsHash(
            eligibilityCriteria[i].playbackId,
            parseInt(playerProfileId, 16),
            this.questEnvokerProfileId,
            parseInt(pubId, 16),
          );

        const currentMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${currentMetricsHash}`,
        );

        let currentMetrics = await JSON.parse(currentMetricsToParse.data);

        const encrypted =
          await this.kinoraQuestDataContract.getPlayerPlaybackIdMetricsEncrypted(
            eligibilityCriteria[i].playbackId,
            parseInt(playerProfileId, 16),
            this.questEnvokerProfileId,
            parseInt(pubId, 16),
          );

        if (encrypted) {
          const { error, message, decryptedString } = await decryptMetrics(
            await JSON.parse(currentMetrics),
            this.questEnvokerPKPData.ethAddress,
            playerProfileOwnerAddress,
            this.litAuthSig,
            this.litNodeClient,
          );

          if (error) {
            this.log(
              LogCategory.ERROR,
              `Player decrypt collected metrics failed.`,
              message,
              new Date().toISOString(),
            );
            if (this.errorHandlingModeStrict) {
              throw new Error(
                `Error decrypting player collected metrics: ${message}`,
              );
            }
            return;
          } else {
            currentMetrics = decryptedString;
          }
        }

        const currentPlayerMetrics: PlayerMetrics = await JSON.parse(
          currentMetrics,
        );

        for (const key in eligibilityCriteria[i].criteria) {
          const criteria =
            eligibilityCriteria[i].criteria[key as keyof MilestoneEligibility];

          if (!criteria) continue;

          const playerValue = currentPlayerMetrics[key as keyof PlayerMetrics];
          const conditions: boolean[] = [];

          if ("minValue" in criteria && "maxValue" in criteria) {
            if (typeof playerValue === "number") {
              conditions.push(playerValue >= criteria.minValue);
              conditions.push(playerValue <= criteria.maxValue);
            }
          } else if ("boolValue" in criteria) {
            if (typeof playerValue === "boolean") {
              conditions.push(playerValue === criteria.boolValue);
            }
          }

          if (criteria.operator === "and") {
            if (!conditions.every(Boolean)) {
              result = false;
            }
          } else if (criteria.operator === "or") {
            if (!conditions.some(Boolean)) {
              result = false;
            }
          }
        }

        if (!result) {
          return false;
        }
      }

      if (eligibilityCriteria[i].totalPointScore) {
        if (
          (await this.kinoraQuestDataContract.getPlayerTotalPointScore(
            parseInt(playerProfileId, 16),
          )) < eligibilityCriteria[i].totalPointScore
        ) {
          result = false;
        }
      }
    }

    return result;
  };
}
