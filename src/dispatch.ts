import { ethers } from "ethers";
import { KINORA_OPEN_ACTION_CONTRACT } from "./constants";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { ActOnOpenActionMutation } from "./@types/generated";
import actOnGrant from "./graphql/mutations/actOn";


export class Dispatch {
  /**
   * @private
   * @type {Object}
   * @description Quest envoker's PKP data including public key, token Id, and Ethereum address.
   */
  private questEnvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };

  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @constructor
   * @param {`0x04${string}`} [args.questEnvokerPKPPublicKey] - Quest envoker's PKP public key (optional)
   * @param {string} [args.questEnvokerPKPTokenId] - Quest envoker's PKP token Id (optional)
   * @param {ApolloClient<NormalizedCacheObject>} [args.playerAuthedApolloClient] - Authenticated Apollo client for the player
   */
  constructor(args: {
    questEnvokerPKPPublicKey: `0x04${string}`;
    questEnvokerPKPTokenId: string;
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  }) {
    this.questEnvokerPKPData = {
      publicKey: args.questEnvokerPKPPublicKey,
      tokenId: args.questEnvokerPKPTokenId,
      ethAddress: ethers.utils.computeAddress(
        args.questEnvokerPKPPublicKey,
      ) as `0x${string}`,
    };
    this.playerAuthedApolloClient = args.playerAuthedApolloClient;
  }

  /**
   * @method
   * @description Allows a player to join a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerJoinQuest = async (
    pubId: string,
  ): Promise<{
    data?: ActOnOpenActionMutation;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }
    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [this.questEnvokerPKPData.ethAddress, 0],
      );

      const { data } = await actOnGrant(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: encodedData,
            },
          },
          for: pubId,
        },
        this.playerAuthedApolloClient,
      );

      return {
        data: data,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error Player joining new Quest: ${err.message}`,
      };
    }
  };

  /**
   * @method
   * @description Allows a player to complete a milestone in a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} pubId - The Lens Pub Id of the quest.
   * @param {number} milestone - The milestone number to be completed.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerCompleteQuestMilestone = async (
    pubId: string,
    milestone: number,
  ): Promise<{
    data?: ActOnOpenActionMutation;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }

    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [this.questEnvokerPKPData.ethAddress, milestone],
      );

      const { data } = await actOnGrant(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: encodedData,
            },
          },
          for: pubId,
        },
        this.playerAuthedApolloClient,
      );

      return {
        data: data,
        error: false,
      };
    } catch (err: any) {
      return {
        error: true,
        errorMessage: `Error completing player Milestone: ${err.message}`,
      };
    }
  };
}
