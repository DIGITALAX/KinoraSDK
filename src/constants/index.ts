import { EthereumAddress } from "./../@types/kinora-sdk";

/**
 * @constant KINORA_OPEN_ACTION_CONTRACT Lens Kinora Open Action Address Matic Network.
 */
export const KINORA_OPEN_ACTION_CONTRACT: EthereumAddress =
  "0xF451CD340AEfe28C58162543D5167E35b36325d7";
/**
 * @constant LENS_MODULE_CONTRACT Lens Module Contract.
 */
export const LENS_MODULE_CONTRACT: EthereumAddress =
  "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0";
/**
 * @constant ZERO_ADDRESS Zero Address.
 */
export const ZERO_ADDRESS: EthereumAddress =
  "0x0000000000000000000000000000000000000000";
/**
 * @constant KINORA_METRICS_CONTRACT Lens Kinora Metrics Address Matic Network.
 */
export const KINORA_METRICS_CONTRACT: EthereumAddress =
  "0x31802679f1b53EceEf3F401CC0427F260F98014D";
/**
 * @constant KINORA_ESCROW_CONTRACT Lens Kinora Escrow Address Matic Network.
 */
export const KINORA_ESCROW_CONTRACT: EthereumAddress =
  "0x9266F71E1888a53923A605a82882F83211eF64E0";
/**
 * @constant LENS_HUB_PROXY_CONTRACT Lens Hubs Proxy Address Matic Network.
 */
export const LENS_HUB_PROXY_CONTRACT: EthereumAddress =
  "0x4fbffF20302F3326B20052ab9C217C44F6480900";
/**
 * @constant KINORA_QUEST_DATA_CONTRACT Kinora Quest Data Address Matic Network.
 */
export const KINORA_QUEST_DATA_CONTRACT: EthereumAddress =
  "0x4682D92f246a08B027cB400f3369a0a0D35AC923";
/**
 * @constant LENS_BASE_URL Base URL for the Lens V2 API.
 */
export const LENS_BASE_URL: string = "https://api-v2-mumbai-live.lens.dev";

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
