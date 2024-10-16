import { ZeroString } from "./../@types/kinora-sdk";

/**
 * @constant KINORA_OPEN_ACTION_CONTRACT Lens Kinora Open Action Address Matic Network.
 */
export const KINORA_OPEN_ACTION_CONTRACT: ZeroString =
  "0x196f267A4aCA1243CCCB85AD7098D1fDA1D683CD";
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
 * @constant LENS_HUB_PROXY_CONTRACT Lens Hubs Proxy Address Matic Network.
 */
export const LENS_HUB_PROXY_CONTRACT: ZeroString =
  "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d";
/**
 * /**
 * @constant LENS_HUB_PROXY_CONTRACT_MUMBAI Lens Hubs Proxy Address Mumbai Network.
 */
export const LENS_HUB_PROXY_CONTRACT_MUMBAI: ZeroString =
"0x4fbffF20302F3326B20052ab9C217C44F6480900";
/**
 * @constant LENS_BASE_URL Base URL for the Lens V2 API.
 */
export const LENS_BASE_URL: string = "https://api-v2.lens.dev";
/**
 * @constant INFURA_GATEWAY Base URL for the Infura Gateway.
 */
export const INFURA_GATEWAY: string = "https://thedial.infura-ipfs.io";
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
