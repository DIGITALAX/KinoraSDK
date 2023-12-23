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
 * @description Interface representing a reward.
 */
export interface Reward {
  type: RewardType; // Type of reward
  erc721URI?: `ipfs://${string}`; // URI hash for the NFT reward
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
  reward: Reward[]; // The reward for reaching this milestone
  milestone: number; // Milestone number or identifier
  details: {
    title: string;
    description: string;
    cover: `ipfs://${string}`;
  }; // Milestone details
  eligibility: MilestoneEligibility; // Eligibility criteria
}

/**
 * @description Interface representing milestone eligibility.
 */
export interface MilestoneEligibility {
  internalCriteria?: {
    postId: string;
    playbackCriteria: MilestoneEligibilityCriteria;
  }[];
  averageGlobalCriteria?: {
    postId: string;
    playbackCriteria: MilestoneEligibilityCriteria;
  }[];
}

/**
 * @description Interface representing criteria for milestone eligibility.
 */
export interface MilestoneEligibilityCriteria {
  minAvd?: MetricCriteria;
  minCtr?: MetricCriteria;
  minPlayCount?: MetricCriteria;
  minDuration?: MetricCriteria;
  minImpressionCount?: MetricCriteria;
  minEngagementRate?: MetricCriteria;
  quoteLens?: BoolLensCriteria;
  mirrorLens?: BoolLensCriteria;
  likeLens?: BoolLensCriteria;
  bookmarkLens?: BoolLensCriteria;
  commentLens?: BoolLensCriteria;
  collectLens?: BoolLensCriteria;
}

/**
 * @description Enumeration defining log categories.
 */
export enum LogCategory {
  ERROR = 0,
  METRICS = 1,
  BROADCAST = 2,
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
    tags: ["kinora quest", "vision quest"];
  };
}

/** *
 * @description Sub-type Metric Criteria Interface.
 */
export interface MetricCriteria {
  minValue: number;
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
 * @property postId - The Lens publication Id the video is being viewed from.
 * @property eventHandlers - A collection of functions that handle various media events.
 */
export interface PlayerData {
  videoElement: HTMLVideoElement;
  postId: `0x${string}`;
  eventHandlers: {
    play: (event: Event) => void;
    pause: (event: Event) => void;
    click: (event: Event) => void;
  };
}

