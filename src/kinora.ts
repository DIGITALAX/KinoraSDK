import { ILogEntry, LitAuthSig, LogCategory } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

  /**
   * Constructs a new instance of the Kinora SDK with the provided configuration.
   *
   * @param questEnvokerProfileId - The Lens Profile Id of the quest envoker.
   * @param questEnvokerPKPData - An object containing the public key and token Id of the quest envoker.
   * @param multihashDevKey - The development key for multihash operations.
   * @param rpcURL - The URL of the remote procedure call (RPC) server.
   * @param kinoraMetricsContract - The Ethereum address of the Kinora Metrics smart contract.
   * @param errorHandlingModeStrict - (Optional) A flag indicating whether strict error handling mode is enabled.
   */
  private constructor(
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
    this.sequence = new Sequence(
      questEnvokerProfileId,
      questEnvokerPKPData,
      multihashDevKey,
      rpcURL,
      kinoraMetricsContract,
      errorHandlingModeStrict,
    );
  }

  /**
   * Provides access to the singleton instance of Kinora, creating it if necessary.
   *
   * @returns The singleton instance of Kinora.
   */
  static getInstance(
    questEnvokerProfileId: `0x${string}`,
    questEnvokerPKPData: {
      publicKey: `0x04${string}`;
      tokenId: string;
    },
    multihashDevKey: string,
    rpcURL: string,
    kinoraMetricsContract: `0x${string}`,
    errorHandlingModeStrict?: boolean,
  ): Kinora {
    if (!Kinora.instance) {
      Kinora.instance = new Kinora(
        questEnvokerProfileId,
        questEnvokerPKPData,
        multihashDevKey,
        rpcURL,
        kinoraMetricsContract,
        errorHandlingModeStrict,
      );
    }
    return Kinora.instance;
  }

  /**
   * @method livepeerAdd
   * @description Initializes a Livepeer video player with given playback Id and associates event handlers to the video element.
   *
   * @param playbackId - A string representing the Livepeer playback Id.
   * @param videoElement - The HTML video element associated with the player.
   * @param litAuthSig - The Lit authorization signature.
   */
  livepeerAdd = (
    playbackId: string,
    videoElement: HTMLVideoElement,
    litAuthSig: LitAuthSig,
  ): void => {
    this.sequence.initializePlayer(playbackId, videoElement, litAuthSig);
  };

  /**
   * @method playbackId
   * @description Destroys a Livepeer player with given playback Id, cleaning up event listeners and removing video data.
   *
   * @param playbackId - A string representing the Livepeer playback Id.
   */
  livepeerDestroy(playbackId: string): void {
    this.sequence.destroyPlayer(playbackId);
  }

  /**
   * @method playerMetricsToHash
   * @description Collects and potentially encrypts player metrics for a quest, based on specified parameters. Ensures function is run in a browser environment with a video element present.
   * @param {string} args.playbackId - The playback Id for the quest.
   * @param {string} args.pubId - The Lens Pub Id of the quest.
   * @param {string} args.playerProfileId - The Lens Profile Id of the player.
   * @param {string} args.playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {boolean} args.encrypt - A flag indicating whether to encrypt the metrics data.
   * @throws Will throw an error if run outside a browser environment, or if the video element is not detected.
   * @returns {Promise<string>} - Promise resolving to a JSON string containing the collected (and possibly encrypted) metrics data.
   */
  async playerMetricsToHash(args: {
    playbackId: string;
    pubId: string;
    playerProfileId: string;
    playerProfileOwnerAddress: `0x${string}`;
    encrypt: boolean;
  }): Promise<void> {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    await this.sequence.getPlayerMetrics(
      args.playbackId,
      args.pubId,
      args.playerProfileId,
      args.playerProfileOwnerAddress,
      args.encrypt,
    );
  }

  /**
   * @method setPlayerMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} args.playbackId - The playback Id associated with the metrics.
   * @param {string} args.playerAddress - The Address of the player associated with their Lens profile.
   * @param {string} args.playerProfileId - The Lens Profile Id of the player.
   * @param {string} args.playerMetricsHash - The hash of the player's metrics.
   * @param {string} args.litActionHash - The hash of the LIT action.
   * @param {string} args.pubId - The Lens Pub Id of the quest.
   * @param {boolean} args.metricsEncrypted - Flag indicating whether the metrics are encrypted.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  async setPlayerMetricsOnChain(args: {
    playbackId: string;
    playerProfileOwnerAddress: `0x${string}`;
    playerProfileId: string;
    playerMetricsHash: string;
    litActionHash: string;
    pubId: string;
    metricsEncrypted: boolean;
  }): Promise<void> {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    await this.sequence.sendMetricsOnChain(
      args.playbackId,
      args.playerProfileOwnerAddress,
      args.playerProfileId,
      args.playerMetricsHash,
      args.litActionHash,
      args.pubId,
      args.metricsEncrypted,
    );
  }

  /**
   * @method checkPlayerMilestone
   * @description This function is responsible for verifying if a player has completed a milestone in a quest, and updates the blockchain accordingly. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {string} args.playerProfileId - The Lens Profile Id of the player.
   * @param {string} args.pubId - The Lens Pub Id of the quest.
   * @param {`0x{string}`} args.playerProfileOwnerAddress - The Ethereum address of the player profile owner.
   * @param {number} args.milestone - The milestone number.
   * @param {string} args.litActionMilestoneHash - The hash of the LIT action for the milestone.
   * @throws Will throw an error if required data is missing or if transaction generation or execution fails.
   * @returns {Promise<Object>} - A Promise that resolves to an object containing a check result indicating whether the milestone verification succeeded.
   */
  async checkPlayerMilestone(args: {
    playerProfileId: string;
    pubId: string;
    playerProfileOwnerAddress: `0x${string}`;
    milestone: number;
    litActionMilestoneHash: string;
  }): Promise<boolean> {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return await this.sequence.verifyPlayerMilestoneComplete(
      args.playerProfileId,
      args.pubId,
      args.playerProfileOwnerAddress,
      args.milestone,
      args.litActionMilestoneHash,
    );
  }

  /**
   * @method getSequenceLogs
   * @description Retrieves the logs stored in the instance, optionally filtered by a specified category.
   * @param {LogCategory} [category] - An optional parameter to filter logs by a specific category. If not provided, all logs are returned.
   * @returns {ILogEntry[]} - An array of log entries, either filtered by the specified category or all logs if no category is specified.
   */
  getSequenceLogs(category?: LogCategory): ILogEntry[] {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return this.sequence.getLogs(category);
  }
}

export default Kinora;
