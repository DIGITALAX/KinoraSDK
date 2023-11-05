import { ethers } from "ethers";
import { PublicationMetadataMainFocusType } from "./generated";

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
  totalViewDuration: number;
  totalFullScreenCount: number;
  totalPlayCount: number;
  totalPauseCount: number;
  totalSkipCount: number;
  totalClickCount: number;
  totalVolumeChangeCount: number;
  totalBufferCount: number;
  averageBounceRate?: number;
  averageBufferDuration?: number;
  averageEngagementRate?: number;
  averagePlayPauseRatio?: number;
  averageCtr?: number;
  averageAvd?: number;
  hasQuoted: boolean;
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
  erc721URI?: string; // URI hash for the NFT reward
  erc20tokenAddress?: `0x${string}`; // Address of the token contract
  erc20tokenAmount?: string; // Amount of erc20 tokens to reward
}

/**
 * @description Represents the gating logic for eligibility in the system. It encapsulates various on-chain assets and their associated thresholds that are evaluated to determine eligibility for a particular operation or access.
 */
export interface GatingLogic {
  erc721Addresses: `0x${string}`[];
  erc721TokenIds: number[][];
  erc20Addresses: `0x${string}`[];
  erc20Thresholds: string[];
  oneOf: boolean;
}

/**
 * @description Interface representing a milestone.
 */
export interface Milestone {
  gated: GatingLogic; // The logic for token gated milestones
  reward: Reward; // The reward for reaching this milestone
  milestone: number; // Milestone number or identifier
  eligibilityURI: string; // URI representing eligibility criteria for this milestone
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
  internalPlaybackCriteria?: {
    playbackId: string;
    playbackCriteria: MilestoneEligibilityCriteria;
  }[];
  averageGlobalPlaybackCriteria?: {
    playbackId: string;
    playbackCriteria: MilestoneEligibilityCriteria;
  }[];
  averageInternalVideoStats: MilestoneEligibilityCriteria;
  averageGlobalVideoStats: MilestoneEligibilityCriteria;
}

/**
 * @description Interface representing criteria for milestone eligibility.
 */
export interface MilestoneEligibilityCriteria {
  averageAvd?: MetricCriteria;
  averageCtr?: MetricCriteria;
  totalPlayCount?: MetricCriteria;
  totalPauseCount?: MetricCriteria;
  totalClickCount?: MetricCriteria;
  totalSkipCount?: MetricCriteria;
  totalDuration?: MetricCriteria;
  totalImpressionCount?: MetricCriteria;
  totalVolumeChangeCount?: MetricCriteria;
  totalBufferCount?: MetricCriteria;
  averageEngagementRate?: MetricCriteria;
  averagePlayPauseRatio?: MetricCriteria;
  quoteLens?: BoolLensCriteria;
  mirrorLens?: BoolLensCriteria;
  likeLens?: BoolLensCriteria;
  bookmarkLens?: BoolLensCriteria;
  notInterestedLens?: BoolLensCriteria;
}

/**
 * Enumerates the keys associated with boolean Lens reactions in the player metrics.
 *
 * @typedef LensKeys
 */
export type LensKeys =
  | "quoteLens"
  | "mirrorLens"
  | "likeLens"
  | "bookmarkLens"
  | "notInterestedLens";

/**
 * Enumerates the keys associated with video metric data in the player metrics. These metrics represent various quantitative measurements within the playback environment.
 *
 * @typedef MetricKeys
 */
export type MetricKeys =
  | "averageAvd"
  | "averageCtr"
  | "totalPlayCount"
  | "totalPauseCount"
  | "totalClickCount"
  | "totalSkipCount"
  | "totalDuration"
  | "totalImpressionCount"
  | "totalVolumeChangeCount"
  | "totalBufferCount"
  | "averageEngagementRate"
  | "averagePlayPauseRatio";

/**
 * @description Enumeration defining log categories.
 */
export enum LogCategory {
  ERROR = 0,
  RESPONSE = 1,
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
  hasQuoted: boolean; // Flag indicating whether the user has quoted the video post id on Lens
  hasReacted: boolean; // Flag indicating whether the user has reacted to the video post id on Lens
  hasMirrored: boolean; // Flag indicating whether the user has mirrored the video post id on Lens
  hasActed: boolean; // Flag indicating whether the user has acted/collect the video post id on Lens
  hasNotInterested: boolean; // Flag indicating whether the user has marked the post id not interested
  hasBookmarked: boolean; // Flag indicating whether the user has bookmarked the post id
}

/** *
 * @description Lens Protocol Publication Metadata Struct.
 */
export interface LensQuestMetadata {
  $schema: "https://json-schemas.lens.dev/publications/image/3.0.0.json";
  lens: {
    mainContentFocus: PublicationMetadataMainFocusType.Image;
    image: {
      item: string;
      type: "image/png";
    };
    title: string;
    content: string;
    attachments: {
      item: string;
      type: "image/png";
    }[];
    appId: "kinora";
    id: string;
    hideFromFeed: false;
    locale: "en";
    tags: ["kinora", "kinora quest", "vision quest"];
  };
}

/** *
 * @description Sub-type Metric Criteria Interface.
 */
export interface MetricCriteria {
  minValue: number;
  maxValue: number;
  operator: "or" | "and";
}

/** *
 * @description Sub-type Lens Bool Criteria Interface.
 */
export interface BoolLensCriteria {
  boolValue: boolean;
  operator: "or" | "and";
}

/**
 * Represents the data structure for a instantiated Livepeer player.
 * It encapsulates the video element associated with the player and a collection of event handlers that are invoked in response to various media events.
 *
 * @property videoElement - The HTMLVideoElement associated with the player.
 * @property pubId - The Lens publication Id the video is being viewed from.
 * @property eventHandlers - A collection of functions that handle various media events.
 */
export interface PlayerData {
  videoElement: HTMLVideoElement;
  pubId: string;
  eventHandlers: {
    play: (event: Event) => void;
    pause: (event: Event) => void;
    timeupdate: (event: Event) => void;
    click: (event: Event) => void;
    seeking: (event: Event) => void;
    volumechange: (event: Event) => void;
    fullscreenchange: (event: Event) => void;
    waiting: (event: Event) => void;
    playing: (event: Event) => void;
  };
}

/** *
 * @description PlayerMetricsResult Interface returned from subgraph query.
 */
export interface PlayerMetricsResult {
  profileId: string;
  playerProfileId: string;
  playbackId: string;
  encrypted: boolean;
  json: string;
  rawTotalDuration: number | undefined;
  rawPlayCount: number | undefined;
  rawPauseCount: number | undefined;
  rawSkipCount: number | undefined;
  rawClickCount: number | undefined;
  rawImpressionCount: number | undefined;
  rawBounceCount: number | undefined;
  rawBounceRate: number | undefined;
  rawVolumeChangeCount: number | undefined;
  rawFullScreenCount: number | undefined;
  rawBufferCount: number | undefined;
  rawInteractionRate: number | undefined;
  rawPreferredTimeToWatch: string | undefined;
  rawMostViewedSegment: string | undefined;
  rawBufferDuration: number | undefined;
  rawEngagementRate: number | undefined;
  rawMostReplayedArea: string | undefined;
  rawPlayPauseRatio: number | undefined;
  rawCtr: number | undefined;
  rawAvd: number | undefined;
  totalViewDuration: number | undefined;
  totalFullScreenCount: number | undefined;
  totalPlayCount: number | undefined;
  totalPauseCount: number | undefined;
  totalSkipCount: number | undefined;
  totalClickCount: number | undefined;
  totalVolumeChangeCount: number | undefined;
  totalBufferCount: number | undefined;
  averageBounceRate: number | undefined;
  averageBufferDuration: number | undefined;
  averageEngagementRate: number | undefined;
  averagePlayPauseRatio: number | undefined;
  averageCtr: number | undefined;
  averageAvd: number | undefined;
  hasQuoted: boolean | undefined;
  hasMirrored: boolean | undefined;
  hasReacted: boolean | undefined;
  hasBookmarked: boolean | undefined;
  hasNotInterested: boolean | undefined;
  hasActed: boolean | undefined;
  globalAverageRawTotalDuration: number | undefined;
  globalAverageRawPlayCount: number | undefined;
  globalAverageRawPauseCount: number | undefined;
  globalAverageRawSkipCount: number | undefined;
  globalAverageRawClickCount: number | undefined;
  globalAverageRawImpressionCount: number | undefined;
  globalAverageRawBounceCount: number | undefined;
  globalAverageRawBounceRate: number | undefined;
  globalAverageRawVolumeChangeCount: number | undefined;
  globalAverageRawFullScreenCount: number | undefined;
  globalAverageRawBufferCount: number | undefined;
  globalAverageRawInteractionRate: number | undefined;
  globalAverageRawPreferredTimeToWatch: number | undefined;
  globalAverageRawMostViewedSegment: number | undefined;
  globalAverageRawBufferDuration: number | undefined;
  globalAverageRawEngagementRate: number | undefined;
  globalAverageRawMostReplayedArea: number | undefined;
  globalAverageRawPlayPauseRatio: number | undefined;
  globalAverageRawCtr: number | undefined;
  globalAverageRawAvd: number | undefined;
  globalAverageTotalViewDuration: number | undefined;
  globalAverageTotalFullScreenCount: number | undefined;
  globalAverageTotalPlayCount: number | undefined;
  globalAverageTotalPauseCount: number | undefined;
  globalAverageTotalSkipCount: number | undefined;
  globalAverageTotalClickCount: number | undefined;
  globalAverageTotalVolumeChangeCount: number | undefined;
  globalAverageTotalBufferCount: number | undefined;
  globalAverageAverageBounceRate: number | undefined;
  globalAverageAverageBufferDuration: number | undefined;
  globalAverageAverageEngagementRate: number | undefined;
  globalAverageAveragePlayPauseRatio: number | undefined;
  globalAverageAverageCtr: number | undefined;
  globalAverageAverageAvd: number | undefined;
  globalAverageHasQuoted: boolean | undefined;
  globalAverageHasMirrored: boolean | undefined;
  globalAverageHasReacted: boolean | undefined;
  globalAverageHasBookmarked: boolean | undefined;
  globalAverageHasNotInterested: boolean | undefined;
  globalAverageHasActed: boolean | undefined;
  internalAverageRawTotalDuration: number | undefined;
  internalAverageRawPlayCount: number | undefined;
  internalAverageRawPauseCount: number | undefined;
  internalAverageRawSkipCount: number | undefined;
  internalAverageRawClickCount: number | undefined;
  internalAverageRawImpressionCount: number | undefined;
  internalAverageRawBounceCount: number | undefined;
  internalAverageRawBounceRate: number | undefined;
  internalAverageRawVolumeChangeCount: number | undefined;
  internalAverageRawFullScreenCount: number | undefined;
  internalAverageRawBufferCount: number | undefined;
  internalAverageRawInteractionRate: number | undefined;
  internalAverageRawPreferredTimeToWatch: number | undefined;
  internalAverageRawMostViewedSegment: number | undefined;
  internalAverageRawBufferDuration: number | undefined;
  internalAverageRawEngagementRate: number | undefined;
  internalAverageRawMostReplayedArea: number | undefined;
  internalAverageRawPlayPauseRatio: number | undefined;
  internalAverageRawCtr: number | undefined;
  internalAverageRawAvd: number | undefined;
  internalAverageTotalViewDuration: number | undefined;
  internalAverageTotalFullScreenCount: number | undefined;
  internalAverageTotalPlayCount: number | undefined;
  internalAverageTotalPauseCount: number | undefined;
  internalAverageTotalSkipCount: number | undefined;
  internalAverageTotalClickCount: number | undefined;
  internalAverageTotalVolumeChangeCount: number | undefined;
  internalAverageTotalBufferCount: number | undefined;
  internalAverageAverageBounceRate: number | undefined;
  internalAverageAverageBufferDuration: number | undefined;
  internalAverageAverageEngagementRate: number | undefined;
  internalAverageAveragePlayPauseRatio: number | undefined;
  internalAverageAverageCtr: number | undefined;
  internalAverageAverageAvd: number | undefined;
  internalAverageHasQuoted: boolean | undefined;
  internalAverageHasMirrored: boolean | undefined;
  internalAverageHasReacted: boolean | undefined;
  internalAverageHasBookmarked: boolean | undefined;
  internalAverageHasNotInterested: boolean | undefined;
  internalAverageHasActed: boolean | undefined;
}
