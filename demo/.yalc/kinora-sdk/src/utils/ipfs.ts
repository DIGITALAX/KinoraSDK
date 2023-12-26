const hashToIPFS = async (
  itemToHash: string,
): Promise<{
  cid?: `ipfs://${string}`;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await fetch("https://kinora-backend.onrender.com/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: itemToHash,
    });

    const data = await response.json();
    return {
      cid: `ipfs://${data.ipfsHash}`,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};
