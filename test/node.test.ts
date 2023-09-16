import { expect } from "chai";
import { ethers } from "hardhat";
import { Sequence } from "../src/sequence";
import { CHRONICLE_PROVIDER, KINORA_FACTORY_CONTRACT } from "../src/constants";
import { Contract, Signer } from "ethers";
import KinoraFactoryAbi from "./../src/abis/KinoraFactory.json";

describe("Node Functions", () => {
  let newSequence: Sequence,
    noProvider: Sequence,
    signer: Signer,
    factoryContract: Contract,
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

  describe("Developer Factory Contract Deploy", () => {
    before(async () => {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, chronicleProvider);
      noProvider = new Sequence({ signer });
      newSequence = new Sequence({
        signer,
        rpcURL: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MUMBAI_KEY}`,
      });

      results = await newSequence.developerFactoryContractDeploy();

      factoryContract = new ethers.Contract(
        KINORA_FACTORY_CONTRACT,
        KinoraFactoryAbi,
        new ethers.providers.JsonRpcProvider(
          `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MUMBAI_KEY}`,
          80001,
        ),
      );
    });

    it("Generates random key", async () => {
      expect(results).to.have.property("multihashDevKey");
      expect(results.multihashDevKey).to.not.be.null;
      expect(results.multihashDevKey).to.be.a("string");
    });

    it("Mints developer PKP", async () => {
      expect(results).to.have.property("pkpEthAddress");
      expect(results).to.have.property("pkpPublicKey");
      expect(results).to.have.property("pkpTokenId");
      const devPKPs = await factoryContract.getDeployerToPKPs(
        process.env.DEPLOYER_WALLET_ADDRESS,
      );
      expect(results.pkpEthAddress).to.equal(devPKPs[devPKPs.length - 1]);
    });

    it("Correctly sets the deployer address", async () => {
      expect(process.env.DEPLOYER_WALLET_ADDRESS).to.equal(
        await factoryContract.getKinoraDeployerToPKP(results.pkpEthAddress),
      );
    });

    it("Should deploy contracts from factory correctly", async () => {
      expect(results).to.have.property("kinoraMetricsAddress");
      expect(results).to.have.property("kinoraQuestAddress");
      expect(results).to.have.property("kinoraEscrowAddress");
      expect(results).to.have.property("kinoraQuestRewardAddress");
      expect(results).to.have.property("kinoraAccessControlAddress");

      expect(results.kinoraAccessControlAddress).to.equal(
        await factoryContract.getDeployedKinoraAccessControlToPKP(
          results.pkpEthAddress,
        ),
      );
      expect(results.kinoraMetricsAddress).to.equal(
        await factoryContract.getDeployedKinoraMetricsToPKP(
          results.pkpEthAddress,
        ),
      );
      expect(results.kinoraQuestAddress).to.equal(
        await factoryContract.getDeployedKinoraQuestToPKP(
          results.pkpEthAddress,
        ),
      );
      expect(results.kinoraEscrowAddress).to.equal(
        await factoryContract.getDeployedKinoraEscrowToPKP(
          results.pkpEthAddress,
        ),
      );
      expect(results.kinoraQuestRewardAddress).to.equal(
        await factoryContract.getDeployedKinoraQuestRewardToPKP(
          results.pkpEthAddress,
        ),
      );
    });

    it("Should throw polygon provider", async () => {
      let error: any;

      try {
        await noProvider.developerFactoryContractDeploy();
      } catch (err: any) {
        error = err.message;
      }

      expect(error).to.include("Set Polygon Provider before continuing.");
    });

    it("Should generate a new multihash and not update quests", async () => {
      const currentKey = results.multihashDevKey;

      const newKey = await newSequence.generateNewMultiHashDevKey();

      expect(currentKey).to.not.eql(newKey);
    });
  });
});
