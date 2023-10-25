import {
  ChainIds,
  LitAuthSig,
  Milestone,
  PlayerMetrics,
  QuestEligibility,
  ILogEntry,
  LogCategory,
} from "./@types/kinora-sdk";
import { v4 as uuidv4 } from "uuid";
import { Metrics } from "./metrics";
import "@lit-protocol/lit-auth-client";
import axios from "axios";
import { ethers } from "ethers";
import {
  KINORA_OPEN_ACTION_CONTRACT,
  KINORA_FACTORY_CONTRACT,
  LIT_RPC,
  CHRONICLE_PKP_CONTRACT,
  CHRONICLE_PKP_PERMISSIONS_CONTRACT,
  INFURA_GATEWAY,
  CHAIN,
  KINORA_QUEST_DATA_CONTRACT,
} from "./constants";
import KinoraMetricsAbi from "./abis/KinoraMetrics.json";
import KinoraQuestAbi from "./abis/KinoraQuest.json";
import KinoraFactoryAbi from "./abis/KinoraFactory.json";
import PKPNFTAbi from "./abis/PKPNFT.json";
import KinoraQuestDataAbi from "./abis/KinoraQuestData.json";
import PKPPermissionsAbi from "./abis/PKPPermissions.json";
import KinoraEscrowAbi from "./abis/KinoraEscrow.json";
import {
  createTxData,
  litExecute,
  getBytesFromMultihash,
  generateAuthSig,
  encryptMetrics,
  decryptMetrics,
  assignLitAction,
  getLitActionCodeForAddPlayerMetrics,
  removeLitAction,
  hashHex,
  bundleCodeManual,
  mintNextPKP,
  generateSecureRandomKey,
} from "./utils/lit-protocol";
import { EventEmitter } from "events";
import { JsonRpcProvider } from "@ethersproject/providers";
import getLensValues from "./apollo/queries/getLensValues";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import onChainPost from "./apollo/mutations/onChainPost";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { ActOnOpenActionMutation, ImageMetadataV3 } from "./@types/generated";
import actOnGrant from "./apollo/mutations/actOn";

export class Sequence extends EventEmitter {
  private metrics: Metrics;
  private videoElement: HTMLVideoElement;
  private polygonProvider: JsonRpcProvider;
  private chronicleProvider: JsonRpcProvider;
  private logSize = 1000;
  private logIndex = 0;
  private logs: ILogEntry[] = new Array(this.logSize);
  private rpcURL: string;
  private parentId: string;
  private chain: string = CHAIN;
  private multihashDevKey: string;
  private playerProfileId: string;
  private questInvokerProfileId: string;
  private questInvokerPKPData: {
    publicKey: `0x04${string}`;
    tokenId: string;
    ethAddress: `0x${string}`;
  };
  private encryptPlayerMetrics: boolean;
  private errorHandlingModeStrict: boolean = false;
  private metricsOnChainInterval: number = 60000;
  private intervalId: NodeJS.Timeout;
  private pkpContract: ethers.Contract;
  private pkpPermissionsContract: ethers.Contract;
  private kinoraQuestContract: ethers.Contract;
  private kinoraMetricsContract: ethers.Contract;
  private kinoraQuestDataContract: ethers.Contract;
  private kinoraEscrowContract: ethers.Contract;
  private signer: ethers.Signer;
  private authSig: LitAuthSig;
  private playerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  private questInvokerAuthedApolloClient: ApolloClient<NormalizedCacheObject>;
  private litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: "cayenne",
    debug: false,
    alertWhenUnauthorized: true,
  });

  constructor(args: {
    questInvokerProfileId: string;
    parentId?: string;
    redirectURL?: string;
    rpcURL?: string;
    metricsOnChainInterval?: number; // in minutes,
    encryptPlayerMetrics?: boolean;
    errorHandlingModeStrict?: boolean;
    questInvokerPKPPublicKey?: `0x04${string}`;
    questInvokerPKPTokenId?: string;
    playerProfileId?: string;
    multihashDevKey?: string;
    signer?: ethers.Signer; // chronicle signer
    kinoraMetricsContract?: `0x${string}`;
    kinoraQuestContract?: `0x${string}`;
    kinoraEscrowContract?: `0x${string}`;
    playerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
    questInvokerAuthedApolloClient?: ApolloClient<NormalizedCacheObject>;
  }) {
    super();
    this.questInvokerProfileId = args.questInvokerProfileId;
    this.errorHandlingModeStrict = args.errorHandlingModeStrict || false;
    this.metricsOnChainInterval = args.metricsOnChainInterval;
    this.rpcURL = args.rpcURL;
    if (args.questInvokerPKPPublicKey)
      this.questInvokerPKPData = {
        publicKey: args.questInvokerPKPPublicKey,
        tokenId: args.questInvokerPKPTokenId,
        ethAddress: ethers.utils.computeAddress(
          args.questInvokerPKPPublicKey,
        ) as `0x${string}`,
      };
    this.multihashDevKey = args.multihashDevKey;
    this.encryptPlayerMetrics = args.encryptPlayerMetrics;
    this.parentId = args.parentId;
    if (args.playerProfileId) this.playerProfileId = args.playerProfileId;

    this.metrics = new Metrics();
    this.polygonProvider = new ethers.providers.JsonRpcProvider(
      this.rpcURL,
      ChainIds[this.chain],
    );
    this.chronicleProvider = new ethers.providers.JsonRpcProvider(
      LIT_RPC,
      ChainIds["chronicle"],
    );
    this.signer = args.signer
      ? args.signer
      : ethers.Wallet.createRandom().connect(this.chronicleProvider);

    if (args.kinoraMetricsContract)
      this.kinoraMetricsContract = new ethers.Contract(
        args.kinoraMetricsContract,
        KinoraMetricsAbi,
      );
    if (args.kinoraQuestContract) {
      this.kinoraQuestContract = new ethers.Contract(
        args.kinoraQuestContract,
        KinoraQuestAbi,
      );
    }
    if (args.kinoraEscrowContract) {
      this.kinoraEscrowContract = new ethers.Contract(
        args.kinoraEscrowContract,
        KinoraEscrowAbi,
      );
    }
    this.pkpContract = new ethers.Contract(
      CHRONICLE_PKP_CONTRACT,
      PKPNFTAbi,
      this.signer,
    );
    this.pkpPermissionsContract = new ethers.Contract(
      CHRONICLE_PKP_PERMISSIONS_CONTRACT,
      PKPPermissionsAbi,
      this.signer,
    );
    this.kinoraQuestDataContract = new ethers.Contract(
      KINORA_QUEST_DATA_CONTRACT,
      KinoraQuestDataAbi,
      this.signer,
    );
    this.playerAuthedApolloClient = args.playerAuthedApolloClient || undefined;
    this.questInvokerAuthedApolloClient =
      args.questInvokerAuthedApolloClient || undefined;
    this.litNodeClient.connect();
  }

  createQuestCompatibleURI = (args: {
    questTitle: string;
    questDescription: string;
    questMilestonesDetails: string[];
    questCoverImage: string;
  }): ImageMetadataV3 => {
    const formattedText: string = `
    ${args.questTitle}
    \n\n
    ${args.questDescription}
    \n\n
    ${args.questMilestonesDetails
      .map((milestone, index) => {
        return `Milestone ${index + 1}
      ${milestone}`;
      })
      .join("\n\n")}
    `;

    const image = {
      raw: {
        uri: "ipfs://" + args.questCoverImage,
      },
    };

    const data: ImageMetadataV3 = {
      __typename: "ImageMetadataV3",
      id: uuidv4(),
      hideFromFeed: false,
      locale: "en",
      tags: ["kinora", "kinora quest", "quest"],
      appId: "kinora",
      attachments: [
        {
          image,
          altTag: args.questTitle,
        },
      ],
      content: formattedText,
      title: args.questTitle,
      marketplace: {
        description: formattedText,
        externalURL: "kinora.irrevocable.dev",
        image,
        name: args.questTitle,
      },
      asset: {
        image,
        altTag: args.questTitle,
      },
      rawURI: "",
    };

    return data;
  };

  instantiateNewQuest = async (questInputs: {
    ipfsQuestDetails: string;
    maxPlayerCount: number;
    milestones: Milestone[];
  }): Promise<{
    kinoraAccessControl: `0x${string}`;
    kinoraMetrics: `0x${string}`;
    kinoraQuest: `0x${string}`;
    kinoraEscrow: `0x${string}`;
    pubId: string;
    multiHashDevKey: string;
  }> => {
    if (!this.questInvokerAuthedApolloClient) {
      throw new Error(
        `Set Quest Invoker Authed Apollo Client before Continuing.`,
      );
    }
    if (!this.multihashDevKey) {
      this.multihashDevKey = generateSecureRandomKey();
    }
    if (!this.questInvokerPKPData.ethAddress) {
      const { pkpTokenId, publicKey, error, message } = await mintNextPKP(
        this.pkpContract,
      );
      this.questInvokerPKPData = {
        publicKey: publicKey,
        tokenId: pkpTokenId,
        ethAddress: ethers.utils.computeAddress(publicKey) as `0x${string}`,
      };
      if (error) {
        this.log(
          LogCategory.ERROR,
          `Mint questInvoker PKP failed.`,
          message,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error minting questInvoker PKP: ${message}`);
        }
        return;
      }
    }

    const joinHash = hashHex(
      questInputs.ipfsQuestDetails + this.multihashDevKey,
    );

    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(address questInvokerPKP, bytes32 joinHash, uint256 maxPlayerCount)",
          "tuple(Reward reward, bytes32 completionHash, uint256 numberOfPoints, uint256 milestone)[]",
        ],
        [
          {
            questInvokerPKP: this.questInvokerPKPData.ethAddress,
            questInvoker: await this.signer.getAddress(),
            joinHash: joinHash,
            maxPlayerCount: questInputs.maxPlayerCount,
          },
          questInputs.milestones,
        ],
      );

      const { data } = await onChainPost(
        {
          contentURI: "ipfs://" + questInputs.ipfsQuestDetails,
          openActionModules: [
            {
              unknownOpenAction: {
                address: KINORA_OPEN_ACTION_CONTRACT,
                data: encodedData,
              },
            },
          ],
        },
        this.questInvokerAuthedApolloClient,
      );

      const factoryContract = new ethers.Contract(
        KINORA_FACTORY_CONTRACT,
        KinoraFactoryAbi,
        this.signer,
      );

      const kinoraMetrics = await factoryContract.getPKPToDeployedKinoraMetrics(
        this.questInvokerPKPData.ethAddress,
      );
      const kinoraQuest = await factoryContract.getPKPToDeployedKinoraQuest(
        this.questInvokerPKPData.ethAddress,
      );
      const kinoraEscrow = await factoryContract.getPKPToDeployedKinoraEscrow(
        this.questInvokerPKPData.ethAddress,
      );

      this.kinoraQuestContract = new ethers.Contract(
        kinoraQuest,
        KinoraQuestAbi,
        this.signer,
      );
      this.kinoraMetricsContract = new ethers.Contract(
        kinoraMetrics,
        KinoraMetricsAbi,
        this.signer,
      );
      this.kinoraEscrowContract = new ethers.Contract(
        kinoraEscrow,
        KinoraEscrowAbi,
        this.signer,
      );

      return {
        kinoraAccessControl:
          await factoryContract.getPKPToDeployedKinoraAccessControl(
            this.questInvokerPKPData.ethAddress,
          ),
        kinoraMetrics,
        kinoraQuest,
        kinoraEscrow,
        pubId: data.createOnchainPostTypedData.id,
        multiHashDevKey: this.multihashDevKey,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Quest instantiation failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error instantiating new Quest: ${err.message}`);
      }
    }
  };

  terminateQuestAndWithdraw = async (
    pubId: string,
    toAddress: `0s${string}`,
  ): Promise<{ txHash: string; withdrawTxes: string[] }> => {
    if (!this.kinoraQuestContract)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.kinoraEscrowContract)
      throw new Error("Set Kinora Escrow Address before continuing.");
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    try {
      const txHash = await this.kinoraQuestContract.terminateQuest(pubId);

      const milestoneCount =
        this.kinoraQuestDataContract.getQuestMilestoneCount(
          this.questInvokerProfileId,
          pubId,
        );

      const withdrawTxes: string[] = [];

      for (let i = 1; i <= milestoneCount; i++) {
        const withdrawTx = this.kinoraEscrowContract.emergencyWithdrawERC20(
          toAddress,
          pubId,
          i,
        );
        withdrawTxes.push(withdrawTx);
      }

      return {
        txHash,
        withdrawTxes,
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Terminate Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error terminating Quest: ${err.message}`);
      }
    }
  };

  playerJoinQuest = async (
    pubId: string,
  ): Promise<{
    data: ActOnOpenActionMutation;
  }> => {
    try {
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [this.questInvokerPKPData.ethAddress, 0],
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
      };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Player Join Quest failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error Player joining new Quest: ${err.message}`);
      }
    }
  };

  playerCompleteQuestMilestone = async (
    pubId: string,
    milestoneId: number,
    completeMilestoneIPFSCid: string,
  ): Promise<{ txHash: string }> => {
    if (!this.kinoraQuestContract.address)
      throw new Error("Set Kinora Quest Address before continuing.");
    if (!this.questInvokerPKPData.publicKey)
      throw new Error("Set questInvoker PKP Public Key before continuing.");
    if (!this.questInvokerPKPData.tokenId)
      throw new Error("Set questInvoker PKP Token Id before continuing.");
    if (!this.multihashDevKey)
      throw new Error("Set multi hash dev key before continuing.");

    
    
    
    
      const completeCondition = await this.checkQuestMilestoneMetrics(
      questId,
      milestoneId,
    );

    if (!completeCondition) {
      this.log(
        LogCategory.ERROR,
        `Player failed to meet Quest Join Condition.`,
        "Error authenticating player for Quest",
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error authenticating player for Quest.`);
      }

      return;
    }

    try {
      const {
        error: txError,
        message: txMessage,
        generatedTxData,
      } = await createTxData(
        this.polygonProvider,
        KinoraQuestAbi,
        "playerCompleteMilestone",
        [questId, milestoneId, this.playerProfileId],
      );

      if (txError) {
        this.log(
          LogCategory.ERROR,
          `Generate Tx data error on Player Complete Milestone.`,
          txMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(
            `Error generating Tx data on Player Complete Milestone: ${txMessage}`,
          );
        }

        return;
      }

      const {
        error: authSigError,
        message: authSigMessage,
        litAuthSig,
      } = await generateAuthSig(this.signer);

      if (authSigError) {
        this.log(
          LogCategory.ERROR,
          `Lit Auth Sig generation failed.`,
          authSigMessage,
          new Date().toISOString(),
        );
        if (this.errorHandlingModeStrict) {
          throw new Error(`Error generating Lit Auth Sig: ${authSigMessage}`);
        }
        return;
      }

      const milestoneURI =
        await this.kinoraQuestContract.getQuestMilestoneURIDetails(
          questId,
          milestoneId,
        );

      const response = await axios.get(
        `${INFURA_GATEWAY}/ipfs/${milestoneURI}`,
      );

      const { txHash, error, message, litResponse } = await litExecute(
        this.polygonProvider,
        this.litNodeClient,
        generatedTxData,
        "playerCompleteMilestone",
        this.authSig ? this.authSig : litAuthSig,
        completeMilestoneIPFSCid,
        this.questInvokerPKPData.publicKey,
        this.multihashDevKey,
        JSON.stringify(completeCondition),
      );

      if (error) {
        if (error) {
          this.log(
            LogCategory.ERROR,
            `Player Complete Milestone failed on Broadcast.`,
            message,
            new Date().toISOString(),
          );
          if (this.errorHandlingModeStrict) {
            throw new Error(
              `Error completing Player Milestone and broadcasting: ${message}`,
            );
          }
        }
        return;
      } else {
        this.log(
          LogCategory.RESPONSE,
          `Player Completed Milestone successfully. Lit Action Response.`,
          litResponse,
          new Date().toISOString(),
        );
        this.log(
          LogCategory.BROADCAST,
          `Broadcast on-chain.`,
          txHash,
          new Date().toISOString(),
        );
      }

      return { txHash };
    } catch (err: any) {
      this.log(
        LogCategory.ERROR,
        `Player completing milestone failed.`,
        err.message,
        new Date().toISOString(),
      );
      if (this.errorHandlingModeStrict) {
        throw new Error(`Error completing player Milestone: ${err.message}`);
      }
    }
  };
}
