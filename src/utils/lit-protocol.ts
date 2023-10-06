import { ethers } from "ethers";
import { CHRONICLE_PKP_CONTRACT, DENO_BUNDLED } from "./../../src/constants";
import { joinSignature } from "@ethersproject/bytes";
import { serialize } from "@ethersproject/transactions";
import bs58 from "bs58";
import * as LitJsSdk_authHelpers from "@lit-protocol/auth-helpers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { SiweMessage } from "siwe";
let crypto: any, CryptoJS: any;

const loadNodebuild = async () => {
  if (typeof window === "undefined") {
    crypto = await import("crypto");
    CryptoJS = await import("crypto-js");
  }
};

loadNodebuild();

import {
  ChainIds,
  ContractABI,
  GeneratedTxData,
  LitAuthSig,
  UserMetrics,
} from "./../../src/@types/kinora-sdk";
import { IRelayPKP, SessionSigs } from "@lit-protocol/types";

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

export const getBytesFromMultihash = (multihash: string): string => {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
};

export const hashHex = (input: string): string => {
  if (!CryptoJS) {
    throw new Error("This function can only be run in a Node.js environment.");
  }
  const hash = CryptoJS.SHA256(input);
  return "0x" + hash.toString(CryptoJS.enc.Hex);
};

export const encryptMetrics = async (
  metrics: UserMetrics,
  developerPKPAddress: `0x${string}`,
  userPKPAddress: `0x${string}`,
  userPKPAuthSig: LitAuthSig,
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
        authSig: userPKPAuthSig,
        chain: "polygon",
        dataToEncrypt: JSON.stringify(metrics),
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

export const getSessionSig = async (
  authMethod: any,
  currentPKP: IRelayPKP,
  provider: any,
  litNodeClient: any,
  chainId: number,
): Promise<{
  sessionSigs?: SessionSigs;
  error?: boolean;
  message?: string;
}> => {
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
    return {
      sessionSigs,
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

export const decryptMetrics = async (
  encryptMetrics: { ciphertext: string; dataToEncryptHash: string },
  developerPKPAddress: `0x${string}`,
  userPKPAddress: `0x${string}`,
  userPKPAuthSig: LitAuthSig,
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
        ciphertext: encryptMetrics.ciphertext,
        dataToEncryptHash: encryptMetrics.dataToEncryptHash,
        authSig: userPKPAuthSig,
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

export const assignLitAction = async (
  pkpPermissionsContract: ethers.Contract,
  tokenId: string,
  bytesHash: string,
): Promise<{ txHash?: string; error?: boolean; message?: string }> => {
  try {
    console.log("before");
    const addedLitActionTx = await pkpPermissionsContract.addPermittedAction(
      tokenId,
      bytesHash,
      [],
    );
    console.log("here");
    return { txHash: addedLitActionTx };
  } catch (err: any) {
    return {
      error: true,
      message: err.message,
    };
  }
};

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

export const generateSecureRandomKey = () => {
  if (!crypto) {
    throw new Error("This function can only be run in a Node.js environment.");
  }
  return crypto.randomBytes(32).toString("hex");
};

export const getLitActionCodeForJoinQuest = (
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
  return ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
    ),
  );
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

export const getLitActionCodeForMilestoneCompletion = (
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
    return ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
      ),
    );
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

export const getLitActionCodeForAddUserMetrics = (
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
      return ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
        ),
      );
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

export const bundleCodeManual = (dynamicCode: string): string => {
  return DENO_BUNDLED + "\n\n" + dynamicCode;
};
