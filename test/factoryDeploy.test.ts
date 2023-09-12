import { expect } from "chai";
import { Sequence } from "./../src/sequence";
import { Player } from "@livepeer/react";
import { render, fireEvent } from '@testing-library/react';
import { describe } from "mocha";

describe("Test Factory Deployment & Dev PKP Mint", () => {
  let newSequence: Sequence<any, any>;

  beforeEach(async () => {
   
    newSequence = new Sequence({
        livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
        redirectURL: string;
        rpcURL: string;
        metricsOnChainInterval: number; // in minutes,
        encryptUserMetrics: boolean;
        errorHandlingModeStrict?: boolean;
        developerPKPPublicKey?: `0x04${string}`;
        developerPKPTokenId?: string;
        lensPubId?: string;
        userProfileId?: string;
        multihashDevKey?: string;
        signer?: ethers.Signer;
        kinoraMetricsAddress?: `0x${string}`;
        kinoraQuestAddress?: `0x${string}`;
        kinoraReward721Address?: `0x${string}`;
        auth?: {
          projectId: string;
          projectSecret: string;
        };
    });
  });

 describe("")
});
