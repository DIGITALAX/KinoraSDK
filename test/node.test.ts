import { expect } from "chai";
import { ethers } from "hardhat";
import { Sequence } from "../src/sequence";
import { Signer } from "ethers";

const profileId = "0x12d";
const pubId = "0x01";
const playerProfileId = "0x12e";

xdescribe("Node Test Suite", () => {
  let newSequence: Sequence, signer: Signer;

  const chronicleProvider = new ethers.providers.JsonRpcProvider(
    "https://chain-rpc.litprotocol.com/http",
    175177,
  );

  describe("QuestEnvoker Instantiate New Quest", () => {
    before(async () => {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY!, chronicleProvider);

      newSequence = new Sequence();
    });
  });

  describe("Player Join Quest", () => {});
  describe("Player Metrics Collect", () => {});
  describe("Player Claim Milestone", () => {});
  describe("Logs and Error Handle", () => {});
  describe("Terminate Quest", () => {});
});
