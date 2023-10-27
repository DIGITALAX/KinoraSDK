import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

xdescribe("Kinora Factory Contract", () => {
  let admin: SignerWithAddress,
    questInvokerOne: SignerWithAddress,
    questInvokerTwo: SignerWithAddress,
    questInvokerThree: SignerWithAddress,
    questInvokerPkpOne: SignerWithAddress,
    questInvokerPkpTwo: SignerWithAddress,
    questInvokerPkpThree: SignerWithAddress,
    questInvokerPkpFour: SignerWithAddress,
    userPkp: SignerWithAddress,
    userPKPTwo: SignerWithAddress,
    userPkpThree: SignerWithAddress,
    testERC20: Contract,
    kinoraGlobalAccessControl: Contract,
    kinoraGlobalPKPDB: Contract,
    kinoraFactory: Contract,
    kinoraMetrics: Contract,
    kinoraQuest: Contract,
    kinoraEscrow: Contract,
    kinora721QuestReward: Contract,
    kinoraAccessControl: Contract,
    initiatedKinoraMetrics: Contract,
    initiatedKinoraQuest: Contract,
    initiatedKinoraEscrow: Contract,
    initiatedKinora721QuestReward: Contract,
    initiatedKinoraAccessControl: Contract,
    eventData: any;

  before(async () => {
    [
      admin,
      questInvokerOne,
      questInvokerTwo,
      questInvokerThree,
      questInvokerPkpOne,
      questInvokerPkpTwo,
      questInvokerPkpThree,
      questInvokerPkpFour,
      userPkp,
      userPKPTwo,
      userPkpThree,
    ] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestERC20");

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

    testERC20 = await TestERC20.deploy();

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

    await kinoraGlobalPKPDB.setKinoraFactoyAddress(kinoraFactory.address);

    const tx = await kinoraFactory
      .connect(questInvokerOne)
      .deployFromKinoraFactory(questInvokerPkpOne.address);
    const receipt = await tx.wait();

    const event = receipt.events.find(
      (event: any) => event.event === "KinoraFactoryDeployed",
    );
    eventData = await event.args;

    initiatedKinoraAccessControl = KinoraAccessControl.attach(
      eventData.accessControlAddress,
    );
    initiatedKinoraMetrics = KinoraMetrics.attach(eventData.metricsAddress);
    initiatedKinoraQuest = KinoraQuest.attach(eventData.questAddress);
    initiatedKinoraEscrow = KinoraEscrow.attach(eventData.escrowAddress);
    initiatedKinora721QuestReward = Kinora721QuestReward.attach(
      eventData.questRewardAddress,
    );

    await testERC20
      .connect(questInvokerPkpFour)
      .approve(initiatedKinoraEscrow.address, 2000);

    await testERC20.transfer(questInvokerPkpFour.address, 2000);
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
      expect(
        await kinoraFactory.getKinoraIDToPKP(questInvokerPkpOne.address),
      ).to.equal(1);
    });

    it("Correctly maps contracts to questInvoker PKP", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          questInvokerPkpOne.address,
        ),
      ).to.equal(eventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          questInvokerPkpOne.address,
        ),
      ).to.equal(eventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          questInvokerPkpOne.address,
        ),
      ).to.equal(eventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          questInvokerPkpOne.address,
        ),
      ).to.equal(eventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          questInvokerPkpOne.address,
        ),
      ).to.equal(eventData.questRewardAddress);
    });

    it("Correctly maps deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(questInvokerPkpOne.address),
      ).to.equal(questInvokerOne.address);
    });

    it("Correctly maps PKPs to deployer address", async () => {
      const questInvokerPKPs = await kinoraFactory.getDeployerToPKPs(
        questInvokerOne.address,
      );
      expect(questInvokerPKPs[questInvokerPKPs.length - 1]).to.equal(
        questInvokerPkpOne.address,
      );
    });
  });

  describe("Repeat deploy from Factory", () => {
    let secondDeployEventData: any, thirdDeployEventData: any;

    before(async () => {
      const receipt = await (
        await kinoraFactory
          .connect(questInvokerOne)
          .deployFromKinoraFactory(questInvokerPkpTwo.address)
      ).wait();

      const event = receipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      secondDeployEventData = await event.args;

      const newReceipt = await (
        await kinoraFactory
          .connect(questInvokerTwo)
          .deployFromKinoraFactory(questInvokerPkpThree.address)
      ).wait();

      const newEvent = newReceipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      thirdDeployEventData = await newEvent.args;
    });

    it("Updates ID on new deploy", async () => {
      expect(await kinoraFactory.getKinoraIDCount()).to.equal(3);
      expect(
        await kinoraFactory.getKinoraIDToPKP(questInvokerPkpTwo.address),
      ).to.equal(2);
    });

    it("Maps new contract on additional deploy", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          questInvokerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          questInvokerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          questInvokerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          questInvokerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          questInvokerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.questRewardAddress);
    });

    it("Sets new PKP to deployer address", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(questInvokerPkpTwo.address),
      ).to.equal(questInvokerOne.address);
    });

    it("Correctly adds new PKP to deployer address", async () => {
      const questInvokerPKPs = await kinoraFactory.getDeployerToPKPs(
        questInvokerOne.address,
      );
      expect(questInvokerPKPs[questInvokerPKPs.length - 1]).to.equal(
        questInvokerPkpTwo.address,
      );
    });

    it("Updates ID on new deploy different address", async () => {
      expect(
        await kinoraFactory.getKinoraIDToPKP(questInvokerPkpThree.address),
      ).to.equal(3);
    });

    it("Maps new contracts to new deployer", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          questInvokerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          questInvokerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          questInvokerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          questInvokerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          questInvokerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.questRewardAddress);
    });
    it("Correctly maps new deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(questInvokerPkpThree.address),
      ).to.equal(questInvokerTwo.address);
    });

    it("Correctly maps PKPs to new deployer address", async () => {
      const questInvokerPKPs = await kinoraFactory.getDeployerToPKPs(
        questInvokerTwo.address,
      );
      expect(questInvokerPKPs[questInvokerPKPs.length - 1]).to.equal(
        questInvokerPkpThree.address,
      );
    });

    it("Won't deploy factory if PKP already exists", async () => {
      await expect(
        kinoraFactory
          .connect(questInvokerTwo)
          .deployFromKinoraFactory(questInvokerPkpThree.address),
      ).to.be.revertedWithCustomError(
        {
          interface: kinoraFactory.interface,
        },
        "pkpAlreadyMapped",
      );
    });
  });

  describe("Initiated Logic Contracts", () => {
    before(async () => {
      await kinoraGlobalPKPDB
        .connect(questInvokerPkpOne)
        .addUserPKP(userPkp.address);

      await kinoraGlobalPKPDB
        .connect(questInvokerPkpOne)
        .addUserPKP(userPKPTwo.address);

      await kinoraGlobalPKPDB
        .connect(questInvokerPkpOne)
        .addUserPKP(userPkpThree.address);
    });

    describe("Kinora AccessControl", () => {
      it("Should initialize contract variables", async () => {
        expect(await initiatedKinoraAccessControl.symbol()).to.equal("KAC");
        expect(await initiatedKinoraAccessControl.name()).to.equal(
          "KinoraAccessControl",
        );
        expect(
          await initiatedKinoraAccessControl.getAssignedPKPAddress(),
        ).to.equal(questInvokerPkpOne.address);
        expect(
          await initiatedKinoraAccessControl.isAdmin(questInvokerOne.address),
        ).to.equal(true);
      });

      it("Should revert if called by non-admin", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(admin)
            .addAdmin(questInvokerThree.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraAccessControl.interface },
          "userNotAdmin",
        );
      });

      it("Should add a new admin", async () => {
        await initiatedKinoraAccessControl
          .connect(questInvokerOne)
          .addAdmin(questInvokerTwo.address);

        expect(
          await initiatedKinoraAccessControl.isAdmin(questInvokerTwo.address),
        ).to.equal(true);

        await expect(
          initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .addAdmin(questInvokerTwo.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraAccessControl.interface },
          "adminAlreadyExists",
        );
      });

      it("Should emit AdminAdded event", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .addAdmin(questInvokerThree.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AdminAdded")
          .withArgs(questInvokerThree.address);
      });

      it("Should remove an existing admin", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .removeAdmin(questInvokerTwo.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AdminRemoved")
          .withArgs(questInvokerTwo.address);

        expect(
          await initiatedKinoraAccessControl.isAdmin(questInvokerTwo.address),
        ).to.equal(false);
      });

      it("Should not allow removing oneself", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .removeAdmin(questInvokerOne.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraAccessControl.interface },
          "cantRemoveSelf",
        );
      });
      it("Should update the assigned PKP address", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .updateAssignedPKPAddress(questInvokerPkpFour.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AssignedPKPAddressUpdated")
          .withArgs(questInvokerPkpFour.address);

        expect(
          await initiatedKinoraAccessControl.getAssignedPKPAddress(),
        ).to.equal(questInvokerPkpFour.address);
      });

      it("Should revert for PKP already existing in Global DB", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(questInvokerOne)
            .updateAssignedPKPAddress(questInvokerPkpOne.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraAccessControl.interface },
          "pkpAlreadyAssigned",
        );
      });

      it("Should correctly identify admins", async () => {
        expect(
          await initiatedKinoraAccessControl.isAdmin(questInvokerOne.address),
        ).to.equal(true);
        expect(
          await initiatedKinoraAccessControl.isAdmin(admin.address),
        ).to.equal(false);
      });

      it("Should return the correct assigned PKP address", async () => {
        expect(
          await initiatedKinoraAccessControl.getAssignedPKPAddress(),
        ).to.equal(questInvokerPkpFour.address);
      });
    });

    describe("Kinora Metrics", () => {
      it("Should correctly set the access control address", async () => {
        expect(await initiatedKinoraMetrics.getKinoraAccessControl()).to.equal(
          initiatedKinoraAccessControl.address,
        );
      });

      it("Should fail when called by an unauthorized account", async () => {
        const playbackId = utils.id("playback1");
        const metricJSONHash = utils.id("hash1");
        const encrypted = false;

        await expect(
          initiatedKinoraMetrics
            .connect(questInvokerPkpTwo)
            .addUserMetrics(userPkp.address, {
              playbackId,
              metricJSONHash,
              encrypted,
            }),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraMetrics.interface },
          "onlyPKP",
        );
      });

      it("Should successfully add user metrics", async () => {
        const playbackId = utils.id("playback2");
        const metricJSONHash = utils.id("hash2");
        const encrypted = true;

        const tx = await initiatedKinoraMetrics
          .connect(questInvokerPkpFour)
          .addUserMetrics(userPkp.address, {
            playbackId,
            metricJSONHash,
            encrypted,
          });

        expect(tx)
          .to.emit(initiatedKinoraMetrics, "AddUserMetrics")
          .withArgs(playbackId, metricJSONHash, userPkp.address, encrypted);

        expect(
          await initiatedKinoraMetrics.getUserEncryptedByPlaybackId(
            userPkp.address,
            playbackId,
          ),
        ).to.equal(encrypted);
        expect(
          await initiatedKinoraMetrics.getUserMetricsJSONHashByPlaybackId(
            userPkp.address,
            playbackId,
          ),
        ).to.equal(metricJSONHash);
        expect(
          await initiatedKinoraMetrics.getUserPlaybackIdByPlaybackId(
            userPkp.address,
            playbackId,
          ),
        ).to.equal(playbackId);
      });

      it("Should fail to add a non existent user", async () => {
        await expect(
          initiatedKinoraMetrics
            .connect(questInvokerPkpFour)
            .addUserMetrics(questInvokerPkpOne.address, {
              playbackId: "",
              metricJSONHash: "",
              encrypted: true,
            }),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraMetrics.interface },
          "pkpAccountNotActive",
        );
      });
    });

    describe("Kinora Quest", () => {
      it("Should initialize contract variables properly", async () => {
        expect(await initiatedKinoraQuest.getTotalQuestCount()).to.equal(0);
        expect(await initiatedKinoraQuest.getTotalUserCount()).to.equal(0);
        expect(await initiatedKinoraQuest.getKinoraEscrow()).to.equal(
          initiatedKinoraEscrow.address,
        );
        expect(await initiatedKinoraQuest.getKinoraGlobalPKPDB()).to.equal(
          kinoraGlobalPKPDB.address,
        );
        expect(await initiatedKinoraQuest.getKinoraAccessControl()).to.equal(
          initiatedKinoraAccessControl.address,
        );
      });

      it("Should instantiate a new quest", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .instantiateNewQuest(
              "uri",
              "0x" +
                "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
              10,
            ),
        )
          .to.emit(initiatedKinoraQuest, "QuestInstantiated")
          .withArgs(
            1,
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
          );

        expect(await initiatedKinoraQuest.getQuestId(1)).to.equal(1);
        expect(await initiatedKinoraQuest.getQuestStatus(1)).to.equal(0);
        expect(
          await initiatedKinoraQuest.getQuestMaxParticipantCount(1),
        ).to.equal(10);
        expect(
          await initiatedKinoraQuest.getQuestParticipants(1),
        ).to.deep.equal([]);
        expect(await initiatedKinoraQuest.getQuestURIDetails(1)).to.equal(
          "uri",
        );
        expect(await initiatedKinoraQuest.getQuestJoinHash(1)).to.equal(
          "0x" +
            "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
        );
      });

      it("Should update Quest Status", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .updateQuestStatus(1, 1);
        expect(await initiatedKinoraQuest.getQuestStatus(1)).to.equal(1);
      });

      it("Should reject update Quest Status", async () => {
        await expect(
          initiatedKinoraQuest.connect(questInvokerPkpOne).updateQuestStatus(1, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "onlyAdminOrPKP",
        );
      });

      it("Should update total Quest Count", async () => {
        expect(await initiatedKinoraQuest.getTotalQuestCount()).to.equal(1);
      });

      it("Should not allow non-PKP to instantiate a new quest", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(admin)
            .instantiateNewQuest(
              "uri",
              "0x" +
                "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
              10,
            ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "onlyAssignedPKP",
        );
      });

      it("Should successfully add another Quest", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .instantiateNewQuest(
              "uri",
              "0x" +
                "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
              10,
            ),
        )
          .to.emit(initiatedKinoraQuest, "QuestInstantiated")
          .withArgs(
            2,
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
          );

        expect(await initiatedKinoraQuest.getQuestId(2)).to.equal(2);
        expect(await initiatedKinoraQuest.getQuestStatus(2)).to.equal(0);
        expect(
          await initiatedKinoraQuest.getQuestMaxParticipantCount(2),
        ).to.equal(10);
        expect(
          await initiatedKinoraQuest.getQuestParticipants(2),
        ).to.deep.equal([]);
        expect(await initiatedKinoraQuest.getQuestURIDetails(2)).to.equal(
          "uri",
        );
        expect(await initiatedKinoraQuest.getQuestJoinHash(2)).to.equal(
          "0x" +
            "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
        );
      });

      it("Should update quest details", async () => {
        const _newURIDetails = "newDetails";
        const _newMilestones = [];
        const _newStatus = 1;
        const _joinHash = ethers.utils.keccak256("0x00");
        const _newMaxParticipantCount = 20;
        const _questId = 1;

        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .updateQuestDetails(
              _newURIDetails,
              _newMilestones,
              _newStatus,
              _joinHash,
              _newMaxParticipantCount,
              _questId,
            ),
        )
          .to.emit(initiatedKinoraQuest, "QuestUpdated")
          .withArgs(_questId, _newURIDetails, _joinHash);

        expect(await initiatedKinoraQuest.getQuestId(1)).to.equal(1);
        expect(await initiatedKinoraQuest.getQuestStatus(1)).to.equal(1);
        expect(
          await initiatedKinoraQuest.getQuestMaxParticipantCount(1),
        ).to.equal(20);
        expect(
          await initiatedKinoraQuest.getQuestParticipants(1),
        ).to.deep.equal([]);
        expect(await initiatedKinoraQuest.getQuestURIDetails(1)).to.equal(
          "newDetails",
        );
        expect(await initiatedKinoraQuest.getQuestJoinHash(1)).to.equal(
          ethers.utils.keccak256("0x00"),
        );
      });

      it("Fails to update on Non PKP", async () => {
        const _newURIDetails = "newDetails";
        const _newMilestones = [];
        const _newStatus = 1;
        const _joinHash = ethers.utils.keccak256("0x00");
        const _newMaxParticipantCount = 10;
        const _questId = 1;

        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpOne)
            .updateQuestDetails(
              _newURIDetails,
              _newMilestones,
              _newStatus,
              _joinHash,
              _newMaxParticipantCount,
              _questId,
            ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "onlyAdminOrPKP",
        );
      });

      it("Should add milestone to an open quest with ERC20", async () => {
        const _questId = 2;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .addQuestMilestone(
              _questReward,
              _uriDetails,
              _completionHash,
              _questId,
              _pointCount,
            ),
        ).to.emit(initiatedKinoraQuest, "QuestMilestoneAdded");

        expect(await initiatedKinoraQuest.getQuestMilestoneCount(2)).to.equal(
          1,
        );

        expect(
          await initiatedKinoraQuest.getQuestMilestoneURIDetails(2, 1),
        ).to.equal(_uriDetails);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneCompletionHash(2, 1),
        ).to.equal(_completionHash);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneNumberOfPoints(2, 1),
        ).to.equal(_pointCount);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneStatus(2, 1),
        ).to.equal(0);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardType(2, 1),
        ).to.equal(_questReward._type);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAddress(2, 1),
        ).to.equal(_questReward._tokenAddress);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAmount(2, 1),
        ).to.equal(_questReward._amount);
      });

      it("Updates milestone details", async () => {
        const _questId = 2;
        const _uriDetails = "newMilestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x01");
        const _pointCount = 100;

        const _questReward = {
          _type: 1,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .updateMilestoneDetails(
              _uriDetails,
              _questReward._type,
              _questReward._tokenAddress,
              _completionHash,
              _questId,
              1,
              _pointCount,
              _questReward._amount,
            ),
        )
          .to.emit(initiatedKinoraQuest, "QuestMilestoneUpdated")
          .withArgs(2, 1, _completionHash);

        expect(await initiatedKinoraQuest.getQuestMilestoneCount(2)).to.equal(
          1,
        );

        expect(
          await initiatedKinoraQuest.getQuestMilestoneURIDetails(2, 1),
        ).to.equal(_uriDetails);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneCompletionHash(2, 1),
        ).to.equal(_completionHash);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneNumberOfPoints(2, 1),
        ).to.equal(_pointCount);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneStatus(2, 1),
        ).to.equal(0);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardType(2, 1),
        ).to.equal(_questReward._type);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAddress(2, 1),
        ).to.equal(_questReward._tokenAddress);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAmount(2, 1),
        ).to.equal(_questReward._amount);
      });

      it("Adds a new milestone", async () => {
        const _questId = 2;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .addQuestMilestone(
              _questReward,
              _uriDetails,
              _completionHash,
              _questId,
              _pointCount,
            ),
        ).to.emit(initiatedKinoraQuest, "QuestMilestoneAdded");

        expect(await initiatedKinoraQuest.getQuestMilestoneCount(2)).to.equal(
          2,
        );

        expect(
          await initiatedKinoraQuest.getQuestMilestoneURIDetails(2, 2),
        ).to.equal(_uriDetails);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneCompletionHash(2, 2),
        ).to.equal(_completionHash);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneNumberOfPoints(2, 2),
        ).to.equal(_pointCount);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneStatus(2, 2),
        ).to.equal(0);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardType(2, 2),
        ).to.equal(_questReward._type);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAddress(2, 2),
        ).to.equal(_questReward._tokenAddress);

        expect(
          await initiatedKinoraQuest.getQuestMilestoneRewardTokenAmount(2, 2),
        ).to.equal(_questReward._amount);
      });

      it("Doesn't add milestone if Quest doesn't exist", async () => {
        const _questId = 4;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .addQuestMilestone(
              _questReward,
              _uriDetails,
              _completionHash,
              _questId,
              _pointCount,
            ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "questDoesntExist",
        );
      });

      it("Doesn't update milestone if milestone doesn't exist", async () => {
        const _questId = 2;
        const _uriDetails = "newMilestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x01");
        const _pointCount = 100;

        const _questReward = {
          _type: 1,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .updateMilestoneDetails(
              _uriDetails,
              _questReward._type,
              _questReward._tokenAddress,
              _completionHash,
              _questId,
              3,
              _pointCount,
              _questReward._amount,
            ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "invalidMilestoneId",
        );
      });

      it("Doesn't add milestone if non Dev PKP", async () => {
        const _questId = 2;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };
        await expect(
          initiatedKinoraQuest
            .connect(admin)
            .addQuestMilestone(
              _questReward,
              _uriDetails,
              _completionHash,
              _questId,
              _pointCount,
            ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "onlyAdminOrPKP",
        );
      });

      it("Should remove Quest Milestone", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .removeQuestMilestone(2, 1),
        )
          .to.emit(initiatedKinoraQuest, "QuestMilestoneRemoved")
          .withArgs(2, 1);
      });

      it("Should remove Terminate Quest", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .terminateQuest(2),
        )
          .to.emit(initiatedKinoraQuest, "QuestTerminated")
          .withArgs(2);
      });

      it("Quest status change", async () => {
        expect(await initiatedKinoraQuest.getQuestStatus(2)).to.equal(1);
      });

      it("User joins quest", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .instantiateNewQuest(
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
            2,
          );

        const _questId = 3;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userJoinQuest(3, userPkp.address),
        )
          .to.emit(initiatedKinoraQuest, "UserJoinQuest")
          .withArgs(3);
      });

      it("Quest participation increases", async () => {
        expect(
          await initiatedKinoraQuest.getQuestParticipants(3),
        ).to.deep.equal([userPkp.address]);
      });

      it("User must exist to join quest", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userJoinQuest(3, questInvokerTwo.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "userDoesntExist",
        );
      });

      it("User completes milestone without reward available", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userCompleteMilestone(3, 1, userPkp.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "rewardNotAvailable",
        );
      });

      it("User must have joined quest to complete milestone", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userCompleteMilestone(3, 1, userPKPTwo.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "userNotEligible",
        );
      });

      it("User can't rejoin Quest", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userJoinQuest(3, userPkp.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "userNotEligible",
        );
      });

      it("User can't join on maximum participation", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userJoinQuest(3, userPkpThree.address);
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userJoinQuest(3, userPKPTwo.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "maxParticipantCountReached",
        );
      });

      it("Update all join hashes", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .updateAllJoinHashes([
              ethers.utils.keccak256("0x00"),
              ethers.utils.keccak256("0x00"),
              ethers.utils.keccak256("0x00"),
            ]),
        )
          .to.emit(initiatedKinoraQuest, "JoinHashesUpdated")
          .withArgs([
            ethers.utils.keccak256("0x00"),
            ethers.utils.keccak256("0x00"),
            ethers.utils.keccak256("0x00"),
          ]);
      });

      it("Update all completion hashes", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .updateAllCompletionHashes([
              ethers.utils.keccak256("0x00"),
              ethers.utils.keccak256("0x00"),
              ethers.utils.keccak256("0x00"),
            ]),
        )
          .to.emit(initiatedKinoraQuest, "CompletionHashesUpdated")
          .withArgs([
            ethers.utils.keccak256("0x00"),
            ethers.utils.keccak256("0x00"),
            ethers.utils.keccak256("0x00"),
          ]);
      });
    });

    describe("Kinora Escrow", () => {
      it("Should set the AccessControl and Factory correctly", async () => {
        expect(await initiatedKinoraEscrow.getKinoraAccessControl()).to.equal(
          initiatedKinoraAccessControl.address,
        );
        expect(await initiatedKinoraEscrow.getKinoraFactory()).to.equal(
          kinoraFactory.address,
        );
      });

      it("Should set the Quest and Quest Reward correctly", async () => {
        expect(await initiatedKinoraEscrow.getKinoraQuest()).to.equal(
          initiatedKinoraQuest.address,
        );
        expect(await initiatedKinoraEscrow.getKinora721QuestReward()).to.equal(
          initiatedKinora721QuestReward.address,
        );
      });

      it("Only Factory can set the Quest and Quest Reward", async () => {
        await expect(
          initiatedKinoraEscrow.setKinoraQuest(initiatedKinoraEscrow.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "onlyKinoraFactory",
        );

        await expect(
          initiatedKinoraEscrow.setKinora721QuestReward(
            initiatedKinoraEscrow.address,
          ),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "onlyKinoraFactory",
        );
      });

      it("Should deposit ERC20 tokens", async () => {
        await initiatedKinoraEscrow
          .connect(questInvokerPkpFour)
          .depositERC20(testERC20.address, 100, 3, 1);

        expect(
          await initiatedKinoraEscrow.getQuestMilestoneIdToERC20Amount(
            testERC20.address,
            3,
            1,
          ),
        ).to.equal(100);
      });

      it("Won't update if token exists", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(questInvokerPkpFour)
            .depositERC20(testERC20.address, 20, 3, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "tokenAlreadyExists",
        );
      });

      it("Should update the ERC20 deposit", async () => {
        await initiatedKinoraEscrow
          .connect(questInvokerPkpFour)
          .updateDepositERC20(testERC20.address, 3, 1, 1000);

        expect(
          await initiatedKinoraEscrow.getQuestMilestoneIdToERC20Amount(
            testERC20.address,
            3,
            1,
          ),
        ).to.equal(1000);
      });

      it("Reverts on Quest doesn't exist", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userCompleteMilestone(10, 1, userPkp.address),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraQuest.interface },
          "milestoneDoesntExist",
        );
      });

      it("Withdraws reward for user", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(questInvokerPkpFour)
            .userCompleteMilestone(3, 1, userPkp.address),
        )
          .to.emit(initiatedKinoraQuest, "UserCompleteQuestMilestone")
          .withArgs(3, 1, userPkp.address);
      });

      it("Reverts on invalid PKP or Admin for depositing ERC20", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(admin)
            .depositERC20(testERC20.address, 100, 3, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "onlyAdminOrPKP",
        );
      });

      it("Reverts on insufficient balance when withdrawing ERC20", async () => {
        // it's only the admin not the PKP, for extra safety
        await expect(
          initiatedKinoraEscrow
            .connect(questInvokerOne)
            .withdrawERC20(userPKPTwo.address, testERC20.address, 10000, 3, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "insufficientBalance",
        );
      });

      it("Should deposit ERC721 tokens", async () => {
        await initiatedKinoraEscrow
          .connect(questInvokerPkpFour)
          .depositERC721("example_uri", 3, 1);
      });

      it("Reverts on trying to deposit ERC721 that already exists", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(questInvokerPkpFour)
            .depositERC721("example_uri", 3, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "tokenAlreadyExists",
        );
      });

      it("Should update ERC721 token deposit", async () => {
        await initiatedKinoraEscrow
          .connect(questInvokerPkpFour)
          .updateDepositERC721("new_example_uri", 3, 1);
        expect(
          await initiatedKinoraEscrow.getQuestMilestoneIdToERC721URI(3, 1),
        ).to.equal("new_example_uri");
      });

      it("Won't update 721 if token doesn't exist", async () => {
        const uri = "newUri";
        await expect(
          initiatedKinoraEscrow
            .connect(questInvokerPkpFour)
            .updateDepositERC721(uri, 3, 2),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "tokenDoesntExist",
        );
      });

      it("Reverts on invalid PKP or Admin for depositing ERC721", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(admin)
            .depositERC721("example_uri", 3, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "onlyAdminOrPKP",
        );
      });

      it("Reverts on depositing ERC721 to a non-existing Quest", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(questInvokerPkpFour)
            .depositERC721("example_uri", 999, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinoraEscrow.interface },
          "questDoesntExist",
        );
      });
    });

    describe("Kinora Quest Reward", () => {
      it("Should set correct initial values", async () => {
        expect(await initiatedKinora721QuestReward.getKinoraQuest()).to.equal(
          initiatedKinoraQuest.address,
        );
        expect(await initiatedKinora721QuestReward.getKinoraEscrow()).to.equal(
          initiatedKinoraEscrow.address,
        );
        expect(await initiatedKinora721QuestReward.getTokenCount()).to.equal(0);
      });

      it("Should mint a new NFT if conditions are met", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .instantiateNewQuest(
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
            2,
          );

        const _questId = 4;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 1,
          _tokenAddress: testERC20.address,
          _amount: 0,
        };

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userJoinQuest(4, userPkp.address);
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userCompleteMilestone(4, 1, userPkp.address);
        expect(
          await initiatedKinora721QuestReward
            .connect(userPkp)
            .mintRewardNFT(userPkp.address, 4, 1),
        )
          .to.emit(initiatedKinora721QuestReward, "Transfer")
          .withArgs(ethers.constants.AddressZero, userPkp.address, 1);

        expect(await initiatedKinora721QuestReward.getTokenCount()).to.equal(1);
      });

      it("Should revert if the user has not completed the quest", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .instantiateNewQuest(
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
            2,
          );

        const _questId = 5;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 0,
          _tokenAddress: testERC20.address,
          _amount: 100,
        };

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userJoinQuest(5, userPkpThree.address);

        await expect(
          initiatedKinora721QuestReward
            .connect(userPkpThree)
            .mintRewardNFT(userPkpThree.address, 5, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinora721QuestReward.interface },
          "userNotEligible",
        );
      });

      it("Should not mint if user is part of quest but hasn't completed the milestone", async () => {
        await expect(
          initiatedKinora721QuestReward
            .connect(userPkpThree)
            .mintRewardNFT(userPkpThree.address, 5, 1),
        ).to.be.revertedWithCustomError(
          { interface: initiatedKinora721QuestReward.interface },
          "userNotEligible",
        );
      });

      it("Should increment count after minting", async () => {
        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .instantiateNewQuest(
            "uri",
            "0x" +
              "c7c3719c0854f10ff2b88b00a55889b7b51998a4088cfcc664d644e3d3926f72",
            2,
          );

        const _questId = 6;
        const _uriDetails = "milestoneDetails";
        const _completionHash = ethers.utils.keccak256("0x00");
        const _pointCount = 10;

        const _questReward = {
          _type: 1,
          _tokenAddress: testERC20.address,
          _amount: 0,
        };

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraEscrow
          .connect(questInvokerPkpFour)
          .depositERC721("uri_for_721", 6, 1);

        await initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userJoinQuest(6, userPkp.address);

        initiatedKinoraQuest
          .connect(questInvokerPkpFour)
          .userCompleteMilestone(6, 1, userPkp.address);
        expect(
          await initiatedKinora721QuestReward
            .connect(userPkp)
            .mintRewardNFT(userPkp.address, 6, 1),
        )
          .to.emit(initiatedKinora721QuestReward, "MintRewardNFT")
          .withArgs(2, userPkp.address, "uri_for_721", 6, 1);
        expect(await initiatedKinora721QuestReward.getTokenCount()).to.equal(2);
      });

      it("Should set correct URI for minted token", async () => {
        expect(await initiatedKinora721QuestReward.tokenURI(2)).to.equal(
          "uri_for_721",
        );
      });
    });
  });
});
