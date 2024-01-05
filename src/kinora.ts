import { ethers } from "ethers";
import { ZeroString, ILogEntry, LogCategory } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

  /**
   * Constructs a new instance of the Kinora SDK with the provided configuration.
   */
  private constructor() {
    this.sequence = new Sequence();
  }

  /**
   * Provides access to the singleton instance of Kinora, creating it if necessary.
   *
   * @returns The singleton instance of Kinora.
   */
  static getInstance(): Kinora {
    if (!Kinora.instance) {
      Kinora.instance = new Kinora();
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
   * @description This function is responsible for sending player metrics to the blockchain. It performs various checks and validations before proceeding with the transaction, and logs the outcome.
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

  public getLiveVideoMetrics(pubId: `0x${string}`): {
    playCount: number;
    avd: number;
    duration: number;
    mostReplayedArea: string;
    totalInteractions: number;
  } {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return this.sequence.getLivePlayerVideoMetrics(pubId);
  }
}

export default Kinora;
