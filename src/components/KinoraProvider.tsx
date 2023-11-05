import React, { createContext } from "react";
import Kinora from "./../../src/kinora";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param children - The child React components over which the Kinora context is provided.
 * @param config.questEnvokerProfileId - The Lens Profile Id of the quest envoker.
 * @param config.questEnvokerPKPData - The public key pair data of the quest envoker, containing a public key and a token Id.
 * @param config.rpcURL - The RPC URL for Polygon Mainnet.
 * @param config.multihashDevKey - The development key for multihash operations.
 * @param config.kinoraMetricsContractAddress - The Ethereum address of the Kinora Metrics smart contract.
 * * @param config.kinoraQuestContractAddress - The Ethereum address of the Kinora Quest smart contract.
 * @param config.errorHandlingModeStrict - An optional flag indicating whether strict error handling mode is enabled.
 */
const KinoraProvider: React.FC<{
  children: React.ReactNode;
  config: {
    questEnvokerProfileId: `0x${string}`;
    questEnvokerPKPData: {
      publicKey: `0x04${string}`;
      tokenId: string;
    };
    rpcURL: string;
    multihashDevKey: string;
    kinoraMetricsContractAddress: `0x${string}`;
    kinoraQuestContractAddress: `0x${string}`;
    errorHandlingModeStrict?: boolean;
  };
}> = ({ children, config }) => {
  if (!/^0x[a-fA-F0-9]+$/.test(config.questEnvokerProfileId)) {
    throw new Error(
      "Invalid questEnvokerProfileId format. Make sure to use your valid Lens Profile Id.",
    );
  }
  const kinoraSDKInstance = Kinora.getInstance(
    config.questEnvokerProfileId,
    config.questEnvokerPKPData,
    config.multihashDevKey,
    config.rpcURL,
    config.kinoraMetricsContractAddress,
    config.kinoraQuestContractAddress,
    config.errorHandlingModeStrict,
  );

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
