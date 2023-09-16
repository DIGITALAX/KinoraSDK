import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Kinora Factory Contract", () => {
  const TEST_PKP_ADDRESS = "0xB44c397edA567515012717eC2cf36F779F4E33af";
  const TEST_PKP_ADDRESS_TWO = "0x938d4de17e9828be8a68688329E77E5FC7d5ABA6";
  const TEST_PKP_ADDRESS_THREE = "0x6FD98Aa1A03A8f43648609dDf5F7982D949bfA2a";
  let admin: SignerWithAddress,
    developerOne: SignerWithAddress,
    developerTwo: SignerWithAddress,
    developerThree: SignerWithAddress,
    kinoraGlobalAccessControl: Contract,
    kinoraGlobalPKPDB: Contract,
    kinoraFactory: Contract,
    kinoraMetrics: Contract,
    kinoraQuest: Contract,
    kinoraEscrow: Contract,
    kinora721QuestReward: Contract,
    kinoraAccessControl: Contract,
    eventData: any;

  before(async () => {
    [admin, developerOne, developerTwo, developerThree] =
      await ethers.getSigners();

    const KinoraGlobalAccessControl = await ethers.getContractFactory(
      "KinoraGlobalAccessControl",
    );
    const KinoraGlobalPKPDB = await ethers.getContractFactory(
      "KinoraGlobalPKPDB",
    );
    const KinoraMetrics = await ethers.getContractFactory("KinoraMetrics");
    const KinoraQuest = await ethers.getContractFactory("KinoraQuest");
    const KinoraEscrow = await ethers.getContractFactory("KinoraEscrow");
    const Kinora721QuestReward = await ethers.getContractFactory(
      "Kinora721QuestReward",
    );
    const KinoraAccessControl = await ethers.getContractFactory(
      "KinoraAccessControl",
    );
    const KinoraFactory = await ethers.getContractFactory("KinoraFactory");

    kinoraGlobalAccessControl = await KinoraGlobalAccessControl.deploy();
    kinoraGlobalPKPDB = await KinoraGlobalPKPDB.deploy(
      kinoraGlobalAccessControl.address,
    );
    kinoraFactory = await KinoraFactory.deploy(
      kinoraGlobalAccessControl.address,
      kinoraGlobalPKPDB.address,
    );
    kinoraMetrics = await KinoraMetrics.deploy();
    kinoraQuest = await KinoraQuest.deploy();
    kinoraEscrow = await KinoraEscrow.deploy();
    kinora721QuestReward = await Kinora721QuestReward.deploy();
    kinoraAccessControl = await KinoraAccessControl.deploy();

    await kinoraFactory.setLogicAddresses(
      kinoraAccessControl.address,
      kinoraQuest.address,
      kinoraEscrow.address,
      kinoraMetrics.address,
      kinora721QuestReward.address,
    );

    const tx = await kinoraFactory
      .connect(developerOne)
      .deployFromKinoraFactory(TEST_PKP_ADDRESS);
    const receipt = await tx.wait();

    const event = receipt.events.find(
      (event: any) => event.event === "KinoraFactoryDeployed",
    );
    eventData = await event.args;
  });

  describe("Set and update functions", () => {
    it("Set logic address", async () => {
      expect(kinoraAccessControl.address).to.equal(
        await kinoraFactory.getKinoraAccessControlLogicAddress(),
      );
      expect(kinoraQuest.address).to.equal(
        await kinoraFactory.getKinoraQuestLogicAddress(),
      );
      expect(kinoraMetrics.address).to.equal(
        await kinoraFactory.getKinoraMetricsLogicAddress(),
      );
      expect(kinora721QuestReward.address).to.equal(
        await kinoraFactory.getKinoraQuestRewardLogicAddress(),
      );
      expect(kinoraEscrow.address).to.equal(
        await kinoraFactory.getKinoraEscrowLogicAddress(),
      );
    });

    it("Set global PKP DB address", async () => {
      expect(kinoraGlobalPKPDB.address).to.equal(
        await kinoraFactory.getGlobalPKPDBContract(),
      );
      const KinoraGlobalPKPDB = await ethers.getContractFactory(
        "KinoraGlobalPKPDB",
      );
      const newGlobalPKPAddress = await KinoraGlobalPKPDB.deploy(
        kinoraGlobalAccessControl.address,
      );
      await kinoraFactory.setGlobalPKPDBControl(newGlobalPKPAddress.address);
      expect(newGlobalPKPAddress.address).to.equal(
        await kinoraFactory.getGlobalPKPDBContract(),
      );
    });

    it("Set global Access Control address", async () => {
      expect(kinoraGlobalAccessControl.address).to.equal(
        await kinoraFactory.getGlobalAccessControlContract(),
      );
      const KinoraGlobalAccessControl = await ethers.getContractFactory(
        "KinoraGlobalAccessControl",
      );
      const newKinoraGlobalAccessControl =
        await KinoraGlobalAccessControl.deploy();
      await kinoraFactory.setGlobalAccessControl(
        newKinoraGlobalAccessControl.address,
      );
      expect(newKinoraGlobalAccessControl.address).to.equal(
        await kinoraFactory.getGlobalAccessControlContract(),
      );
    });
  });

  describe("Deploy from Factory", () => {
    it("Correctly updates the Kinora ID", async () => {
      expect(await kinoraFactory.getKinoraIDCount()).to.equal(1);
      expect(await kinoraFactory.getKinoraIDToPKP(TEST_PKP_ADDRESS)).to.equal(
        1,
      );
    });

    it("Correctly maps contracts to developer PKP", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          TEST_PKP_ADDRESS,
        ),
      ).to.equal(eventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(TEST_PKP_ADDRESS),
      ).to.equal(eventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(TEST_PKP_ADDRESS),
      ).to.equal(eventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(TEST_PKP_ADDRESS),
      ).to.equal(eventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(TEST_PKP_ADDRESS),
      ).to.equal(eventData.questRewardAddress);
    });

    it("Correctly maps deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(TEST_PKP_ADDRESS),
      ).to.equal(developerOne.address);
    });

    it("Correctly maps PKPs to deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerOne.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        TEST_PKP_ADDRESS,
      );
    });
  });

  describe("Repeat deploy from Factory", () => {
    let secondDeployEventData: any, thirdDeployEventData: any;

    before(async () => {
      const receipt = await (
        await kinoraFactory
          .connect(developerOne)
          .deployFromKinoraFactory(TEST_PKP_ADDRESS_TWO)
      ).wait();

      const event = receipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      secondDeployEventData = await event.args;

      const newReceipt = await (
        await kinoraFactory
          .connect(developerTwo)
          .deployFromKinoraFactory(TEST_PKP_ADDRESS_THREE)
      ).wait();

      const newEvent = newReceipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      thirdDeployEventData = await newEvent.args;
    });

    it("Updates ID on new deploy", async () => {
      expect(await kinoraFactory.getKinoraIDCount()).to.equal(3);
      expect(
        await kinoraFactory.getKinoraIDToPKP(TEST_PKP_ADDRESS_TWO),
      ).to.equal(2);
    });

    it("Maps new contract on additional deploy", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          TEST_PKP_ADDRESS_TWO,
        ),
      ).to.equal(secondDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(TEST_PKP_ADDRESS_TWO),
      ).to.equal(secondDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(TEST_PKP_ADDRESS_TWO),
      ).to.equal(secondDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(TEST_PKP_ADDRESS_TWO),
      ).to.equal(secondDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          TEST_PKP_ADDRESS_TWO,
        ),
      ).to.equal(secondDeployEventData.questRewardAddress);
    });

    it("Sets new PKP to deployer address", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(TEST_PKP_ADDRESS_TWO),
      ).to.equal(developerOne.address);
    });

    it("Correctly adds new PKP to deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerOne.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        TEST_PKP_ADDRESS_TWO,
      );
    });

    it("Updates ID on new deploy different address", async () => {
      expect(
        await kinoraFactory.getKinoraIDToPKP(TEST_PKP_ADDRESS_THREE),
      ).to.equal(3);
    });

    it("Maps new contracts to new deployer", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          TEST_PKP_ADDRESS_THREE,
        ),
      ).to.equal(thirdDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          TEST_PKP_ADDRESS_THREE,
        ),
      ).to.equal(thirdDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(TEST_PKP_ADDRESS_THREE),
      ).to.equal(thirdDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          TEST_PKP_ADDRESS_THREE,
        ),
      ).to.equal(thirdDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          TEST_PKP_ADDRESS_THREE,
        ),
      ).to.equal(thirdDeployEventData.questRewardAddress);
    });
    it("Correctly maps new deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(TEST_PKP_ADDRESS_THREE),
      ).to.equal(developerTwo.address);
    });

    it("Correctly maps PKPs to new deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerTwo.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        TEST_PKP_ADDRESS_THREE,
      );
    });

    it("Won't deploy factory if PKP already exists", async () => {
      await expect(
        kinoraFactory
          .connect(developerTwo)
          .deployFromKinoraFactory(TEST_PKP_ADDRESS_THREE),
      ).to.be.revertedWith(
        "KinoraFactory: PKP already mapped to contract factory.",
      );
    });
  });

  describe("Initiated Logic Contracts", () => {});
});
