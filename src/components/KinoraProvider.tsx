import React, { createContext } from "react";
import Kinora from "./../../src/kinora";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param children - The child React components over which the Kinora context is provided.
 * @param config.errorHandlingModeStrict - An optional flag indicating whether strict error handling mode is enabled.
 */
const KinoraProvider: React.FC<{
  children: React.ReactNode;
  errorHandlingModeStrict?: boolean;
}> = ({ children, errorHandlingModeStrict }) => {
  const kinoraSDKInstance = Kinora.getInstance(errorHandlingModeStrict);

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
