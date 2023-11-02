import { ethers } from "ethers";
import { CHRONICLE_PKP_CONTRACT, DENO_BUNDLED } from "./../../src/constants";
import { joinSignature } from "@ethersproject/bytes";
import { serialize } from "@ethersproject/transactions";
import bs58 from "bs58";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { SiweMessage } from "siwe";
import {
  ContractABI,
  GeneratedTxData,
  LitAuthSig,
} from "./../../src/@types/kinora-sdk";
let crypto: any, CryptoJS: any;

/**
 * @function loadNodebuild
 * @description Dynamically imports crypto and crypto-js libraries if running in a Node.js environment.
 * @returns {Promise<void>}
 */
const loadNodebuild = async () => {
  if (typeof window === "undefined") {
    crypto = await import("crypto");
    CryptoJS = await import("crypto-js");
  }
};

// Invokes the function to ensure necessary libraries are loaded in Node.js environment.
loadNodebuild();

/**
 * @function createTxData
 * @description Asynchronously generates transaction data necessary for interacting with a smart contract.
 * @param {ethers.providers.JsonRpcProvider} provider - The Ethereum provider instance.
 * @param {ContractABI} abi - The ABI of the contract you are interacting with.
 * @param {string} functionName - The name of the function in the smart contract that you want to call.
 * @param {any[]} args - An array of arguments to pass to the smart contract function.
 * @returns {Promise<{error?: boolean, message?: string, generatedTxData?: GeneratedTxData}>} -
 *   A promise that resolves to an object containing either an error or the generated transaction data.
 */
export const createTxData = async (
  provider: ethers.providers.JsonRpcProvider,
  abi: ContractABI,
  functionName: string,
  args: any[],
): Promise<{
  error?: boolean;
  message?: string;
  generatedTxData?: GeneratedTxData;
}> => {
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
      generatedTxData: {
        nonce:
          (await provider.getTransactionCount(CHRONICLE_PKP_CONTRACT)) || 0,
        gasLimit: ethers.BigNumber.from("25000000"),
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        data: contractInterface.encodeFunctionData(functionName, args),
      },
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function litExecute
 * @description Asynchronously executes a transaction via Lit (Lightning Identity Token) protocol,
 *   handling retries in case of timeout or underpriced errors.
 * @param {ethers.providers.JsonRpcProvider} provider - The Ethereum provider instance.
 * @param {any} litClient - The Lit client instance.
 * @param {GeneratedTxData} tx - The transaction data.
 * @param {string} sigName - The signature name.
 * @param {LitAuthSig} authSig - The Lit authentication signature.
 * @param {string} ipfsHash - The IPFS hash of the data being transacted.
 * @param {string} publicKey - The public key of the transactor.
 * @param {string} multihashDevKey - The developer's multihash key.
 * @param {string} hashKeyItem - The hash key item (to combine with the multikeyhash).
 * @param {number} retryCount - The current retry count (defaults to 0).
 * @returns {Promise<{error: boolean, txHash?: string, message?: string, litResponse?: any}>} -
 *   A promise that resolves to an object containing either an error or the transaction hash and Lit response.
 */
export const litExecute = async (
  provider: ethers.providers.JsonRpcProvider,
  litClient: any,
  tx: GeneratedTxData,
  sigName: string,
  authSig: LitAuthSig,
  ipfsHash: string,
  publicKey: `0x04${string}`,
  multihashDevKey: string,
  hashKeyItem: string,
  retryCount: number = 0,
): Promise<{
  error: boolean;
  txHash?: string;
  message?: string;
  litResponse?: any;
}> => {
  const maxRetries = 5;
  try {
    const results = await litClient.executeJs({
      ipfsHash,
      authSig,
      jsParams: {
        publicKey,
        sigName,
        data: tx.data,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        multihashDevKey,
        hashKeyItem,
      },
    });

    const signature = results.signedData[sigName];
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
      litResponse: results,
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
        ipfsHash,
        publicKey,
        multihashDevKey,
        hashKeyItem,
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

/**
 * @function generateAuthSig
 * @description Asynchronously generates an authentication signature for KinoraSDK.
 * @param {ethers.Signer} signer - The signer instance for signing the message.
 * @param {number} [chainId=1] - The chain ID, defaults to 1.
 * @param {string} [uri="https://localhost/login"] - The URI, defaults to "https://localhost/login".
 * @param {string} [version="1"] - The version, defaults to "1".
 * @returns {Promise<{error?: boolean, message?: string, litAuthSig?: LitAuthSig}>} -
 *   A promise that resolves to an object containing either an error or the Lit authentication signature.
 */
export const generateAuthSig = async (
  signer: ethers.Signer,
  chainId = 1,
  uri = "https://localhost/login",
  version = "1",
): Promise<{
  error?: boolean;
  message?: string;
  litAuthSig?: LitAuthSig;
}> => {
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
      litAuthSig: {
        sig,
        derivedVia: "web3.eth.personal.sign",
        signedMessage,
        address,
      },
    };
  } catch (err) {
    throw new Error(`Error generating signed message ${err}`);
  }
};

/**
 * @function getBytesFromMultihash
 * @description Converts a multihash string to a hexadecimal string.
 * @param {string} multihash - The multihash string.
 * @returns {string} - The hexadecimal representation of the multihash.
 */
export const getBytesFromMultihash = (multihash: string): string => {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
};

/**
 * @function hashHex
 * @description Hashes a hexadecimal string using SHA-256.
 * @param {string} input - The input hexadecimal string.
 * @returns {string} - The SHA-256 hash of the input string.
 */
export const hashHex = (input: string): string => {
  if (!CryptoJS) {
    throw new Error("This function can only be run in a Node.js environment.");
  }
  const hash = CryptoJS.SHA256(input);
  return "0x" + hash.toString(CryptoJS.enc.Hex);
};

/**
 * @function encryptMetrics
 * @description Asynchronously encrypts metrics data based on specified conditions and authorization signature.
 * @param {string} metrics - The metrics data as a string.
 * @param {string} questEnvokerPKPAddress - The quest envoker's PKP address.
 * @param {string} playerPKPAddress - The player's PKP address.
 * @param {LitAuthSig} playerPKPAuthSig - The player's PKP authorization signature.
 * @param {LitJsSdk.LitNodeClient} litNodeClient - The Lit Node Client instance.
 * @returns {Promise<{encryptedString?: string, error?: boolean, message?: string}>} -
 *   A promise that resolves to an object containing either an error or the encrypted metrics string.
 */
export const encryptMetrics = async (
  metrics: string,
  questEnvokerPKPAddress: `0x${string}`,
  playerPKPAddress: `0x${string}`,
  playerPKPAuthSig: LitAuthSig,
  litNodeClient: LitJsSdk.LitNodeClient,
): Promise<{
  encryptedString?: string;
  error?: boolean;
  message?: string;
}> => {
  try {
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions: [
          {
            contractAddress: "",
            standardContractType: "",
            chain: "polygon",
            method: "",
            parameters: [":playerAddress"],
            returnValueTest: {
              comparator: "=",
              value: questEnvokerPKPAddress.toLowerCase(),
            },
          },
          {
            contractAddress: "",
            standardContractType: "",
            chain: "polygon",
            method: "",
            parameters: [":playerAddress"],
            returnValueTest: {
              comparator: "=",
              value: playerPKPAddress?.toLowerCase(),
            },
          },
        ],
        authSig: playerPKPAuthSig,
        chain: "polygon",
        dataToEncrypt: metrics,
      },
      litNodeClient,
    );

    return {
      encryptedString: JSON.stringify({
        ciphertext: ciphertext,
        dataToEncryptHash: dataToEncryptHash,
      }),
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function decryptMetrics
 * @description Asynchronously decrypts encrypted metrics data based on specified conditions and authorization signature.
 * @param {{ciphertext: string, dataToEncryptHash: string}} encryptMetrics - The encrypted metrics data.
 * @param {string} questEnvokerPKPAddress - The quest envoker's PKP address.
 * @param {string} playerProfileOwnerAddress - The player profile owner's address.
 * @param {LitAuthSig} playerPKPAuthSig - The player's PKP authorization signature.
 * @param {LitJsSdk.LitNodeClient} litNodeClient - The Lit Node Client instance.
 * @returns {Promise<{decryptedString?: string, error?: boolean, message?: string}>} -
 *   A promise that resolves to an object containing either an error or the decrypted metrics string.
 */
export const decryptMetrics = async (
  encryptMetrics: { ciphertext: string; dataToEncryptHash: string },
  questEnvokerPKPAddress: `0x${string}`,
  playerProfileOwnerAddress: `0x${string}`,
  playerPKPAuthSig: LitAuthSig,
  litNodeClient: LitJsSdk.LitNodeClient,
): Promise<{ decryptedString?: string; error?: boolean; message?: string }> => {
  try {
    const decryptedString = await LitJsSdk.decryptToString(
      {
        accessControlConditions: [
          {
            contractAddress: "",
            standardContractType: "",
            chain: "polygon",
            method: "",
            parameters: [":playerAddress"],
            returnValueTest: {
              comparator: "=",
              value: questEnvokerPKPAddress.toLowerCase(),
            },
          },
          {
            contractAddress: "",
            standardContractType: "",
            chain: "polygon",
            method: "",
            parameters: [":playerAddress"],
            returnValueTest: {
              comparator: "=",
              value: playerProfileOwnerAddress?.toLowerCase(),
            },
          },
        ],
        ciphertext: encryptMetrics.ciphertext,
        dataToEncryptHash: encryptMetrics.dataToEncryptHash,
        authSig: playerPKPAuthSig,
        chain: "polygon",
      },
      litNodeClient,
    );

    return { decryptedString };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function mintNextPKP
 * @description Asynchronously mints the next PKP (Personal Key Pair) token using a specified contract instance.
 * @param {ethers.Contract} pkpContract - The contract instance for minting PKP tokens.
 * @returns {Promise<{pkpTokenId?: string, publicKey?: `0x04${string}`, error?: boolean, message?: string}>} -
 *    A promise that resolves to an object containing either a PKP token ID and public key or an error.
 */
export const mintNextPKP = async (
  pkpContract: ethers.Contract,
): Promise<{
  pkpTokenId?: string;
  publicKey?: `0x04${string}`;
  error?: boolean;
  message?: string;
}> => {
  try {
    const tx = await pkpContract.mintNext(2, { value: "1" });
    const receipt = await tx.wait();
    const logs = receipt.logs;
    const pkpTokenId = BigInt(logs[0].topics[3]).toString();
    const publicKey = await pkpContract.getPubkey(pkpTokenId);
    return { publicKey, pkpTokenId };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function assignLitAction
 * @description Asynchronously assigns a Lit action to a specified token ID using a specified contract instance.
 * @param {ethers.Contract} pkpPermissionsContract - The contract instance for managing PKP permissions.
 * @param {string} tokenId - The token ID to which the Lit action is to be assigned.
 * @param {string} bytesHash - The hash of the Lit action to be assigned.
 * @returns {Promise<{txHash?: string, error?: boolean, message?: string}>} -
 *    A promise that resolves to an object containing either a transaction hash or an error.
 */
export const assignLitAction = async (
  pkpPermissionsContract: ethers.Contract,
  tokenId: string,
  bytesHash: string,
): Promise<{ txHash?: string; error?: boolean; message?: string }> => {
  try {
    const addedLitActionTx = await pkpPermissionsContract.addPermittedAction(
      tokenId,
      bytesHash,
      [],
    );
    return { txHash: addedLitActionTx };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function removeLitAction
 * @description Asynchronously removes a Lit action from a specified token ID using a specified contract instance.
 * @param {ethers.Contract} pkpPermissionsContract - The contract instance for managing PKP permissions.
 * @param {string} tokenId - The token ID from which the Lit action is to be removed.
 * @param {string} bytesHash - The hash of the Lit action to be removed.
 * @returns {Promise<{txHash?: string, error?: boolean, message?: string}>} -
 *    A promise that resolves to an object containing either a transaction hash or an error.
 */
export const removeLitAction = async (
  pkpPermissionsContract: ethers.Contract,
  tokenId: string,
  bytesHash: string,
): Promise<{ txHash?: string; error?: boolean; message?: string }> => {
  try {
    const addedLitActionTx = await pkpPermissionsContract.removePermittedAction(
      tokenId,
      bytesHash,
    );
    return { txHash: addedLitActionTx };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

/**
 * @function generateSecureRandomKey
 * @description Generates a secure random key, only runnable in a Node.js environment due to dependency on Node's crypto module.
 * @throws Will throw an error if function is run outside a Node.js environment.
 * @returns {string} - The generated secure random key as a hexadecimal string.
 */
export const generateSecureRandomKey = () => {
  if (!crypto) {
    throw new Error("This function can only be run in a Node.js environment.");
  }
  return crypto.randomBytes(32).toString("hex");
};

/**
 * @function getLitActionCode
 * @description Generates a string of JavaScript code for a Lit action, given a conditional hash and contract address.
 * @param {string} conditionalHash - The conditional hash to be used in the generated code.
 * @param {string} contractAddress - The contract address to be used in the generated code.
 * @returns {string} - The generated JavaScript code as a string.
 */
export const getLitActionCode = (
  conditionalHash: string,
  contractAddress: string,
): string => {
  return `
  import CryptoJS from "crypto-js";

  const CONDITIONAL_HASH = "${conditionalHash}";
  
  const hashHex = (input) => {
    const hash = CryptoJS.SHA256(input);
    return "0x" + hash.toString(CryptoJS.enc.Hex);
  };

  const hashTransaction = (tx) => {
    return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.arrayify(ethers.utils.toUtf8Bytes(String(tx)))));
  };
  
  const go = async () => {
    try {
      const txData = {
        to: "${contractAddress}",
        nonce,
        chainId: 137,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        from: "{{publicKey}}",
        data,
        value: ethers.BigNumber.from(0),
        type: 2,
      };
      await Lit.Actions.signEcdsa({
        toSign: hashTransaction(txData),
        publicKey,
        sigName,
      });
      Lit.Actions.setResponse({ response: JSON.stringify(txData) });
    } catch (err) {
      console.log("Error thrown: ", err);
    }
  };
  
  if (hashHex(hashKeyItem + multihashDevKey) === CONDITIONAL_HASH) {
    go();
  }
  `;
};

/**
 * @function bundleCodeManual
 * @description Bundles dynamic code with a pre-defined bundled code string (DENO_BUNDLED).
 * @param {string} dynamicCode - The dynamic code to be bundled.
 * @returns {string} - The bundled code as a string.
 */
export const bundleCodeManual = (dynamicCode: string): string => {
  return DENO_BUNDLED + "\n\n" + dynamicCode;
};
