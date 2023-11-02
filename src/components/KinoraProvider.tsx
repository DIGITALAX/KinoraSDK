import React, { createContext } from "react";
import Kinora from "./../../src/kinora";

const KinoraContext = createContext<Kinora | null>(null);

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
