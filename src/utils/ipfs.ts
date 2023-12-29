import axios from "axios";

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
