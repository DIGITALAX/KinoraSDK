import { PlayerProps } from "@livepeer/react";
import { HlsVideoConfig } from "livepeer/media/browser/hls";
import { WebRTCVideoConfig } from "livepeer/media/browser/webrtc";
import { ControlsOptions } from "livepeer/media/browser";
import { ethers } from "ethers";
import {
  DiscordProvider,
  EthWalletProvider,
  GoogleProvider,
} from "@lit-protocol/lit-auth-client";

export enum RewardType {
  ERC20,
  ERC721,
}

export enum Status {
  Open,
  Closed,
}

export type LivepeerPlayer<TPlaybackPolicyObject extends object, TSlice> = {
  on: (eventName: string, callback: Function) => void;
  props: PlayerProps<TPlaybackPolicyObject, TSlice>;
  showPipButton?: boolean;
  controls?: ControlsOptions;
  hlsConfig?: HlsVideoConfig;
  lowLatency?: boolean | "force";
  webrtcConfig?: WebRTCVideoConfig;
  allowCrossOriginCredentials?: boolean;
  tabIndex?: number;
};

export const ChainIds: { [key: string]: number } = {
  polygon: 137,
  mumbai: 80001,
  chronicle: 175177,
};

export type ContractABI = (
  | {
      inputs: { internalType: string; name: string; type: string }[];
      stateMutability: string;
      type: string;
      anonymous?: undefined;
      name?: undefined;
      outputs?: undefined;
    }
  | {
      anonymous: boolean;
      inputs: any[];
      name: string;
      type: string;
      stateMutability?: undefined;
      outputs?: undefined;
    }
  | {}
)[];

export type LitProvider = GoogleProvider | DiscordProvider | EthWalletProvider;

export type LitAuthSig = {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
};

export interface UserMetrics {
  avd: number;
  ctr: number;
  assetEngagement: number;
  userEngagementRatio: number;
  multiPlaybackUsageRate: number;
  taskFailureRate: number;
  recordingPerSession: number;
  totalDuration: number;
  numberOfImpressions: number;
  numberOfClicks: number;
  totalIdleTime: number;
  numberOfRecordings: number;
  numberOfFailedTasks: number;
  numberOfMultistreams: number;
  numberOfAssets: number;
  numberOfUpdates: number;
}

export interface Reward {
  type: RewardType;
  tokenAddress: `0x${string}`;
  amount: number;
  tokenIds: number[];
}

export interface QuestURI {
  questCoverImage: string;
  questDescription: string;
  questTitle: string;
}

export interface MilestoneURI {
  milestoneCoverImage: string;
  milestoneDescription: string;
  milestoneTitle: string;
}

export interface Milestone {
  uriDetails: MilestoneURI;
  reward: Reward;
  numberOfPoints: number;
}

export interface GeneratedTxData {
  to: `0x${string}`;
  nonce: number;
  chainId: number;
  gasLimit: ethers.BigNumber;
  maxFeePerGas: ethers.BigNumber;
  maxPriorityFeePerGas: ethers.BigNumber;
  from: `0x${string}` | "{{publicKey}}";
  data: ethers.ContractInterface;
  value: ethers.BigNumber;
  type: number;
}
