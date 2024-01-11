import { ZeroString } from "./../@types/kinora-sdk";

/**
 * @constant KINORA_OPEN_ACTION_CONTRACT Lens Kinora Open Action Address Matic Network.
 */
export const KINORA_OPEN_ACTION_CONTRACT: ZeroString =
  "0x6369b7a2A256ec2834d117b280Cec2e94Ebf3439";
/**
 * @constant LENS_MODULE_CONTRACT Lens Module Contract.
 */
export const LENS_MODULE_CONTRACT: ZeroString =
  "0x1eD5983F0c883B96f7C35528a1e22EEA67DE3Ff9";
/**
 * @constant ZERO_ADDRESS Zero Address.
 */
export const ZERO_ADDRESS: ZeroString =
  "0x0000000000000000000000000000000000000000";
/**
 * @constant KINORA_METRICS_CONTRACT Lens Kinora Metrics Address Matic Network.
 */
export const KINORA_METRICS_CONTRACT: ZeroString =
  "0x3310E657715F0c091Cf795609EE8c285820b6e80";
/**
 * @constant KINORA_ESCROW_CONTRACT Lens Kinora Escrow Address Matic Network.
 */
export const KINORA_ESCROW_CONTRACT: ZeroString =
  "0x0a6a1CfCE6d5DD6f277BaC5FB17C1C9bd2Dd6E9D";
/**
 * @constant LENS_HUB_PROXY_CONTRACT Lens Hubs Proxy Address Matic Network.
 */
export const LENS_HUB_PROXY_CONTRACT: ZeroString =
  "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d";
/**
 * @constant KINORA_QUEST_DATA_CONTRACT Kinora Quest Data Address Matic Network.
 */
export const KINORA_QUEST_DATA_CONTRACT: ZeroString =
  "0x4a3298205F64cFdc794DF374Acb439843218fA45";
/**
 * @constant LENS_BASE_URL Base URL for the Lens V2 API.
 */
export const LENS_BASE_URL: string = "https://api-v2.lens.dev";

/**
 * @constant IPFS_REGEX IPFS Regex Check.
 */
export const IPFS_REGEX: RegExp = /\b(Qm[1-9A-Za-z]{44}|ba[A-Za-z2-7]{57})\b/;

/**
 * @constant ERROR_CODES Contract Error Codes.
 */
export const ERROR_CODES = {
  "0x47556579": "OnlyAdmin",
  "0x947d5a84": "InvalidLength",
  "0xe6c4247b": "InvalidAddress",
  "0x6eefed20": "InvalidContract",
  "0x43af025d": "UserNotMaintainer",
  "0x3e5a55b9": "QuestClosed",
  "0xf4d678b8": "InsufficientBalance",
  "0x4ffb837c": "PlayerNotEligible",
  "0x9e26d1a2": "MaxPlayerCountReached",
  "0x693be0ed": "MilestoneInvalid",
  "0x5f6063cc": "CurrencyNotWhitelisted",
  "0x38539865": "InvalidRewardAmount",
};
