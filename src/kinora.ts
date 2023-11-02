import { ILogEntry, LogCategory } from "./@types/kinora-sdk";
import { Sequence } from "./sequence";

class Kinora {
  private static instance: Kinora;
  private sequence: Sequence;

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

  getSequence(): Sequence {
    return this.sequence;
  }

  async playerMetricsToHash(args: {
    playbackId: string;
    pubId: string;
    playerProfileId: string;
    playerProfileOwnerAddress: `0x${string}`;
    encrypt: boolean;
  }): Promise<void> {
    await this.sequence.getPlayerMetrics(
      args.playbackId,
      args.pubId,
      args.playerProfileId,
      args.playerProfileOwnerAddress,
      args.encrypt,
    );
  }

  async setPlayerMetricsOnChain(args: {
    playbackId: string;
    playerProfileId: string;
    playerMetricsHash: string;
    litActionHash: string;
    pubId: string;
    metricsEncrypted: boolean;
  }): Promise<void> {
    await this.sequence.sendMetricsOnChain(
      args.playbackId,
      args.playerProfileId,
      args.playerMetricsHash,
      args.litActionHash,
      args.pubId,
      args.metricsEncrypted,
    );
  }

  async checkPlayerMilestone(args: {
    playerProfileId: string;
    pubId: string;
    playbackId: string;
    playerProfileOwnerAddress: `0x${string}`;
    milestone: number;
    litActionMilestoneHash: string;
  }): Promise<boolean> {
    return await this.sequence.verifyPlayerMilestoneComplete(
      args.playerProfileId,
      args.pubId,
      args.playbackId,
      args.playerProfileOwnerAddress,
      args.milestone,
      args.litActionMilestoneHash,
    );
  }

  getSequenceLogs(category?: LogCategory): ILogEntry[] {
    return this.sequence.getLogs(category);
  }
}

export default Kinora;
