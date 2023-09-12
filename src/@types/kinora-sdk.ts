import { PlayerProps } from "@livepeer/react";
import { HlsVideoConfig } from "livepeer/media/browser/hls";
import { WebRTCVideoConfig } from "livepeer/media/browser/webrtc";
import { ControlsOptions } from "livepeer/media/browser";
import { Bytes, ethers } from "ethers";
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
  mirrorLens: boolean;
  likeLens: boolean;
  bookmarkLens: boolean;
  notInterestedLens: boolean;
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
  joinCondition: QuestEligibility;
}

export interface MilestoneURI {
  milestoneCoverImage: string;
  milestoneDescription: string;
  milestoneTitle: string;
  completionCondition: QuestEligibility;
}

export interface Milestone {
  uriDetails: MilestoneURI;
  completionHash: Bytes;
  reward: Reward;
  numberOfPoints: number;
}

export interface GeneratedTxData {
  nonce: number;
  gasLimit: ethers.BigNumber;
  maxFeePerGas: ethers.BigNumber;
  maxPriorityFeePerGas: ethers.BigNumber;
  data: ethers.ContractInterface;
}

export interface QuestEligibility {
  avd:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  ctr:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  assetEngagement:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  userEngagementRatio:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  multiPlaybackUsageRate:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  taskFailureRate:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  recordingPerSession:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  totalDuration:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfImpressions:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfClicks:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  totalIdleTime:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfRecordings:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfFailedTasks:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfMultistreams:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfAssets:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  numberOfUpdates:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  mirrorLens:
    | {
        boolValue: boolean;
        operator: "or" | "and";
      }
    | undefined;
  likeLens:
    | {
        boolValue: boolean;
        operator: "or" | "and";
      }
    | undefined;
  bookmarkLens:
    | {
        boolValue: boolean;
        operator: "or" | "and";
      }
    | undefined;
  notInterestedLens:
    | {
        boolValue: boolean;
        operator: "or" | "and";
      }
    | undefined;
}

export enum LogCategory {
  ERROR = 0,
  RESPONSE = 1,
  QUEST = 2,
  METRICS = 3,
  BROADCAST = 4,
}

export interface ILogEntry {
  category: LogCategory;
  message: string;
  responseObject: string;
  isoDate: string;
}

export type LivepeerHTMLElement<
  TPlaybackPolicyObject extends object,
  TSlice,
> = HTMLElement & LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
