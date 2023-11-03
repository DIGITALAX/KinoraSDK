import React, { createContext } from "react";
import Kinora from "./../../src/kinora";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param children - The child React components over which the Kinora context is provided.
 * @param questEnvokerProfileId - The Lens Profile Id of the quest envoker.
 * @param questEnvokerPKPData - The public key pair data of the quest envoker, containing a public key and a token Id.
 * @param rpcURL - The URL of the remote procedure call (RPC) server.
 * @param multihashDevKey - The development key for multihash operations.
 * @param kinoraMetricsContractAddress - The Ethereum address of the Kinora Metrics smart contract, represented as a hexadecimal string prefixed with "0x".
 * @param errorHandlingModeStrict - An optional flag indicating whether strict error handling mode is enabled.
 */
const KinoraProvider: React.FC<{
  children: React.ReactNode;
  questEnvokerProfileId: `0x${string}`;
  questEnvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
  };
  rpcURL: string;
  multihashDevKey: string;
  kinoraMetricsContractAddress: `0x${string}`;
  errorHandlingModeStrict?: boolean;
}> = ({
  children,
  questEnvokerProfileId,
  questEnvokerPKPData,
  rpcURL,
  multihashDevKey,
  kinoraMetricsContractAddress,
  errorHandlingModeStrict,
}) => {
  if (!/^0x[a-fA-F0-9]+$/.test(questEnvokerProfileId)) {
    throw new Error(
      "Invalid questEnvokerProfileId format. Make sure to use your valid Lens Profile Id.",
    );
  }
  const kinoraSDKInstance = Kinora.getInstance(
    questEnvokerProfileId,
    questEnvokerPKPData,
    multihashDevKey,
    rpcURL,
    kinoraMetricsContractAddress,
    errorHandlingModeStrict,
  );

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
