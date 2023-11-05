import {
  ChainIds,
  ILogEntry,
  LensKeys,
  LensStats,
  LitAuthSig,
  LogCategory,
  MetricKeys,
  MilestoneEligibility,
  MilestoneEligibilityCriteria,
  PlayerData,
  PlayerMetrics,
} from "./@types/kinora-sdk";
import { Metrics } from "./metrics";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { CHAIN, INFURA_GATEWAY, KINORA_QUEST_DATA_CONTRACT } from "./constants";
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
import KinoraQuestAbi from "./abis/KinoraMetrics.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import axios from "axios";
import getPublicationClient from "./graphql/queries/getPublicationClient";
import { Post } from "./@types/generated";
import getMetrics from "./graphql/queries/getMetrics";

export class Sequence extends EventEmitter {
  /**
   * @private
   * @type {boolean}
   * @description Flag to determine the mode of error handling; strict or not.
   */
  private errorHandlingModeStrict: boolean = false;

  /**
   * @private
   * @type {{ [playbackId: string]: Metrics } }
   * @description Instance of Metrics class for each Player to handle metric data.
   */
  private metrics: { [playbackId: string]: Metrics } = {};

  /**
   * @private
   * @type {{ [playbackId: string]: PlayerData }}
   * @description Livepeer Player mapping.
   */
  private playerMap: { [playbackId: string]: PlayerData } = {};

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
   * @type {boolean}
   * @description Player metric data encrypted.
   */
  private encrypted: boolean = false;

  /**
   * @private
   * @type {string}
   * @description Player Lens profile Id.
   */
  private playerProfileId: string;

  /**
   * @private
   * @type {`0x${string}`}
   * @description Player profile address.
   */
  private playerProfileOwnerAddress: `0x${string}`;

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

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Kinora Quest contract.
   */
  private kinoraQuestContract: ethers.Contract;

  /**
   * Constructs an instance of the enclosing class, initializing necessary properties and contracts.
   *
   * @param questEnvokerProfileId - A string representing the quest envoker's Lens Profile Id.
   * @param questEnvokerPKPData - An object containing public key and token ID of the quest envoker.
   * @param multihashDevKey - A string representing the multihash developer key.
   * @param rpcURL - A string representing the URL of the RPC server.
   * @param kinoraMetricsContract - A string representing the address of the Kinora Metrics contract.
   * @param kinoraQuestContract - A string representing the address of the Kinora Metrics contract.
   * @param errorHandlingModeStrict - A boolean indicating whether the error handling mode is strict. Optional.
   */
  constructor(
    questEnvokerProfileId: `0x${string}`,
    questEnvokerPKPData: {
      publicKey: `0x04${string}`;
      tokenId: string;
    },
    multihashDevKey: string,
    rpcURL: string,
    kinoraMetricsContract: `0x${string}`,
    kinoraQuestContract: `0x${string}`,
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
    this.kinoraQuestContract = new ethers.Contract(
      kinoraQuestContract,
      KinoraQuestAbi,
    );
    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
    );

    this.questEnvokerProfileId = parseInt(questEnvokerProfileId, 16);
  }

  /**
   * Initializes a Livepeer video player with given Id and associates event handlers to the video element.
   *
   * @param playbackId - A string representing the Livepeer playback Id.
   * @param pubId - Lens publication Id associated with the video.
   * @param videoElement - The HTML video element associated with the player.
   * @param litAuthSig - The Lit authorization signature.
   */
  initializePlayer = (
    playbackId: string,
    pubId: string,
    videoElement: HTMLVideoElement,
    litAuthSig: LitAuthSig,
  ): void => {
    if (!this.litAuthSig) this.litAuthSig = litAuthSig;

    const playerData = this.playerMap[playbackId];
    if (!playerData) return;

    this.metrics[playbackId] = new Metrics();

    const timeUpdateHandler = this.getTimeUpdateHandler(
      this.metrics[playbackId],
    );

    this.playerMap[playbackId] = {
      videoElement,
      pubId,
      eventHandlers: {
        play: this.metrics[playbackId].onPlay,
        pause: this.metrics[playbackId].onPause,
        timeupdate: timeUpdateHandler,
        click: this.metrics[playbackId].onClick,
        seeking: this.metrics[playbackId].onSkip,
        volumechange: this.metrics[playbackId].onVolumeChange,
        fullscreenchange: this.metrics[playbackId].onFullScreen,
        waiting: this.metrics[playbackId].onBufferStart,
        playing: this.metrics[playbackId].onBufferEnd,
      },
    };

    videoElement.addEventListener(
      "play",
      this.playerMap[playbackId].eventHandlers.play,
    );
    videoElement.addEventListener(
      "pause",
      this.playerMap[playbackId].eventHandlers.pause,
    );
    videoElement.addEventListener(
      "timeupdate",
      this.playerMap[playbackId].eventHandlers.timeupdate,
    );
    videoElement.addEventListener(
      "click",
      this.playerMap[playbackId].eventHandlers.click,
    );
    videoElement.addEventListener(
      "seeking",
      this.playerMap[playbackId].eventHandlers.seeking,
    );
    videoElement.addEventListener(
      "volumechange",
      this.playerMap[playbackId].eventHandlers.volumechange,
    );
    videoElement.addEventListener(
      "fullscreenchange",
      this.playerMap[playbackId].eventHandlers.fullscreenchange,
    );
    videoElement.addEventListener(
      "waiting",
      this.playerMap[playbackId].eventHandlers.waiting,
    );
    videoElement.addEventListener(
      "playing",
      this.playerMap[playbackId].eventHandlers.playing,
    );
  };

  /**
   * Destroys a player with given playback Id, cleaning up event listeners and removing video data.
   *
   * @param playbackId - A string representing the Livepeer playback Id.
   */
  destroyPlayer = (playbackId: string): void => {
    if (!this.playerMap[playbackId]) return;
    this.cleanUpListeners(playbackId);
    delete this.playerMap[playbackId];
  };

  /**
   * @method getPlayerMetrics
   * @description Collects and potentially encrypts player metrics for a quest, based on specified parameters. Ensures function is run in a browser environment with a video element present.
   * @param {string} playerProfileId - The Lens Profile Id of the player.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {boolean} encrypt - A flag indicating whether to encrypt the metrics data.
   * @throws Will throw an error if run outside a browser environment, or if the video element is not detected.
   * @returns {Promise<string>} - Promise resolving to an array of JSON strings containing the collected (and possibly encrypted) metrics data.
   */
  getPlayerMetrics = async (
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    encrypt: boolean,
  ): Promise<string[]> => {
    if (typeof window === "undefined") {
      throw new Error(
        "This function can only be used in a browser environment.",
      );
    }
    if (!this.litAuthSig)
      throw new Error("Generate and Set Lit Auth Sig before continuing.");
    if (Object.keys(this.playerMap).length === 0)
      throw new Error(
        "No video elements detected. Make sure to set your Livepeer Player component in your app.",
      );

    try {
      let metricsArray: string[] = [];
      for (let playbackId in this.playerMap) {
        const playerMetrics = await this.collectMetrics(
          playbackId,
          playerProfileId,
          playerProfileOwnerAddress,
        );
        let metrics = JSON.stringify(playerMetrics);
        metricsArray.push(metrics);
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
            metricsArray.push(encryptedString);
          }
        }
      }

      this.encrypted = encrypt;
      this.playerProfileId = playerProfileId;
      this.playerProfileOwnerAddress = playerProfileOwnerAddress;

      return metricsArray;
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
   * @param {string[]} playerMetricsHashes - The hashes of the player's metrics.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  sendMetricsOnChain = async (playerMetricsHashes: string[]): Promise<void> => {
    if (!this.questEnvokerPKPData.publicKey)
      throw new Error("Set questEnvoker PKP Public Key before continuing.");
    if (!this.questEnvokerPKPData.tokenId)
      throw new Error("Set questEnvoker PKP Token Id before continuing.");
    if (!this.kinoraMetricsContract || !this.kinoraQuestContract)
      throw new Error(
        "Set Kinora Metrics and Quest Address before continuing.",
      );
    if (
      !this.encrypted ||
      !this.playerProfileId ||
      this.playerProfileOwnerAddress
    )
      throw new Error(
        "Set the player profile, encrypt and address details before calling this function.",
      );
    if (!this.litAuthSig)
      throw new Error("Generate and Set Lit Auth Sig before continuing.");
    if (Object.keys(this.playerMap).length === 0)
      throw new Error(
        "No video elements detected. Make sure to set your Livepeer Player component in your app.",
      );

    const litActionHash = await this.kinoraQuestContract.metricsHash();

    try {
      let i = 0;
      for (let playbackId in this.playerMap) {
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
            "ipfs://" + playerMetricsHashes[i],
            this.playerProfileId,
            this.playerProfileId,
            this.encrypted,
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

        i++;
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
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<Object>} - A Promise that resolves to an object containing a check result indicating whether the milestone verification succeeded.
   */
  verifyPlayerMilestoneComplete = async (
    playerProfileId: string,
    pubId: string,
    playerProfileOwnerAddress: `0x${string}`,
    milestone: number,
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
          await this.kinoraQuestDataContract.getQuestMilestoneCompletionCriteria(
            this.questEnvokerProfileId,
            parseInt(pubId, 16),
            milestone,
          );

        const litActionHash =
          await this.kinoraQuestDataContract.getQuestMilestonesLitActionHash(
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
          litActionHash,
          this.questEnvokerPKPData.publicKey,
          this.multihashDevKey,
          hashKeyItem,
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
          Object.keys(this.playerMap).forEach((playbackId) => {
            this.metrics[playbackId].reset();
          });

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
   * @param {string} playerProfileId - The player's Lens Profile Id.
   * @param {string} playerProfileOwnerAddress - The Ethereum address of the player's profile owner.
   * @returns {Promise<PlayerMetrics>} - A Promise resolving to an aggregated PlayerMetrics object.
   * @throws Will throw an error if any issue occurs during metrics collection or aggregation.
   * @private
   */
  private collectMetrics = async (
    playbackId: string,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
  ): Promise<PlayerMetrics> => {
    let playerMetrics: PlayerMetrics;
    try {
      const existingMetrics = await getMetrics({
        playbackId,
        questEnvokerProfileId: this.questEnvokerProfileId,
        playerProfileId: parseInt(playerProfileId, 16),
      });

      const { data } = await getPublicationClient({
        forId: this.playerMap[playbackId].pubId,
      });

      const lensStats: LensStats = {
        hasQuoted: (data?.publication as Post)?.operations?.hasQuoted,
        hasReacted: (data?.publication as Post)?.operations.hasReacted,
        hasMirrored: (data?.publication as Post)?.operations.hasMirrored,
        hasActed: (data?.publication as Post)?.operations.hasActed
          .isFinalisedOnchain,
        hasNotInterested: (data?.publication as Post)?.operations
          ?.isNotInterested,
        hasBookmarked: (data?.publication as Post)?.operations.hasBookmarked,
      };

      if (existingMetrics) {
        const oldMetricsToParse = await axios.get(
          `${INFURA_GATEWAY}/ipfs/${existingMetrics[0]?.split("ipfs://")[1]}`,
        );

        let oldMetricsValues: string = await JSON.parse(oldMetricsToParse.data);

        const isEncrypted =
          this.kinoraMetricsContract.getPlayerPlaybackIdMetricsEncrypted(
            playbackId,
            playerProfileId,
            this.questEnvokerProfileId,
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
          hasQuoted: lensStats.hasQuoted,
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
          hasQuoted: lensStats.hasQuoted,
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
        await this.kinoraQuestDataContract.getQuestMilestoneCompletionCriteria(
          this.questEnvokerProfileId,
          parseInt(pubId, 16),
          milestone,
        );

      const toParseCompletion = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${hashedCompletion?.split("ipfs://")[1]}`,
      );

      const uriParsed: MilestoneEligibility = await JSON.parse(
        toParseCompletion.data,
      );

      playerEligible = await this.metricComparison(
        uriParsed,
        playerProfileId,
        playerProfileOwnerAddress,
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
   * @returns {Promise<boolean>} - A Promise resolving to a boolean indicating whether the player meets the eligibility criteria.
   * @private
   */
  private metricComparison = async (
    eligibilityCriteria: MilestoneEligibility,
    playerProfileId: string,
    playerProfileOwnerAddress: `0x${string}`,
    encrypted?: boolean,
  ): Promise<boolean> => {
    let result = true;

    if (eligibilityCriteria.internalPlaybackCriteria) {
      for (
        let i = 0;
        i < eligibilityCriteria.internalPlaybackCriteria.length;
        i++
      ) {
        let metrics: PlayerMetrics;
        let { data, error } = await getMetrics({
          questEnvokerProfileId: this.questEnvokerProfileId,
          playerProfileId: parseInt(playerProfileId, 16),
          playbackId:
            eligibilityCriteria.internalPlaybackCriteria[i].playbackId,
          encrypted: encrypted,
        });

        if (data) {
          if (data[0].encrypted) {
            const { error, message, decryptedString } = await decryptMetrics(
              await JSON.parse(data[0].json),
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
              const currentMetrics = decryptedString;
              metrics = await JSON.parse(currentMetrics);
            }
          } else {
            metrics = Object.fromEntries(
              Object.entries(data[0]).filter(
                ([key]) =>
                  ![
                    "profileId",
                    "playerProfileId",
                    "playbackId",
                    "encrypted",
                    "json",
                  ].includes(key) &&
                  !key.startsWith("globalAverage") &&
                  !key.startsWith("internalAverage"),
              ),
            ) as PlayerMetrics;
          }
        } else {
          this.log(
            LogCategory.ERROR,
            `Error on get metrics for comparison.`,
            error.message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error getting metrics for comparison: ${error.message}`,
            );
          }
        }

        result = await this.checkValues(
          eligibilityCriteria.internalPlaybackCriteria[i].playbackCriteria,
          metrics,
        );

        if (!result) {
          return false;
        }
      }

      if (!result) {
        return false;
      }
    }

    if (eligibilityCriteria.averageGlobalPlaybackCriteria) {
      for (
        let i = 0;
        i < eligibilityCriteria.averageGlobalPlaybackCriteria.length;
        i++
      ) {
        let { data, error } = await getMetrics({
          playerProfileId: parseInt(playerProfileId, 16),
          playbackId:
            eligibilityCriteria.averageGlobalPlaybackCriteria[i].playbackId,
          encrypted: false,
        });

        if (data) {
          const averagePlayerMetrics: PlayerMetrics = {} as PlayerMetrics;
          const firstData = Object.fromEntries(
            Object.entries(data[0]).filter(
              ([key]) =>
                ![
                  "profileId",
                  "playerProfileId",
                  "playbackId",
                  "encrypted",
                  "json",
                ].includes(key) &&
                !key.startsWith("globalAverage") &&
                !key.startsWith("internalAverage"),
            ),
          ) as PlayerMetrics;

          const allPlayerMetrics: PlayerMetrics[] = data.map((obj) =>
            Object.fromEntries(
              Object.entries(obj).filter(
                ([key]) =>
                  ![
                    "profileId",
                    "playerProfileId",
                    "playbackId",
                    "encrypted",
                    "json",
                  ].includes(key) &&
                  !key.startsWith("globalAverage") &&
                  !key.startsWith("internalAverage"),
              ),
            ),
          ) as PlayerMetrics[];

          for (const key in firstData) {
            if (Object.prototype.hasOwnProperty.call(firstData, key)) {
              const firstValue = firstData[key];
              if (typeof firstValue === "boolean") {
                averagePlayerMetrics[key as LensKeys] =
                  this.calculateBooleanAverage(
                    allPlayerMetrics,
                    key as LensKeys,
                  );
              } else if (typeof firstValue === "number") {
                averagePlayerMetrics[key as MetricKeys] = this.calculateAverage(
                  allPlayerMetrics,
                  key as MetricKeys,
                );
              }
            }
          }

          result = await this.checkValues(
            eligibilityCriteria.averageGlobalPlaybackCriteria[i]
              .playbackCriteria,
            averagePlayerMetrics,
          );

          if (!result) {
            return false;
          }
        } else {
          this.log(
            LogCategory.ERROR,
            `Error on get metrics for comparison.`,
            error.message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error getting metrics for comparison: ${error.message}`,
            );
          }
        }
      }

      if (!result) {
        return false;
      }
    }

    if (eligibilityCriteria.averageInternalVideoStats) {
      let { data, error } = await getMetrics({
        playerProfileId: parseInt(playerProfileId, 16),
        questEnvokerProfileId: this.questEnvokerProfileId,
        encrypted: false,
      });

      const averagePlayerMetrics: PlayerMetrics = {} as PlayerMetrics;
      if (data) {
        const firstData = Object.fromEntries(
          Object.entries(data[0]).filter(([key]) =>
            key.startsWith("internalAverage"),
          ),
        ) as PlayerMetrics;

        const allPlayerMetrics: PlayerMetrics[] = data.map((obj) =>
          Object.fromEntries(
            Object.entries(obj).filter(([key]) =>
              key.startsWith("internalAverage"),
            ),
          ),
        ) as PlayerMetrics[];

        for (const key in firstData) {
          if (Object.prototype.hasOwnProperty.call(firstData, key)) {
            const firstValue = firstData[key];
            if (typeof firstValue === "boolean") {
              averagePlayerMetrics[key as LensKeys] =
                this.calculateBooleanAverage(allPlayerMetrics, key as LensKeys);
            } else if (typeof firstValue === "number") {
              averagePlayerMetrics[key as MetricKeys] = this.calculateAverage(
                allPlayerMetrics,
                key as MetricKeys,
              );
            }
          }
        }
      } else {
        this.log(
          LogCategory.ERROR,
          `Error on get metrics for comparison.`,
          error.message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error getting metrics for comparison: ${error.message}`,
          );
        }
      }

      result = await this.checkValues(
        eligibilityCriteria.averageInternalVideoStats,
        averagePlayerMetrics,
      );

      if (!result) {
        return false;
      }
    }

    if (eligibilityCriteria.averageGlobalVideoStats) {
      let { data, error } = await getMetrics({
        playerProfileId: parseInt(playerProfileId, 16),
        encrypted: false,
      });
      const averagePlayerMetrics: PlayerMetrics = {} as PlayerMetrics;
      if (data) {
        const firstData = Object.fromEntries(
          Object.entries(data[0]).filter(([key]) =>
            key.startsWith("globalAverage"),
          ),
        ) as PlayerMetrics;

        const allPlayerMetrics: PlayerMetrics[] = data.map((obj) =>
          Object.fromEntries(
            Object.entries(obj).filter(([key]) =>
              key.startsWith("globalAverage"),
            ),
          ),
        ) as PlayerMetrics[];

        for (const key in firstData) {
          if (Object.prototype.hasOwnProperty.call(firstData, key)) {
            const firstValue = firstData[key];
            if (typeof firstValue === "boolean") {
              averagePlayerMetrics[key as LensKeys] =
                this.calculateBooleanAverage(allPlayerMetrics, key as LensKeys);
            } else if (typeof firstValue === "number") {
              averagePlayerMetrics[key as MetricKeys] = this.calculateAverage(
                allPlayerMetrics,
                key as MetricKeys,
              );
            }
          }
        }
      } else {
        this.log(
          LogCategory.ERROR,
          `Error on get metrics for comparison.`,
          error.message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error getting metrics for comparison: ${error.message}`,
          );
        }
      }

      result = await this.checkValues(
        eligibilityCriteria.averageGlobalVideoStats,
        averagePlayerMetrics,
      );

      if (!result) {
        return false;
      }
    }

    return result;
  };

  /**
   * Evaluates whether the player metrics adhere to the defined eligibility criteria.
   *
   * @param eligibilityCriteria - The criteria against which player metrics are to be evaluated.
   * @param currentPlayerMetrics - The metrics pertaining to a player that are to be evaluated.
   * @returns A promise that resolves to a boolean indicating whether the player metrics meet the eligibility criteria.
   */
  private checkValues = async (
    eligibilityCriteria: MilestoneEligibilityCriteria,
    currentPlayerMetrics: PlayerMetrics,
  ): Promise<boolean> => {
    for (const key in eligibilityCriteria) {
      const criteria = eligibilityCriteria[key as keyof MilestoneEligibility];

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
          return false;
        }
      } else if (criteria.operator === "or") {
        if (!conditions.some(Boolean)) {
          return false;
        }
      }
    }

    return true;
  };

  /**
   * Calculates the average of a specific numeric metric across all player metrics.
   *
   * @param allPlayerMetrics - An array of PlayerMetrics objects, each representing the metrics for a different player.
   * @param key - The key representing the metric for which the average is to be calculated.
   * @returns The average value of the specified metric across all player metrics.
   */
  private calculateAverage = (
    allPlayerMetrics: PlayerMetrics[],
    key: MetricKeys,
  ): number => {
    let sum = 0;
    for (let i = 0; i < allPlayerMetrics.length; i++) {
      const value = allPlayerMetrics[i][key];
      if (typeof value === "number") {
        sum += value;
      }
    }
    return sum / allPlayerMetrics.length;
  };

  /**
   * Determines the collective boolean value for a specific boolean metric across all player metrics.
   * A true collective value is returned only if all individual values are true, otherwise false.
   *
   * @param allPlayerMetrics - An array of PlayerMetrics objects, each representing the metrics for a different player.
   * @param key - The key representing the boolean metric for which the collective value is to be determined.
   * @returns The collective boolean value for the specified metric across all player metrics.
   */
  private calculateBooleanAverage = (
    allPlayerMetrics: PlayerMetrics[],
    key: LensKeys,
  ): boolean => {
    for (let i = 0; i < allPlayerMetrics.length; i++) {
      const value = allPlayerMetrics[i][key];
      if (typeof value === "boolean" && !value) {
        return false;
      }
    }
    return true;
  };
}
