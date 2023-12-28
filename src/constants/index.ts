import { EthereumAddress } from "./../@types/kinora-sdk";

/**
 * @constant KINORA_OPEN_ACTION_CONTRACT Lens Kinora Open Action Address Matic Network.
 */
export const KINORA_OPEN_ACTION_CONTRACT: EthereumAddress =
  "0xB733d2d175c0535d122b0C3D706f0bE314eEC41B";
/**
 * @constant KINORA_METRICS_CONTRACT Lens Kinora Metrics Address Matic Network.
 */
export const KINORA_METRICS_CONTRACT: EthereumAddress =
  "0xDde50BaA229207997b23e1Ad0Cd7be8f1Feb7d4d";
/**
 * @constant KINORA_ESCROW_CONTRACT Lens Kinora Escrow Address Matic Network.
 */
export const KINORA_ESCROW_CONTRACT: EthereumAddress =
  "0x9Bf62E348FB5AAbEC7BF34413D85Fc3005064C8C";
/**
 * @constant LENS_HUB_PROXY_CONTRACT Lens Hubs Proxy Address Matic Network.
 */
export const LENS_HUB_PROXY_CONTRACT: EthereumAddress =
  "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d";
/**
 * @constant KINORA_QUEST_DATA_CONTRACT Kinora Quest Data Address Matic Network.
 */
export const KINORA_QUEST_DATA_CONTRACT: EthereumAddress =
  "0x14d6c3b84eA9655C75A4d4B264584469D57E37e3";
/**
 * @constant LENS_BASE_URL Base URL for the Lens V2 API.
 */
export const LENS_BASE_URL: string = "https://api-v2.lens.dev/";

/**
 * @constant IPFS_REGEX IPFS Regex Check.
 */
export const IPFS_REGEX: RegExp = /\b(Qm[1-9A-Za-z]{44}|ba[A-Za-z2-7]{57})\b/;
