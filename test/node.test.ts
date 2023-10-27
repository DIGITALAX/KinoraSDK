import { expect } from "chai";
import { ethers } from "hardhat";
import { Sequence } from "../src/sequence";
import { Signer } from "ethers";
import { SiweMessage } from "siwe";

const profileId = "0x12d";
const pubId = "0x01";
const playerProfileId = "0x12e";

describe("Node Test Suite", () => {
  let newSequence: Sequence, signer: Signer;

  const chronicleProvider = new ethers.providers.JsonRpcProvider(
    "https://chain-rpc.litprotocol.com/http",
    175177,
  );

  describe("QuestInvoker Instantiate New Quest", () => {
    before(async () => {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY!, chronicleProvider);

      const siweMessage = new SiweMessage({
        domain: "chromadin.xyz",
        address: await signer.getAddress(),
        statement: "This is an Auth Sig for Kinora",
        uri: "http://localhost:3000/",
        version: "1",
        chainId: 31337,
      });
      const signedMessage = siweMessage.prepareMessage();
      const sig = await signer.signMessage(signedMessage);

      newSequence = new Sequence({
        questInvokerProfileId: profileId,
        authSig: {
          sig,
          derivedVia: "web3.eth.personal.sign",
          signedMessage,
          address: await signer.getAddress(),
        },
        signer,
      });
    });
  });

  describe("Player Join Quest", () => {});
  describe("Player Metrics Collect", () => {});
  describe("Player Claim Milestone", () => {});
  describe("Logs and Error Handle", () => {});
  describe("Terminate Quest", () => {});
});
