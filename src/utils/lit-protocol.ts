import { ethers } from "ethers";
import { IPFS_CID_PKP, PKP_CONTRACT_ADDRESS } from "src/constants";
import { joinSignature } from "@ethersproject/bytes";
import { serialize } from "@ethersproject/transactions";
import bs58 from "bs58";

export const createTxData = async (
  provider: ethers.providers.JsonRpcProvider,
  abi: any,
  contractAddress: string,
  functionName: string,
  args: any[],
  chainId: number
) => {
  try {
    const contractInterface = new ethers.utils.Interface(abi);

    const latestBlock = await provider.getBlock("latest");
    const baseFeePerGas = latestBlock.baseFeePerGas;
    const maxFeePerGas = baseFeePerGas?.lt(
      ethers.utils.parseUnits("40", "gwei")
    )
      ? ethers.utils.parseUnits("40", "gwei")
      : baseFeePerGas;

    const maxPriorityFeePerGas = ethers.utils.parseUnits("40", "gwei");
    return {
      to: contractAddress,
      nonce: (await provider.getTransactionCount(PKP_CONTRACT_ADDRESS)) || 0,
      chainId: chainId,
      gasLimit: ethers.BigNumber.from("25000000"),
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      from: "{{publicKey}}",
      data: contractInterface.encodeFunctionData(functionName, args),
      value: ethers.BigNumber.from(0),
      type: 2,
    };
  } catch (err: any) {
    console.error(err.message);
  }
};

export const litExecute = async (
  provider: ethers.providers.JsonRpcProvider,
  litClient: any,
  tx: any,
  sigName: string,
  authSig: any,
  publicKey: `0x04${string}`,
  retryCount: number = 0
) => {
  const maxRetries = 5;
  try {
    const results = await litClient.executeJs({
      ipfsId: IPFS_CID_PKP,
      authSig,
      jsParams: {
        publicKey: publicKey,
        tx,
        sigName,
      },
    });

    const signature = results.signatures[sigName];
    const sig: {
      r: string;
      s: string;
      recid: number;
      signature: string;
      publicKey: string;
      dataSigned: string;
    } = signature as {
      r: string;
      s: string;
      recid: number;
      signature: string;
      publicKey: string;
      dataSigned: string;
    };

    const encodedSignature = joinSignature({
      r: "0x" + sig.r,
      s: "0x" + sig.s,
      recoveryParam: sig.recid,
    });
    const serialized = serialize(tx as any, encodedSignature);
    const transactionHash = await provider.sendTransaction(serialized);

    await transactionHash.wait();
  } catch (err: any) {
    if (
      (err.message.includes("timeout") ||
        err.message.includes("underpriced")) &&
      retryCount < maxRetries
    ) {
      console.warn(`Retry attempt ${retryCount + 1} after timeout error.`);
      await litExecute(
        provider,
        litClient,
        tx,
        sigName,
        authSig,
        publicKey,
        retryCount + 1
      );
    } else {
      console.error(err.message);
    }
  }
};

export const getBytesFromMultihash = (multihash: string): string => {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
};
