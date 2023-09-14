import { expect } from "chai";
import { ethers } from "hardhat";
import { Sequence } from "./../src/sequence";
import { CHRONICLE_PROVIDER } from "./../src/constants";
import { Signer } from "ethers";

describe("developerFactoryContractDeploy", () => {
  let newSequence: Sequence,
    noProvider: Sequence,
    signer: Signer,
    results: {
      multihashDevKey: string;
      kinoraAccessControlAddress: `0x${string}`;
      kinoraMetricsAddress: `0x${string}`;
      kinoraEscrowAddress: `0x${string}`;
      kinoraQuestAddress: `0x${string}`;
      kinoraQuestRewardAddress: `0x${string}`;
      pkpEthAddress: string;
      pkpPublicKey: string;
      pkpTokenId: string;
    };
  const chronicleProvider = new ethers.providers.JsonRpcProvider(
    CHRONICLE_PROVIDER,
    175177,
  );

  before(async () => {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, chronicleProvider);
    noProvider = new Sequence({ signer });
    newSequence = new Sequence({
      signer,
      rpcURL: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MUMBAI_KEY}`,
    });

    results = await newSequence.developerFactoryContractDeploy();
  });

  it("generates random key", async () => {
    expect(results).to.have.property("multihashDevKey");
    expect(results.multihashDevKey).to.not.be.null;
    expect(results.multihashDevKey).to.be.a("string");
  });

  it("mints developer PKP", async () => {
    expect(results).to.have.property("pkpEthAddress");
    expect(results).to.have.property("pkpPublicKey");
    expect(results).to.have.property("pkpTokenId");
  });

  it("should deploy contracts from factory correctly", async () => {
    expect(results).to.have.property("kinoraMetricsAddress");
    expect(results).to.have.property("kinoraQuestAddress");
    expect(results).to.have.property("kinoraEscrowAddress");
    expect(results).to.have.property("kinoraQuestRewardAddress");
    expect(results).to.have.property("kinoraAccessControlAddress");
  });

  it("should handle errors correctly when minting developer PKP fails", async () => {
    // Test logic for handling errors during PKP minting
  });

  it("should throw polygon provider", async () => {
    let error: any;

    try {
      await noProvider.developerFactoryContractDeploy();
    } catch (err: any) {
      error = err.message;
    }

    expect(error).to.include("Set Polygon Provider before continuing.");
  });
});
