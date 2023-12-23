const hashToIPFS = async (
  itemToHash: string,
): Promise<{
  cid?: `ipfs://${string}`;
  error?: boolean;
  message?: string;
}> => {
  try {
    const response = await fetch("http://ipfs/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: itemToHash,
    });

    const data = await response.json();
    return {
      cid: ("ipfs://" + data.path) as `ipfs://${string}`,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};
