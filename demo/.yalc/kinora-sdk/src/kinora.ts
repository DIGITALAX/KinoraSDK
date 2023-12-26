import { ethers } from "ethers";
import { ILogEntry, LogCategory } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

  /**
   * Constructs a new instance of the Kinora SDK with the provided configuration.
   *
   * @param {boolean} errorHandlingModeStrict - (Optional) A flag indicating whether strict error handling mode is enabled.
   */
  private constructor(errorHandlingModeStrict?: boolean) {
    this.sequence = new Sequence(errorHandlingModeStrict);
  }

  /**
   * Provides access to the singleton instance of Kinora, creating it if necessary.
   *
   * @returns The singleton instance of Kinora.
   */
  static getInstance(errorHandlingModeStrict?: boolean): Kinora {
    if (!Kinora.instance) {
      Kinora.instance = new Kinora(errorHandlingModeStrict);
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
  livepeerAdd = (
    postId: `0x${string}`,
    videoElement: HTMLVideoElement,
  ): void => {
    this.sequence.initializePlayer(postId, videoElement);
  };

  /**
   * @method playbackId
   * @description Destroys a Livepeer player with given post Id, cleaning up event listeners and removing video data.
   *
   * @param postId - A string representing the video post Id.
   */
  livepeerDestroy(postId: `0x${string}`): void {
    this.sequence.destroyPlayer(postId);
  }

  /**
   * @method setPlayerMetricsOnChain
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
   * @param {`0x${string}`} args.postId - The Lens Post Id of the video.
   * @param {`0x${string}`} args.playerProfileId - The Lens Profile Id of the Player.
   * @param {ethers.Wallet} args.wallet - The Player's wallet object for signing the metrics on-chain.
   * @returns {Promise<void>} - A Promise that resolves when the operation completes.
   */
  async sendPlayerMetricsOnChain(
    postId: `0x${string}`,
    playerProfileId: `0x${string}`,
    wallet: ethers.Wallet,
  ): Promise<void> {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    await this.sequence.sendMetricsOnChain(
      postId,
      playerProfileId,
      wallet,
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

  /**
   * @method on
   * @description Extends on the Sequence Event Emitter for listening in on emitted events.
   * @param {string} event - The event name, in this case "log".
   * @param listener - The function to capture the data.
   * @returns {ILogEntry[]} - An array of log entries, either filtered by the specified category or all logs if no category is specified.
   */
  on(event: string, listener: (...args: any[]) => void): this {
    this.sequence.on(event, listener);
    return this;
  }
}

export default Kinora;
