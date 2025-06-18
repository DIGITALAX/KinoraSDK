import React, { createContext } from "react";
import Kinora from "./../kinora";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param playerAuthedApolloClient - Authed player Apollo Client for Lens Queries
 * @param children - The child React components over which the Kinora context is provided.
 */
const KinoraProvider: React.FC<{
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  children: React.ReactNode;
}> = ({ children, playerAuthedApolloClient }) => {
  const kinoraSDKInstance = Kinora.getInstance(playerAuthedApolloClient);

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
