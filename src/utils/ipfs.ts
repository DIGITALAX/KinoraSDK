import axios from "axios";
import { INFURA_GATEWAY } from "./../constants";

export const hashToIPFS = async (
  itemToHash: string
): Promise<{
  cid?: `ipfs://${string}`;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await axios.post(
      "https://kinora-backend.onrender.com/upload",
      itemToHash,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return {
      cid: `ipfs://${response.data.ipfsHash}`,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};


export const fetchIPFS = async (
  hash: `ipfs://${string}`
): Promise<{
  data?: string;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await axios.get(
      `${INFURA_GATEWAY}/ipfs/${hash?.split("ipfs://")?.[1]}`
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
