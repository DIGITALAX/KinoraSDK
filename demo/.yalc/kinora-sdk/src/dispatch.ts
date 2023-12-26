import { ethers } from "ethers";
import {
  KINORA_OPEN_ACTION_CONTRACT,
  LENS_HUB_PROXY_CONTRACT,
} from "./constants";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { omit } from "lodash";
import { act } from "./graphql/mutations/actOn";
import LensHubProxyAbi from "./../src/abis/LensHubProxy.json";

export class Dispatch {
  /**
   * @private
   * @type {ApolloClient<NormalizedCacheObject>}
   * @description Authenticated Apollo Client for player interactions.
   */
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;

  /**
   * @private
   * @type {ethers.Contract}
   * @description Instance of ethers.Contract for interacting with the Lens Hub Proxy contract.
   */
  private lensHubProxyContract: ethers.Contract;

  /**
   * @constructor
   * @param {ApolloClient<NormalizedCacheObject>} [args.playerAuthedApolloClient] - Authenticated Apollo client for the player
   */
  constructor(args: {
    playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  }) {
    this.playerAuthedApolloClient = args.playerAuthedApolloClient;
  }

  /**
   * @method
   * @description Allows a player to join a quest. Ensures a Player Authed Apollo Client is set before proceeding.
   * @param {string} postId - The Lens Pub Id of the quest.
   * @param {ethers.Wallet} wallet - The Player's wallet for signing and broadcasting the tx.
   * @param {boolean} encrypt - Player to choose to encrypt metrics for quest or not.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerJoinQuest = async (
    postId: `0x${string}`,
    wallet: ethers.Wallet,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }
    try {
      this.lensHubProxyContract = new ethers.Contract(
        LENS_HUB_PROXY_CONTRACT,
        LensHubProxyAbi,
        wallet,
      );

      const { data } = await act(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: "",
            },
          },
          for: postId,
        },
        this.playerAuthedApolloClient,
      );

      const typedData = data?.createActOnOpenActionTypedData.typedData;

      await wallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            JSON.stringify({
              types: omit(typedData?.types, ["__typename"]),
              primaryType: "Act",
              domain: omit(typedData?.domain, ["__typename"]),
              message: omit(typedData?.value, ["__typename"]),
            }),
          ),
        ),
      );

      const tx = await this.lensHubProxyContract.act({
        publicationActedProfileId: parseInt(
          typedData?.value.publicationActedProfileId,
          16,
        ),
        publicationActedId: parseInt(typedData?.value.publicationActedId, 16),
        actorProfileId: parseInt(typedData?.value.actorProfileId, 16),
        referrerProfileIds: typedData?.value.referrerProfileIds,
        referrerPubIds: typedData?.value.referrerPubIds,
        actionModuleAddress: typedData?.value.actionModuleAddress,
        actionModuleData: typedData?.value.actionModuleData,
      });

      const txHash = await tx.wait();

      return {
        txHash: txHash,
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
   * @param {string} postId - The Lens Pub Id of the quest.
   * @param {ethers.Wallet} wallet - The Player's wallet for signing and broadcasting the tx.
   * @throws Will throw an error if the Player Authed Apollo Client is not set.
   * @returns {Promise<Object>} - Promise resolving to an object containing data about the action performed.
   */
  playerCompleteQuestMilestone = async (
    postId: `0x${string}`,
    wallet: ethers.Signer,
  ): Promise<{
    txHash?: string;
    error: boolean;
    errorMessage?: string;
  }> => {
    if (!this.playerAuthedApolloClient) {
      throw new Error(`Set Player Authed Apollo Client before Continuing.`);
    }

    try {
      const { data } = await act(
        {
          actOn: {
            unknownOpenAction: {
              address: KINORA_OPEN_ACTION_CONTRACT,
              data: "",
            },
          },
          for: postId,
        },
        this.playerAuthedApolloClient,
      );

      const typedData = data?.createActOnOpenActionTypedData?.typedData;

      await wallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            JSON.stringify({
              types: omit(typedData?.types, ["__typename"]),
              primaryType: "Post",
              domain: omit(typedData?.domain, ["__typename"]),
              message: omit(typedData?.value, ["__typename"]),
            }),
          ),
        ),
      );

      const tx = await this.lensHubProxyContract.act({
        publicationActedProfileId: parseInt(
          typedData?.value.publicationActedProfileId,
          16,
        ),
        publicationActedId: parseInt(typedData?.value.publicationActedId, 16),
        actorProfileId: parseInt(typedData?.value.actorProfileId, 16),
        referrerProfileIds: typedData?.value.referrerProfileIds,
        referrerPubIds: typedData?.value.referrerPubIds,
        actionModuleAddress: typedData?.value.actionModuleAddress,
        actionModuleData: typedData?.value.actionModuleData,
      });

      const txHash = await tx.wait();

      return {
        txHash: txHash,
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
