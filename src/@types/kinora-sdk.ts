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

export interface PlayerMetrics {
  rawTotalDuration: number;
  rawPlayCount: number;
  rawPauseCount: number;
  rawSkipCount: number;
  rawClickCount: number;
  rawImpressionCount: number;
  rawBounceCount: number;
  rawBounceRate: number;
  rawVolumeChangeCount: number;
  rawFullScreenCount: number;
  rawBufferCount: number;
  rawInteractionRate: number;
  rawPreferredTimeToWatch: string;
  rawMostViewedSegment: string;
  rawBufferDuration: number;
  rawEngagementRate: number;
  rawMostReplayedArea: string;
  rawPlayPauseRatio: number;
  rawCtr: number;
  rawAvd: number;
  averageBounceRate?: number;
  averageBufferDuration?: number;
  averageEngagementRate?: number;
  averagePlayPauseRatio?: number;
  averageCtr?: number;
  averageAvd?: number;
  hasMirrored: boolean;
  hasReacted: boolean;
  hasBookmarked: boolean;
  hasNotInterested: boolean;
  hasActed: boolean;
}

export interface Reward {
  type: RewardType;
  tokenAddress: `0x${string}`;
  amount: number;
}

export interface Milestone {
  reward: Reward;
  numberOfPoints: number;
  milestone: number;
  eligibilityHash: string;
}

export interface GeneratedTxData {
  nonce: number;
  gasLimit: ethers.BigNumber;
  maxFeePerGas: ethers.BigNumber;
  maxPriorityFeePerGas: ethers.BigNumber;
  data: ethers.ContractInterface;
}

export interface MilestoneEligibility {
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
  playCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  pauseCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  clickCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  skipCount:
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
  impressionCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  volumeChangeCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  bufferCount:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  interactionRate:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  engagementRate:
    | {
        minValue: number;
        maxValue: number;
        operator: "or" | "and";
      }
    | undefined;
  playPauseRation:
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

export interface LensStats {
  hasReacted: boolean;
  hasMirrored: boolean;
  hasActed: boolean;
  hasNotInterested: boolean;
  hasBookmarked: boolean;
}
