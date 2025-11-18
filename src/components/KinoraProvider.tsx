import React, { createContext } from "react";
import Kinora from "./../kinora";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { IPFSConfig } from "../@types/kinora-sdk";

const KinoraContext = createContext<Kinora | null>(null);

/**
 * A Kinora Provider Component that provides a Kinora instance to the component subtree.
 *
 * @component
 * @param playerAuthedApolloClient - Authed player Apollo Client for Lens Queries
 * @param ipfsConfig - IPFS configuration with upload endpoint, gateway, and optional headers
 * @param children - The child React components over which the Kinora context is provided.
 */
const KinoraProvider: React.FC<{
  playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  ipfsConfig: IPFSConfig;
  children: React.ReactNode;
}> = ({ children, playerAuthedApolloClient, ipfsConfig }) => {
  const kinoraSDKInstance = Kinora.getInstance(playerAuthedApolloClient, ipfsConfig);

  return (
    <KinoraContext.Provider value={kinoraSDKInstance}>
      {children}
    </KinoraContext.Provider>
  );
};

export { KinoraProvider, KinoraContext };
