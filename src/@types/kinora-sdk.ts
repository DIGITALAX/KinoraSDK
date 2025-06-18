/**
 * @description Enumeration for the types of reward tokens.
 */
export enum RewardType {
  ERC20,
  ERC721,
}

/**
 * @description Type for Eth Address.
 */
export type ZeroString = `0x${string}`;

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
  erc20tokenAddress?: ZeroString; // Address of the token contract
  erc20tokenAmount?: string; // Amount of erc20 tokens to reward
}

/**
 * @description Represents the gating logic for eligibility in the system. It encapsulates various on-chain assets and their associated thresholds that are evaluated to determine eligibility for a particular operation or access.
 */
export interface GatingLogic {
  erc721TokenURIs: string[][];
  erc721TokenIds: number[][];
  erc721Addresses: ZeroString[];
  erc20Addresses: ZeroString[];
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
    videoInfo: {
      title: string;
      description: string;
      cover: `ipfs://${string}`;
    }[];
  }; // Milestone details
  eligibility: MilestoneEligibility; // Eligibility criteria
}

/**
 * @description Interface representing milestone eligibility.
 */
export interface MilestoneEligibility {
  internalCriteria?: {
    factoryIds: number[];
    playbackId: string;
    postId: string;
    playbackCriteria: MilestoneEligibilityCriteria;
  }[];
}

/**
 * @description Interface representing criteria for milestone eligibility.
 */
export interface MilestoneEligibilityCriteria {
  minAvd?: number;
  minPlayCount?: number;
  minDuration?: number;
  minSecondaryQuoteOnQuote?: number;
  minSecondaryMirrorOnQuote?: number;
  minSecondaryReactOnQuote?: number;
  minSecondaryCommentOnQuote?: number;
  minSecondaryCollectOnQuote?: number;
  minSecondaryQuoteOnComment?: number;
  minSecondaryMirrorOnComment?: number;
  minSecondaryReactOnComment?: number;
  minSecondaryCommentOnComment?: number;
  minSecondaryCollectOnComment?: number;
  quote?: boolean;
  mirror?: boolean;
  react?: boolean;
  bookmark?: boolean;
  comment?: boolean;
}

/**
 * Represents the data structure for a instantiated Livepeer player.
 * It encapsulates the video element associated with the player and a collection of event handlers that are invoked in response to various media events.
 *
 * @property videoElement - The HTMLVideoElement associated with the player.
 * @property postId - The Lens post Id the video is being viewed from.
 * @property eventHandlers - A collection of functions that handle various media events.
 */
export interface PlayerData {
  videoElement: HTMLVideoElement;
  postId: string;
  eventHandlers: {
    play: (videoElement: HTMLVideoElement) => void;
    end: (videoElement: HTMLVideoElement) => void;
    pause: (event: Event) => void;
    volumeChange: (event: Event) => void;
    muteToggle: (event: Event) => void;
    qualityChange: (event: Event) => void;
    fullscreenToggle: (event: Event) => void;
    click: (event: Event) => void;
    onTimeUpdate: (videoElement: HTMLVideoElement) => void;
    onSeeked: (videoElement: HTMLVideoElement) => void;
    onSeeking: (event: Event) => void;
  };
}

/**
 * Player video activity object recorded for each video the player has interacted with and recorded their metrics on-chain.
 */
export interface PlayerVideoActivity {
  secondaryCollectOnComment: number;
  secondaryCollectOnQuote: number;
  secondaryCommentOnQuote: number;
  secondaryCommentOnComment: number;
  secondaryMirrorOnComment: number;
  secondaryMirrorOnQuote: number;
  secondaryQuoteOnComment: number;
  secondaryQuoteOnQuote: number;
  secondaryReactOnQuote: number;
  secondaryReactOnComment: number;
  hasReacted: boolean;
  hasQuoted: boolean;
  hasMirrored: boolean;
  hasCommented: boolean;
  hasBookmarked: boolean;
  duration: number;
  avd: number;
  playCount: number;
}

/**
 * TimeRange interface for Metrics class.
 */
export interface TimeRange {
  start: number;
  end: number;
  views: number;
}
