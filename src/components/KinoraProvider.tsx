import React, { createContext } from "react";
import Kinora from "./../kinora";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param children - The child React components over which the Kinora context is provided.
 */
const KinoraProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const kinoraSDKInstance = Kinora.getInstance();

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
