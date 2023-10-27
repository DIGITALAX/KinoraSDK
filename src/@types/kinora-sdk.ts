import { Bytes, ethers } from "ethers";
import {
  DiscordProvider,
  EthWalletProvider,
  GoogleProvider,
} from "@lit-protocol/lit-auth-client";

/**
 * @description Enumeration for the types of reward tokens.
 */
export enum RewardType {
  ERC20,
  ERC721,
}

/**
 * @description Map of supported chain names to their respective IDs.
 */
export const ChainIds: { [key: string]: number } = {
  polygon: 137,
  mumbai: 80001,
  chronicle: 175177,
};

/**
 * @description Type representing a contract's ABI (Application Binary Interface).
 */
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

/**
 * @description Lit authentication signature.
 */
export type LitAuthSig = {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
};

/**
 * @description Interface for all Player Metrics, including raw and average rates and collected Lens data.
 */
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

/**
 * @description Interface representing a reward.
 */
export interface Reward {
  type: RewardType; // Type of reward
  tokenAddress: `0x${string}`; // Address of the token contract
  amount: number; // Amount of tokens to reward
}

/**
 * @description Interface representing a milestone.
 */
export interface Milestone {
  reward: Reward; // The reward for reaching this milestone
  numberOfPoints: number; // Number of points required to reach this milestone
  milestone: number; // Milestone number or identifier
  eligibilityHash: string; // Hash representing eligibility criteria for this milestone
}

/**
 * @description Interface representing generated transaction data to be passed to the Lit Nodes.
 */
export interface GeneratedTxData {
  nonce: number; // Transaction nonce
  gasLimit: ethers.BigNumber; // Gas limit for the transaction
  maxFeePerGas: ethers.BigNumber; // Maximum fee per gas unit
  maxPriorityFeePerGas: ethers.BigNumber; // Maximum priority fee per gas unit
  data: ethers.ContractInterface; // The contract interface data for the transaction
}

/**
 * @description Interface representing milestone eligibility.
 */
export interface MilestoneEligibility {
  playbackId: string; // Playback ID related to this eligibility
  criteria: MilestoneEligibilityCriteria; // Eligibility criteria
}

/**
 * @description Interface representing criteria for milestone eligibility.
 */
export interface MilestoneEligibilityCriteria {
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

/**
 * @description Enumeration defining log categories.
 */
export enum LogCategory {
  ERROR = 0,
  RESPONSE = 1,
  QUEST = 2,
  METRICS = 3,
  BROADCAST = 4,
}

/**
 * @description Interface representing a log entry.
 */
export interface ILogEntry {
  category: LogCategory; // Category of the log entry
  message: string; // Message associated with the log entry
  responseObject: string; // Response object (if any) associated with the log entry
  isoDate: string; // ISO date string representing when the log entry was created
}

/**
 * @description Interface representing statistics related to a lens.
 */
export interface LensStats {
  hasReacted: boolean; // Flag indicating whether the user has reacted to the video post id on Lens
  hasMirrored: boolean; // Flag indicating whether the user has mirrored the video post id on Lens
  hasActed: boolean; // Flag indicating whether the user has acted/collect the video post id on Lens
  hasNotInterested: boolean; // Flag indicating whether the user has marked the post id not interested
  hasBookmarked: boolean; // Flag indicating whether the user has bookmarked the post id
}
