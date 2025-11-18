import axios from "axios";
import { IPFSConfig } from "../@types/kinora-sdk";

export const hashToIPFS = async (
  itemToHash: string,
  config: IPFSConfig
): Promise<{
  cid?: `ipfs://${string}`;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await axios.post(
      config.uploadEndpoint,
      itemToHash,
      {
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
      }
    );

    const hash = response.data.ipfsHash || response.data.IpfsHash || response.data.Hash;

    return {
      cid: `ipfs://${hash}`,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};


export const fetchIPFS = async (
  hash: `ipfs://${string}`,
  config: IPFSConfig
): Promise<{
  data?: string;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await axios.get(
      `${config.gateway}/ipfs/${hash?.split("ipfs://")?.[1]}`,
      {
        headers: config.headers,
      }
    );

    return {
      data: response.data,
      error: false,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};
