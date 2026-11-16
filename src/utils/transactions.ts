import { ethers } from "ethers";
import { LENS_CHAIN_ID } from "../constants/index";

export const buildRawTransaction = (
  raw: any,
): ethers.providers.TransactionRequest => {
  if (!raw) {
    throw new Error("No raw data.");
  }

  if (Number(raw?.chainId) !== LENS_CHAIN_ID) {
    throw new Error("Invalid transaction chain id.");
  }

  if (typeof raw?.to !== "string" || !ethers.utils.isAddress(raw?.to)) {
    throw new Error("Invalid transaction recipient address.");
  }

  return {
    chainId: raw?.chainId,
    from: raw?.from,
    to: raw?.to,
    nonce: raw?.nonce,
    gasLimit: raw?.gasLimit,
    maxFeePerGas: raw?.maxFeePerGas,
    maxPriorityFeePerGas: raw?.maxPriorityFeePerGas,
    value: raw?.value,
    data: raw?.data,
  };
};
