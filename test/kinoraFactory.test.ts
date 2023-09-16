import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

xdescribe("Kinora Factory Contract", () => {
  let admin: SignerWithAddress,
    developerOne: SignerWithAddress,
    developerTwo: SignerWithAddress,
    developerThree: SignerWithAddress,
    developerPkpOne: SignerWithAddress,
    developerPkpTwo: SignerWithAddress,
    developerPkpThree: SignerWithAddress,
    developerPkpFour: SignerWithAddress,
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
      developerOne,
      developerTwo,
      developerThree,
      developerPkpOne,
      developerPkpTwo,
      developerPkpThree,
      developerPkpFour,
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
      .connect(developerOne)
      .deployFromKinoraFactory(developerPkpOne.address);
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
      .connect(developerPkpFour)
      .approve(initiatedKinoraEscrow.address, 2000);

    await testERC20.transfer(developerPkpFour.address, 2000);
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
        await kinoraFactory.getKinoraIDToPKP(developerPkpOne.address),
      ).to.equal(1);
    });

    it("Correctly maps contracts to developer PKP", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          developerPkpOne.address,
        ),
      ).to.equal(eventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          developerPkpOne.address,
        ),
      ).to.equal(eventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          developerPkpOne.address,
        ),
      ).to.equal(eventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          developerPkpOne.address,
        ),
      ).to.equal(eventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          developerPkpOne.address,
        ),
      ).to.equal(eventData.questRewardAddress);
    });

    it("Correctly maps deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(developerPkpOne.address),
      ).to.equal(developerOne.address);
    });

    it("Correctly maps PKPs to deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerOne.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        developerPkpOne.address,
      );
    });
  });

  describe("Repeat deploy from Factory", () => {
    let secondDeployEventData: any, thirdDeployEventData: any;

    before(async () => {
      const receipt = await (
        await kinoraFactory
          .connect(developerOne)
          .deployFromKinoraFactory(developerPkpTwo.address)
      ).wait();

      const event = receipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      secondDeployEventData = await event.args;

      const newReceipt = await (
        await kinoraFactory
          .connect(developerTwo)
          .deployFromKinoraFactory(developerPkpThree.address)
      ).wait();

      const newEvent = newReceipt.events.find(
        (event: any) => event.event === "KinoraFactoryDeployed",
      );
      thirdDeployEventData = await newEvent.args;
    });

    it("Updates ID on new deploy", async () => {
      expect(await kinoraFactory.getKinoraIDCount()).to.equal(3);
      expect(
        await kinoraFactory.getKinoraIDToPKP(developerPkpTwo.address),
      ).to.equal(2);
    });

    it("Maps new contract on additional deploy", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          developerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          developerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          developerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          developerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          developerPkpTwo.address,
        ),
      ).to.equal(secondDeployEventData.questRewardAddress);
    });

    it("Sets new PKP to deployer address", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(developerPkpTwo.address),
      ).to.equal(developerOne.address);
    });

    it("Correctly adds new PKP to deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerOne.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        developerPkpTwo.address,
      );
    });

    it("Updates ID on new deploy different address", async () => {
      expect(
        await kinoraFactory.getKinoraIDToPKP(developerPkpThree.address),
      ).to.equal(3);
    });

    it("Maps new contracts to new deployer", async () => {
      expect(
        await kinoraFactory.getDeployedKinoraAccessControlToPKP(
          developerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.accessControlAddress);
      expect(
        await kinoraFactory.getDeployedKinoraMetricsToPKP(
          developerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.metricsAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestToPKP(
          developerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.questAddress);
      expect(
        await kinoraFactory.getDeployedKinoraEscrowToPKP(
          developerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.escrowAddress);
      expect(
        await kinoraFactory.getDeployedKinoraQuestRewardToPKP(
          developerPkpThree.address,
        ),
      ).to.equal(thirdDeployEventData.questRewardAddress);
    });
    it("Correctly maps new deployer address to PKP", async () => {
      expect(
        await kinoraFactory.getKinoraDeployerToPKP(developerPkpThree.address),
      ).to.equal(developerTwo.address);
    });

    it("Correctly maps PKPs to new deployer address", async () => {
      const developerPKPs = await kinoraFactory.getDeployerToPKPs(
        developerTwo.address,
      );
      expect(developerPKPs[developerPKPs.length - 1]).to.equal(
        developerPkpThree.address,
      );
    });

    it("Won't deploy factory if PKP already exists", async () => {
      await expect(
        kinoraFactory
          .connect(developerTwo)
          .deployFromKinoraFactory(developerPkpThree.address),
      ).to.be.revertedWith(
        "KinoraFactory: PKP already mapped to contract factory.",
      );
    });
  });

  describe("Initiated Logic Contracts", () => {
    before(async () => {
      await kinoraGlobalPKPDB
        .connect(developerPkpOne)
        .addUserPKP(userPkp.address);

      await kinoraGlobalPKPDB
        .connect(developerPkpOne)
        .addUserPKP(userPKPTwo.address);

      await kinoraGlobalPKPDB
        .connect(developerPkpOne)
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
        ).to.equal(developerPkpOne.address);
        expect(
          await initiatedKinoraAccessControl.isAdmin(developerOne.address),
        ).to.equal(true);
      });

      it("Should revert if called by non-admin", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(admin)
            .addAdmin(developerThree.address),
        ).to.be.revertedWith(
          "KinoraAccessControl: Only admins can perform this action.",
        );
      });

      it("Should add a new admin", async () => {
        await initiatedKinoraAccessControl
          .connect(developerOne)
          .addAdmin(developerTwo.address);

        expect(
          await initiatedKinoraAccessControl.isAdmin(developerTwo.address),
        ).to.equal(true);

        await expect(
          initiatedKinoraAccessControl
            .connect(developerOne)
            .addAdmin(developerTwo.address),
        ).to.be.revertedWith("KinoraAccessControl: Cannot add existing admin.");
      });

      it("Should emit AdminAdded event", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(developerOne)
            .addAdmin(developerThree.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AdminAdded")
          .withArgs(developerThree.address);
      });

      it("Should remove an existing admin", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(developerOne)
            .removeAdmin(developerTwo.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AdminRemoved")
          .withArgs(developerTwo.address);

        expect(
          await initiatedKinoraAccessControl.isAdmin(developerTwo.address),
        ).to.equal(false);
      });

      it("Should not allow removing oneself", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(developerOne)
            .removeAdmin(developerOne.address),
        ).to.be.revertedWith(
          "KinoraAccessControl: Cannot remove yourself as admin.",
        );
      });
      it("Should update the assigned PKP address", async () => {
        expect(
          await initiatedKinoraAccessControl
            .connect(developerOne)
            .updateAssignedPKPAddress(developerPkpFour.address),
        )
          .to.emit(initiatedKinoraAccessControl, "AssignedPKPAddressUpdated")
          .withArgs(developerPkpFour.address);

        expect(
          await initiatedKinoraAccessControl.getAssignedPKPAddress(),
        ).to.equal(developerPkpFour.address);
      });

      it("Should revert for PKP already existing in Global DB", async () => {
        await expect(
          initiatedKinoraAccessControl
            .connect(developerOne)
            .updateAssignedPKPAddress(developerPkpOne.address),
        ).to.be.revertedWith(
          "KinoraAccessControl: PKP already assigned in global DB.",
        );
      });

      it("Should correctly identify admins", async () => {
        expect(
          await initiatedKinoraAccessControl.isAdmin(developerOne.address),
        ).to.equal(true);
        expect(
          await initiatedKinoraAccessControl.isAdmin(admin.address),
        ).to.equal(false);
      });

      it("Should return the correct assigned PKP address", async () => {
        expect(
          await initiatedKinoraAccessControl.getAssignedPKPAddress(),
        ).to.equal(developerPkpFour.address);
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
            .connect(developerPkpTwo)
            .addUserMetrics(userPkp.address, {
              playbackId,
              metricJSONHash,
              encrypted,
            }),
        ).to.be.revertedWith(
          "KinoraAccessControl: Only Assigned PKP can perform this action.",
        );
      });

      it("Should successfully add user metrics", async () => {
        const playbackId = utils.id("playback2");
        const metricJSONHash = utils.id("hash2");
        const encrypted = true;

        const tx = await initiatedKinoraMetrics
          .connect(developerPkpFour)
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
            .connect(developerPkpFour)
            .addUserMetrics(developerPkpOne.address, {
              playbackId: "",
              metricJSONHash: "",
              encrypted: true,
            }),
        ).to.be.revertedWith(
          "KinoraQuest: User must have an active PKP account.",
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
            .connect(developerPkpFour)
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
          .connect(developerPkpFour)
          .updateQuestStatus(1, 1);
        expect(await initiatedKinoraQuest.getQuestStatus(1)).to.equal(1);
      });

      it("Should reject update Quest Status", async () => {
        await expect(
          initiatedKinoraQuest.connect(developerPkpOne).updateQuestStatus(1, 1),
        ).to.be.revertedWith(
          "KinoraAccessControl: Only an Admin or the Assigned PKP can perform this action.",
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
        ).to.be.revertedWith(
          "KinoraQuest: Only Assigned PKP can perform this action.",
        );
      });

      it("Should successfully add another Quest", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
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
            .connect(developerPkpOne)
            .updateQuestDetails(
              _newURIDetails,
              _newMilestones,
              _newStatus,
              _joinHash,
              _newMaxParticipantCount,
              _questId,
            ),
        ).to.be.revertedWith(
          "KinoraAccessControl: Only an Admin or the Assigned PKP can perform this action.",
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
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
            .addQuestMilestone(
              _questReward,
              _uriDetails,
              _completionHash,
              _questId,
              _pointCount,
            ),
        ).to.be.revertedWith("KinoraQuest: Quest doesn't exist.");
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
            .connect(developerPkpFour)
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
        ).to.be.revertedWith("KinoraQuest: Invalid milestone ID.");
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
        ).to.be.revertedWith(
          "KinoraAccessControl: Only an Admin or the Assigned PKP can perform this action.",
        );
      });

      it("Should remove Quest Milestone", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
            .removeQuestMilestone(2, 1),
        )
          .to.emit(initiatedKinoraQuest, "QuestMilestoneRemoved")
          .withArgs(2, 1);
      });

      it("Should remove Terminate Quest", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
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
          .connect(developerPkpFour)
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
          .connect(developerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
            .userJoinQuest(3, developerTwo.address),
        ).to.be.revertedWith(
          "KinoraQuest: User must have an active PKP account.",
        );
      });

      it("User completes milestone without reward available", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(developerPkpFour)
            .userCompleteMilestone(3, 1, userPkp.address),
        ).to.be.revertedWith("KinoraQuest: Reward not available to withdraw.");
      });

      it("User must have joined quest to complete milestone", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(developerPkpFour)
            .userCompleteMilestone(3, 1, userPKPTwo.address),
        ).to.be.revertedWith(
          "KinoraQuest: User must have already joined the Quest.",
        );
      });

      it("User can't rejoin Quest", async () => {
        await expect(
          initiatedKinoraQuest
            .connect(developerPkpFour)
            .userJoinQuest(3, userPkp.address),
        ).to.be.revertedWith(
          "KinoraQuest: User is not eligible to join Quest.",
        );
      });

      it("User can't join on maximum participation", async () => {
        await initiatedKinoraQuest
          .connect(developerPkpFour)
          .userJoinQuest(3, userPkpThree.address);
        await expect(
          initiatedKinoraQuest
            .connect(developerPkpFour)
            .userJoinQuest(3, userPKPTwo.address),
        ).to.be.revertedWith(
          "KinoraQuest: Max Quest Participant Count reached.",
        );
      });

      it("Update all join hashes", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
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
            .connect(developerPkpFour)
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
        ).to.be.revertedWith(
          "KinoraEscrow: Only the Kinora Factory can perform this action.",
        );

        await expect(
          initiatedKinoraEscrow.setKinora721QuestReward(
            initiatedKinoraEscrow.address,
          ),
        ).to.be.revertedWith(
          "KinoraEscrow: Only the Kinora Factory can perform this action.",
        );
      });

      it("Should deposit ERC20 tokens", async () => {
        await initiatedKinoraEscrow
          .connect(developerPkpFour)
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
            .connect(developerPkpFour)
            .depositERC20(testERC20.address, 20, 3, 1),
        ).to.be.revertedWith(
          "KinoraEscrow: Token already exists, update deposit instead.",
        );
      });

      it("Should update the ERC20 deposit", async () => {
        await initiatedKinoraEscrow
          .connect(developerPkpFour)
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
            .connect(developerPkpFour)
            .userCompleteMilestone(10, 1, userPkp.address),
        ).to.be.revertedWith("KinoraQuest: Invalid milestone ID.");
      });

      it("Withdraws reward for user", async () => {
        expect(
          await initiatedKinoraQuest
            .connect(developerPkpFour)
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
        ).to.be.revertedWith(
          "KinoraEscrow: Only an Admin or the Assigned PKP can perform this action.",
        );
      });

      it("Reverts on insufficient balance when withdrawing ERC20", async () => {
        // it's only the admin not the PKP, for extra safety
        await expect(
          initiatedKinoraEscrow
            .connect(developerOne)
            .withdrawERC20(userPKPTwo.address, testERC20.address, 10000, 3, 1),
        ).to.be.revertedWith("KinoraEscrow: Insufficient balance.");
      });

      it("Should deposit ERC721 tokens", async () => {
        await initiatedKinoraEscrow
          .connect(developerPkpFour)
          .depositERC721("example_uri", 3, 1);
      });

      it("Reverts on trying to deposit ERC721 that already exists", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(developerPkpFour)
            .depositERC721("example_uri", 3, 1),
        ).to.be.revertedWith(
          "KinoraEscrow: Token already exists, update deposit instead.",
        );
      });

      it("Should update ERC721 token deposit", async () => {
        await initiatedKinoraEscrow
          .connect(developerPkpFour)
          .updateDepositERC721("new_example_uri", 3, 1);
        expect(
          await initiatedKinoraEscrow.getQuestMilestoneIdToERC721URI(3, 1),
        ).to.equal("new_example_uri");
      });

      it("Won't update 721 if token doesn't exist", async () => {
        const uri = "newUri";
        await expect(
          initiatedKinoraEscrow
            .connect(developerPkpFour)
            .updateDepositERC721(uri, 3, 2),
        ).to.be.revertedWith("KinoraEscrow: Token doesn't exist.");
      });

      it("Reverts on invalid PKP or Admin for depositing ERC721", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(admin)
            .depositERC721("example_uri", 3, 1),
        ).to.be.revertedWith(
          "KinoraEscrow: Only an Admin or the Assigned PKP can perform this action.",
        );
      });

      it("Reverts on depositing ERC721 to a non-existing Quest", async () => {
        await expect(
          initiatedKinoraEscrow
            .connect(developerPkpFour)
            .depositERC721("example_uri", 999, 1),
        ).to.be.revertedWith("KinoraEscrow: Quest doesn't exist.");
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
          .connect(developerPkpFour)
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
          .connect(developerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraQuest
          .connect(developerPkpFour)
          .userJoinQuest(4, userPkp.address);
        await initiatedKinoraQuest
          .connect(developerPkpFour)
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
          .connect(developerPkpFour)
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
          .connect(developerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraQuest
          .connect(developerPkpFour)
          .userJoinQuest(5, userPkpThree.address);

        await expect(
          initiatedKinora721QuestReward
            .connect(userPkpThree)
            .mintRewardNFT(userPkpThree.address, 5, 1),
        ).to.be.revertedWith(
          "Kinora721QuestReward: Only an eligible User can mint.",
        );
      });

      it("Should not mint if user is part of quest but hasn't completed the milestone", async () => {
        await expect(
          initiatedKinora721QuestReward
            .connect(userPkpThree)
            .mintRewardNFT(userPkpThree.address, 5, 1),
        ).to.be.revertedWith(
          "Kinora721QuestReward: Only an eligible User can mint.",
        );
      });

      it("Should increment count after minting", async () => {
        await initiatedKinoraQuest
          .connect(developerPkpFour)
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
          .connect(developerPkpFour)
          .addQuestMilestone(
            _questReward,
            _uriDetails,
            _completionHash,
            _questId,
            _pointCount,
          );

        await initiatedKinoraEscrow
          .connect(developerPkpFour)
          .depositERC721("uri_for_721", 6, 1);

        await initiatedKinoraQuest
          .connect(developerPkpFour)
          .userJoinQuest(6, userPkp.address);

        initiatedKinoraQuest
          .connect(developerPkpFour)
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
