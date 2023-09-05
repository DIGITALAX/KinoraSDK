import { ethers } from "ethers";
import { IPFS_CID_PKP, CHRONICLE_PKP_CONTRACT } from "src/constants";
import { joinSignature } from "@ethersproject/bytes";
import { serialize } from "@ethersproject/transactions";
import bs58 from "bs58";
import * as LitJsSdk_authHelpers from "@lit-protocol/auth-helpers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { SiweMessage } from "siwe";

import {
  ChainIds,
  ContractABI,
  GeneratedTxData,
  LitAuthSig,
  UserMetrics,
} from "src/@types/kinora-sdk";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";

export const createTxData = async (
  provider: ethers.providers.JsonRpcProvider,
  abi: ContractABI,
  contractAddress: string,
  functionName: string,
  args: any[],
  chainId: number,
): Promise<GeneratedTxData> => {
  try {
    const contractInterface = new ethers.utils.Interface(abi);

    const latestBlock = await provider.getBlock("latest");
    const baseFeePerGas = latestBlock.baseFeePerGas;
    const maxFeePerGas = baseFeePerGas?.lt(
      ethers.utils.parseUnits("40", "gwei"),
    )
      ? ethers.utils.parseUnits("40", "gwei")
      : baseFeePerGas;

    const maxPriorityFeePerGas = ethers.utils.parseUnits("40", "gwei");
    return {
      to: contractAddress as `0x${string}`,
      nonce: (await provider.getTransactionCount(CHRONICLE_PKP_CONTRACT)) || 0,
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
  retryCount: number = 0,
): Promise<{ error: boolean; txHash?: string; message?: string, litResponse?: any }> => {
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

    return {
      error: false,
      txHash: transactionHash.hash,
      litResponse: results
    };
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
        retryCount + 1,
      );
    } else {
      return {
        error: true,
        message: err.message,
      };
    }
  }
};

export const generateAuthSig = async (
  signer: ethers.Signer,
  chainId = 1,
  uri = "https://localhost/login",
  version = "1",
): Promise<LitAuthSig> => {
  try {
    const address = await signer.getAddress();
    const siweMessage = new SiweMessage({
      domain: "localhost",
      address: address,
      statement: "This is an Auth Sig for KinoraSDK",
      uri: uri,
      version: version,
      chainId: chainId,
    });
    const signedMessage = siweMessage.prepareMessage();
    const sig = await signer.signMessage(signedMessage);
    return {
      sig,
      derivedVia: "web3.eth.personal.sign",
      signedMessage,
      address,
    };
  } catch (err) {
    throw new Error(`Error generating signed message ${err}`);
  }
};

export const getBytesFromMultihash = (multihash: string): string => {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
};

export const encryptMetrics = async (
  metrics: UserMetrics,
  developerPKPAddress: `0x${string}`,
  userPKPAddress: `0x${string}`,
  userPKPAuthSig: LitAuthSig,
  litNodeClient: LitJsSdk.LitNodeClient,
): Promise<string> => {
  try {
    const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
      JSON.stringify(metrics),
    );

    const encryptedSymmetricKey = await litNodeClient.saveEncryptionKey({
      accessControlConditions: [
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: developerPKPAddress.toLowerCase(),
          },
        },
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: userPKPAddress?.toLowerCase(),
          },
        },
      ],
      symmetricKey,
      authSig: userPKPAuthSig,
      chain: "polygon",
    });

    const buffer = await encryptedString.arrayBuffer();

    return JSON.stringify({
      encryptedString: JSON.stringify(Array.from(new Uint8Array(buffer))),
      symmetricKey: LitJsSdk.uint8arrayToString(
        encryptedSymmetricKey,
        "base16",
      ),
    });
  } catch (err: any) {
    console.error(err.message);
  }
};

export const getSessionSig = async (
  authMethod: any,
  currentPKP: IRelayPKP,
  provider: any,
  litNodeClient: any,
  chainId: number,
): Promise<SessionSigs> => {
  try {
    const litResource = new LitJsSdk_authHelpers.LitPKPResource(
      currentPKP.tokenId,
    );

    const sessionSigs = await provider.getSessionSigs({
      pkpPublicKey: currentPKP.publicKey,
      authMethod: {
        authMethodType: 6,
        accessToken: authMethod.accessToken,
      },
      sessionSigsParams: {
        chain: ChainIds[chainId],
        resourceAbilityRequests: [
          {
            resource: litResource,
            ability: LitJsSdk_authHelpers.LitAbility.PKPSigning,
          },
        ],
      },
      litNodeClient,
    });
    return sessionSigs;
  } catch (e: any) {
    console.error(e.message);
  }
};

export const decryptMetrics = async (
  encryptMetrics: { encryptedString: ArrayBufferLike; symmetricKey: string },
  developerPKPAddress: `0x${string}`,
  userPKPAddress: `0x${string}`,
  userPKPAuthSig: LitAuthSig,
  litNodeClient: LitJsSdk.LitNodeClient,
): Promise<string> => {
  try {
    const symmetricKey = await litNodeClient.getEncryptionKey({
      accessControlConditions: [
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: developerPKPAddress.toLowerCase(),
          },
        },
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon",
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: userPKPAddress?.toLowerCase(),
          },
        },
      ],
      toDecrypt: encryptMetrics.symmetricKey,
      authSig: userPKPAuthSig,
      chain: "polygon",
    });
    const uintString = new Uint8Array(encryptMetrics.encryptedString).buffer;
    const blob = new Blob([uintString], { type: "text/plain" });
    const decryptedString = await LitJsSdk.decryptString(blob, symmetricKey);

    return decryptedString;
  } catch (err: any) {
    console.error(err);
  }
};
