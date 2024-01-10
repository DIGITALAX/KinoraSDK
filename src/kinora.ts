import { ethers } from "ethers";
import { ZeroString } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import { KINORA_QUEST_DATA_CONTRACT } from "./constants";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

  /**
   * Constructs a new instance of the Kinora SDK with the provided configuration.
   */
  private constructor(
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>
  ) {
    this.sequence = new Sequence(playerAuthedApolloClient);
  }

  /**
   * Provides access to the singleton instance of Kinora, creating it if necessary.
   *
   * @returns The singleton instance of Kinora.
   */
  static getInstance(
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>
  ): Kinora {
    if (!Kinora.instance) {
      Kinora.instance = new Kinora(playerAuthedApolloClient);
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
    wallet: ethers.Wallet
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
      wallet
    );
  }

  public getLiveVideoMetrics(pubId: `0x${string}`): {
    playCount: number;
    avd: number;
    duration: number;
    mostReplayedArea: Map<number, number>;
    totalInteractions: number;
  } {
    if (!this.sequence)
      throw new Error(`Set the Kinora Provider in the root of your App.`);
    return this.sequence.getLivePlayerVideoMetrics(pubId);
  }

  public async getPlayerVideoSecondaryData(
    playerProfileId: `0x${string}`,
    postId: `0x${string}`
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
  }> {
    return await this.sequence.secondaryData(playerProfileId, postId);
  }

  public async getQuestIdFromPublication(postId: `0x${string}`): Promise<{
    error: boolean;
    questId?: number;
    errorMessage?: string;
  }> {
    try {
      const kinoraQuestData = new ethers.Contract(
        KINORA_QUEST_DATA_CONTRACT,
        KinoraQuestDataAbi
      );

      const questId = await kinoraQuestData.getQuestIdFromLensData(
        parseInt(postId?.split("-")?.[0], 16),
        parseInt(postId?.split("-")?.[1], 16)
      );
      return {
        error: false,
        questId: Number(questId),
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: err.message,
      };
    }
  }
}

export default Kinora;
