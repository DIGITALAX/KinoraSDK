import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import CryptoJS from "crypto-js";

const profileId = 301;
const pubId = 1;
const playerProfileId = 302;
const pointScore = 100;

describe("Contract Test Suite", () => {
  let maintainer: Signer,
    pkp: Signer,
    questEnvoker: Signer,
    playerAddress: Signer,
    kinoraFactory: Contract,
    kinoraOpenAction: Signer,
    kinoraBaseLogicAccessControl: Contract,
    kinoraBaseLogicQuest: Contract,
    kinoraBaseLogicEscrow: Contract,
    kinoraBaseLogicMetrics: Contract,
    kinoraQuestData: Contract,
    kinoraNFTCreator: Contract,
    kinoraQuest: Contract,
    token: Contract;

  before(async () => {
    [maintainer, pkp, questEnvoker, kinoraOpenAction, playerAddress] =
      await ethers.getSigners();

    const KinoraFactory = await ethers.getContractFactory("KinoraFactory");
    kinoraFactory = await KinoraFactory.deploy();

    const KinoraQuestData = await ethers.getContractFactory("KinoraQuestData");
    kinoraQuestData = await KinoraQuestData.deploy(kinoraFactory.address);

    // const KinoraOpenAction = await ethers.getContractFactory(
    //   "KinoraOpenAction",
    // );
    // kinoraOpenAction = await KinoraOpenAction.deploy(
    //   await hub.getAddress(),
    //   MODULES,
    //   kinoraFactory.address,
    //   kinoraQuestData.address,
    // );

    const Token = await ethers.getContractFactory("TestERC20");
    token = await Token.connect(questEnvoker).deploy();

    const KinoraNFTCreator = await ethers.getContractFactory(
      "KinoraNFTCreator",
    );
    kinoraNFTCreator = await KinoraNFTCreator.deploy(
      kinoraFactory.address,
      await kinoraOpenAction.getAddress(),
    );
    await kinoraQuestData.setKinoraOpenAction(
      await kinoraOpenAction.getAddress(),
    );

    const KinoraBaseLogicAccessControl = await ethers.getContractFactory(
      "KinoraAccessControl",
    );
    kinoraBaseLogicAccessControl = await KinoraBaseLogicAccessControl.deploy();
    const KinoraBaseLogicQuest = await ethers.getContractFactory("KinoraQuest");
    kinoraBaseLogicQuest = await KinoraBaseLogicQuest.deploy();
    const KinoraBaseLogicEscrow = await ethers.getContractFactory(
      "KinoraEscrow",
    );
    kinoraBaseLogicEscrow = await KinoraBaseLogicEscrow.deploy();
    const KinoraBaseLogicMetrics = await ethers.getContractFactory(
      "KinoraMetrics",
    );
    kinoraBaseLogicMetrics = await KinoraBaseLogicMetrics.deploy();
  });

  describe("Kinora Factory", () => {
    describe("Sets the Logic Address", () => {
      it("Only Admin Can Update The Logic Addresses", async () => {
        try {
          await kinoraFactory
            .connect(questEnvoker)
            .setLogicAddresses(
              kinoraBaseLogicAccessControl.address,
              kinoraBaseLogicQuest.address,
              kinoraBaseLogicEscrow.address,
              kinoraBaseLogicMetrics.address,
              kinoraQuestData.address,
              kinoraNFTCreator.address,
              await kinoraOpenAction.getAddress(),
            );
        } catch (error) {
          expect(error.message).to.include("OnlyAdmin()");
        }
      });

      it("Sets The Correct Logic Addresses And Maintainer", async () => {
        await kinoraFactory.setLogicAddresses(
          kinoraBaseLogicAccessControl.address,
          kinoraBaseLogicQuest.address,
          kinoraBaseLogicEscrow.address,
          kinoraBaseLogicMetrics.address,
          kinoraQuestData.address,
          kinoraNFTCreator.address,
          await kinoraOpenAction.getAddress(),
        );

        expect(await kinoraFactory.kinoraQuestData()).to.equal(
          kinoraQuestData.address,
        );
        expect(await kinoraFactory.kinoraNFTCreator()).to.equal(
          kinoraNFTCreator.address,
        );
        expect(await kinoraFactory.kinoraOpenAction()).to.equal(
          await kinoraOpenAction.getAddress(),
        );
        expect(await kinoraFactory.kinoraAccessControl()).to.equal(
          kinoraBaseLogicAccessControl.address,
        );
        expect(await kinoraFactory.kinoraQuest()).to.equal(
          kinoraBaseLogicQuest.address,
        );
        expect(await kinoraFactory.kinoraEscrow()).to.equal(
          kinoraBaseLogicEscrow.address,
        );
        expect(await kinoraFactory.kinoraMetrics()).to.equal(
          kinoraBaseLogicMetrics.address,
        );
      });

      it("Correctly Sets The Deployer As Maintainer", async () => {
        expect(await kinoraFactory.factoryMaintainer()).to.equal(
          await maintainer.getAddress(),
        );
      });
    });

    describe("Deploy From Factory", () => {
      let receipt;

      before(async () => {
        const tx = await kinoraFactory
          .connect(kinoraOpenAction)
          .deployFromKinoraFactory(
            await pkp.getAddress(),
            await questEnvoker.getAddress(),
            profileId,
            pubId,
          );

        receipt = await tx.wait();
      });

      it("Emits Deploy Factory Event", async () => {
        const event = receipt.events?.find(
          (event) => event.event === "KinoraFactoryDeployed",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(await questEnvoker.getAddress());
          expect(event.args[1]).to.equal(
            await kinoraFactory.getPKPToDeployedKinoraAccessControl(
              await pkp.getAddress(),
            ),
          );
          expect(event.args[2]).to.equal(
            await kinoraFactory.getPKPToDeployedKinoraMetrics(
              await pkp.getAddress(),
            ),
          );
          expect(event.args[3]).to.equal(
            await kinoraFactory.getPKPToDeployedKinoraQuest(
              await pkp.getAddress(),
            ),
          );
          expect(event.args[4]).to.equal(
            await kinoraFactory.getPKPToDeployedKinoraEscrow(
              await pkp.getAddress(),
            ),
          );
        }
      });

      it("Validates Metrics, Escrow and Quest Contract", async () => {
        expect(
          await kinoraQuestData.getValidMetricsContract(profileId, pubId),
        ).to.equal(
          await kinoraFactory.getPKPToDeployedKinoraMetrics(
            await pkp.getAddress(),
          ),
        );
        expect(
          await kinoraQuestData.getValidQuestContract(profileId, pubId),
        ).to.equal(
          await kinoraFactory.getPKPToDeployedKinoraQuest(
            await pkp.getAddress(),
          ),
        );
        expect(
          await kinoraQuestData.getValidEscrowContract(profileId, pubId),
        ).to.equal(
          await kinoraFactory.getPKPToDeployedKinoraEscrow(
            await pkp.getAddress(),
          ),
        );
        expect(
          await kinoraNFTCreator.getValidEscrowContract(profileId, pubId),
        ).to.equal(
          await kinoraFactory.getPKPToDeployedKinoraEscrow(
            await pkp.getAddress(),
          ),
        );
      });
    });
  });

  describe("Kinora Quest", () => {
    let receipt;
    describe("Instantiate New Quest", () => {
      before(async () => {
        const kinoraQuestAddress =
          await kinoraFactory.getPKPToDeployedKinoraQuest(
            await pkp.getAddress(),
          );
        kinoraQuest = new Contract(
          kinoraQuestAddress,
          kinoraBaseLogicQuest.interface,
        );

        const encodedData = ethers.utils.defaultAbiCoder.encode(
          [
            "tuple(tuple(uint256 type, address tokenAddress, uint256 amount, string uri) reward, string completionConditionHash, bytes32 conditionHash, uint256 milestone)[]",
          ],
          [
            [
              {
                reward: {
                  type: 0,
                  tokenAddress: token.address,
                  amount: 20,
                  uri: "0x",
                },
                completionConditionHash: "0x0x",
                conditionHash:
                  "0x" +
                  CryptoJS.SHA256("milestoneone").toString(CryptoJS.enc.Hex),
                milestone: 1,
              },
              {
                reward: {
                  type: 0,
                  tokenAddress: token.address,
                  amount: 20,
                  uri: "0x",
                },
                completionConditionHash: "0x0x",
                conditionHash:
                  "0x" +
                  CryptoJS.SHA256("milestonetwo").toString(CryptoJS.enc.Hex),
                milestone: 2,
              },
              {
                reward: {
                  type: 1,
                  tokenAddress: token.address,
                  amount: 0,
                  uri: "myuri",
                },
                completionConditionHash: "0x0x",
                conditionHash:
                  "0x" +
                  CryptoJS.SHA256("milestonethree").toString(CryptoJS.enc.Hex),
                milestone: 3,
              },
            ],
          ],
        );
        const tx = await kinoraQuest
          .connect(kinoraOpenAction)
          .instantiateNewQuest(encodedData, 1, pubId, profileId);
        receipt = await tx.wait();
      });

      it("Quest Created", async () => {
        const event = receipt.events?.find(
          (event) => event.event === "NewQuestCreated",
        );
        expect(event).to.not.be.undefined;

        expect(event.args[0]).to.equal(profileId);
        expect(event.args[1]).to.equal(pubId);
        expect(event.args[2]).to.equal(3);
      });

      it("Total Quest Count", async () => {
        expect(await kinoraQuestData.getTotalQuestCount()).to.equal(1);
      });

      it("Sets Quest Details", async () => {
        expect(
          await kinoraQuestData.getQuestMaxPlayerCount(profileId, pubId),
        ).to.equal(1);
        expect(await kinoraQuestData.getQuestStatus(profileId, pubId)).to.equal(
          0,
        );
        expect(await kinoraQuestData.getQuestPubId(profileId, pubId)).to.equal(
          pubId,
        );
        expect(
          await kinoraQuestData.getQuestProfileId(profileId, pubId),
        ).to.equal(profileId);
        expect(
          await kinoraQuestData.getQuestMilestoneCount(profileId, pubId),
        ).to.equal(3);
      });

      it("Sets Milestone Details", async () => {
        expect(
          await kinoraQuestData.getQuestMilestoneCompletionConditionHash(
            profileId,
            pubId,
            1,
          ),
        ).to.equal("0x0x");
        expect(
          await kinoraQuestData.getQuestMilestoneCompletionConditionHash(
            profileId,
            pubId,
            2,
          ),
        ).to.equal("0x0x");
        expect(
          await kinoraQuestData.getQuestMilestoneCompletionConditionHash(
            profileId,
            pubId,
            3,
          ),
        ).to.equal("0x0x");

        expect(
          await kinoraQuestData.getQuestMilestoneConditionHash(
            profileId,
            pubId,
            1,
          ),
        ).to.equal(
          "0x" + CryptoJS.SHA256("milestoneone").toString(CryptoJS.enc.Hex),
        );
        expect(
          await kinoraQuestData.getQuestMilestoneConditionHash(
            profileId,
            pubId,
            2,
          ),
        ).to.equal(
          "0x" + CryptoJS.SHA256("milestonetwo").toString(CryptoJS.enc.Hex),
        );
        expect(
          await kinoraQuestData.getQuestMilestoneConditionHash(
            profileId,
            pubId,
            3,
          ),
        ).to.equal(
          "0x" + CryptoJS.SHA256("milestonethree").toString(CryptoJS.enc.Hex),
        );

        expect(
          await kinoraQuestData.getQuestMilestoneRewardType(
            profileId,
            pubId,
            1,
          ),
        ).to.equal(0);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardType(
            profileId,
            pubId,
            2,
          ),
        ).to.equal(0);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardType(
            profileId,
            pubId,
            3,
          ),
        ).to.equal(1);

        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAddress(
            profileId,
            pubId,
            1,
          ),
        ).to.equal(token.address);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAddress(
            profileId,
            pubId,
            2,
          ),
        ).to.equal(token.address);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAddress(
            profileId,
            pubId,
            3,
          ),
        ).to.equal(token.address);

        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAmount(
            profileId,
            pubId,
            1,
          ),
        ).to.equal(20);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAmount(
            profileId,
            pubId,
            2,
          ),
        ).to.equal(20);
        expect(
          await kinoraQuestData.getQuestMilestoneRewardTokenAmount(
            profileId,
            pubId,
            3,
          ),
        ).to.equal(0);

        expect(
          await kinoraQuestData.getQuestMilestoneRewardURI(profileId, pubId, 1),
        ).to.equal("0x");
        expect(
          await kinoraQuestData.getQuestMilestoneRewardURI(profileId, pubId, 2),
        ).to.equal("0x");
        expect(
          await kinoraQuestData.getQuestMilestoneRewardURI(profileId, pubId, 3),
        ).to.equal("myuri");
      });
    });

    describe("Player Join Quest", () => {
      before(async () => {
        const tx = await kinoraQuest
          .connect(kinoraOpenAction)
          .playerJoinQuest(
            await playerAddress.getAddress(),
            pubId,
            playerProfileId,
          );
        receipt = await tx.wait();
      });

      it("Player Joined", async () => {
        const event = receipt.events?.find(
          (event) => event.event === "PlayerJoinQuest",
        );
        expect(event).to.not.be.undefined;

        expect(event.args[0]).to.equal(pubId);
        expect(event.args[1]).to.equal(playerProfileId);
      });

      it("Player Total Count", async () => {
        expect(await kinoraQuestData.getTotalPlayerCount()).to.equal(1);
      });

      it("Player Details Set", async () => {
        expect(
          await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.equal(0);

        expect(
          await kinoraQuestData.getPlayerEligibleToClaimMilestone(
            playerProfileId,
            profileId,
            pubId,
            1,
          ),
        ).to.be.false;

        expect(
          await kinoraQuestData.getPlayerTotalPointScore(playerProfileId),
        ).to.equal(0);

        expect(
          await kinoraQuestData.getPlayerAddress(playerProfileId),
        ).to.equal(await playerAddress.getAddress());

        expect(
          await kinoraQuestData.getPlayerQuestsJoined(
            playerProfileId,
            profileId,
          ),
        ).to.deep.equal([pubId]);

        expect(
          await kinoraQuestData.getPlayerHasJoinedQuest(
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.be.true;
      });

      it("Players of Quest Updated", async () => {
        expect(
          await kinoraQuestData.getQuestPlayers(profileId, pubId),
        ).to.deep.equal([playerProfileId]);
      });

      it("Max Player Count Reached", async () => {
        try {
          await kinoraQuest
            .connect(kinoraOpenAction)
            .playerJoinQuest(
              await playerAddress.getAddress(),
              pubId,
              playerProfileId,
            );
        } catch (error) {
          expect(error.message).to.include("MaxPlayerCountReached()");
        }
      });
    });
  });

  describe("Kinora Metrics", () => {
    let kinoraMetrics: Contract, receipt;
    describe("Metrics for Player Set", () => {
      before(async () => {
        const kinoraMetricsAddress =
          await kinoraFactory.getPKPToDeployedKinoraMetrics(
            await pkp.getAddress(),
          );
        kinoraMetrics = new Contract(
          kinoraMetricsAddress,
          kinoraBaseLogicMetrics.interface,
        );

        const tx = await kinoraMetrics
          .connect(pkp)
          .addPlayerMetrics(
            "playbackId",
            "json metrics",
            playerProfileId,
            pubId,
            pointScore,
            false,
          );

        receipt = await tx.wait();
      });

      it("Adds Player Metrics", async () => {
        const event = receipt.events?.find(
          (event) => event.event === "AddPlayerMetrics",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal("playbackId");
          expect(event.args[1]).to.equal("json metrics");
          expect(event.args[2]).to.equal(playerProfileId);
          expect(event.args[3]).to.equal(false);
        }

        expect(
          await kinoraQuestData.getPlayerPlaybackIdMetricsEncrypted(
            "playbackId",
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.be.false;

        expect(
          await kinoraQuestData.getPlayerPlaybackIdMetricsHash(
            "playbackId",
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.equal("json metrics");
      });

      it("Only Envoker PKP Can Add", async () => {
        try {
          await kinoraMetrics
            .connect(questEnvoker)
            .addPlayerMetrics(
              "playbackId",
              "json metrics",
              playerProfileId,
              pubId,
              pointScore,
              false,
            );
        } catch (error) {
          expect(error.message).to.include("OnlyPKP()");
        }
      });

      it("Verify Player Milestone", async () => {
        const tx = await kinoraMetrics
          .connect(pkp)
          .playerEligibleToClaimMilestone(pubId, 1, playerProfileId, true);

        receipt = await tx.wait();

        const event = receipt.events?.find(
          (event) => event.event === "PlayerEligibleToClaimMilestone",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(pubId);
          expect(event.args[1]).to.equal(1);
          expect(event.args[2]).to.equal(playerProfileId);
        }

        expect(
          await kinoraQuestData.getPlayerEligibleToClaimMilestone(
            playerProfileId,
            profileId,
            pubId,
            1,
          ),
        ).to.be.true;
        expect(
          await kinoraQuestData.getPlayerEligibleToClaimMilestone(
            playerProfileId,
            profileId,
            pubId,
            2,
          ),
        ).to.be.false;
      });

      it("Only Envoker PKP Can Verify", async () => {
        try {
          await kinoraMetrics
            .connect(questEnvoker)
            .playerEligibleToClaimMilestone(pubId, 1, playerProfileId, true);
        } catch (error) {
          expect(error.message).to.include("OnlyPKP()");
        }
      });
    });

    describe("Player Complete Milestones & Claim Reward", () => {
      let kinoraEscrow: Contract;

      before(async () => {
        const kinoraEscrowAddress =
          await kinoraFactory.getPKPToDeployedKinoraEscrow(
            await pkp.getAddress(),
          );

        kinoraEscrow = new Contract(
          kinoraEscrowAddress,
          kinoraBaseLogicEscrow.interface,
        );

        await token
          .connect(questEnvoker)
          .transfer(
            await kinoraFactory.getPKPToDeployedKinoraEscrow(
              await pkp.getAddress(),
            ),
            BigNumber.from(40),
          );

        await token.approve(
          await questEnvoker.getAddress(),
          BigNumber.from(40),
        );

        await token
          .connect(questEnvoker)
          .approve(kinoraEscrowAddress, BigNumber.from(40));

        await kinoraEscrow
          .connect(kinoraOpenAction)
          .depositERC20(
            token.address,
            await questEnvoker.getAddress(),
            BigNumber.from(20),
            pubId,
            1,
          );

        await kinoraEscrow
          .connect(kinoraOpenAction)
          .depositERC20(
            token.address,
            await questEnvoker.getAddress(),
            BigNumber.from(20),
            pubId,
            2,
          );

        await kinoraEscrow
          .connect(kinoraOpenAction)
          .depositERC721("myuri", pubId, 3);
      });

      it("Player Claims Milestone One", async () => {
        const tx = await kinoraQuest
          .connect(kinoraOpenAction)
          .playerCompleteMilestone(pubId, 1, playerProfileId);
        receipt = await tx.wait();

        const event = receipt.events?.find(
          (event) => event.event === "PlayerCompleteQuestMilestone",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(pubId);
          expect(event.args[1]).to.equal(1);
          expect(event.args[2]).to.equal(playerProfileId);
        }
      });

      it("Player Can't Claim Higher Milestone", async () => {
        try {
          await kinoraQuest
            .connect(kinoraOpenAction)
            .playerCompleteMilestone(pubId, 2, playerProfileId);
        } catch (error) {
          expect(error.message).to.include("PlayerNotEligible()");
        }
      });

      it("Updates Player Details Milestone One", async () => {
        expect(
          await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.equal(1);

        expect(
          await kinoraQuestData.getPlayerTotalPointScore(playerProfileId),
        ).to.equal(pointScore);

        expect(
          await token.balanceOf(await playerAddress.getAddress()),
        ).to.equal(BigNumber.from(20));
      });

      it("Player Claims Milestone Two", async () => {
        await kinoraMetrics
          .connect(pkp)
          .playerEligibleToClaimMilestone(pubId, 2, playerProfileId, true);

        const tx = await kinoraQuest
          .connect(kinoraOpenAction)
          .playerCompleteMilestone(pubId, 2, playerProfileId);
        receipt = await tx.wait();

        const event = receipt.events?.find(
          (event) => event.event === "PlayerCompleteQuestMilestone",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(pubId);
          expect(event.args[1]).to.equal(2);
          expect(event.args[2]).to.equal(playerProfileId);
        }
      });

      it("Updates Player Details Milestone Two", async () => {
        expect(
          await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.equal(2);

        expect(
          await kinoraQuestData.getPlayerTotalPointScore(playerProfileId),
        ).to.equal(pointScore);

        expect(
          await token.balanceOf(await playerAddress.getAddress()),
        ).to.equal(BigNumber.from(40));
      });

      it("Player Claims Milestone Three", async () => {
        await kinoraMetrics
          .connect(pkp)
          .playerEligibleToClaimMilestone(pubId, 3, playerProfileId, true);

        const tx = await kinoraQuest
          .connect(kinoraOpenAction)
          .playerCompleteMilestone(pubId, 3, playerProfileId);
        receipt = await tx.wait();

        const event = receipt.events?.find(
          (event) => event.event === "PlayerCompleteQuestMilestone",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(pubId);
          expect(event.args[1]).to.equal(3);
          expect(event.args[2]).to.equal(playerProfileId);
        }
      });

      it("Updates Player Details Milestone Three", async () => {
        expect(
          await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
            playerProfileId,
            profileId,
            pubId,
          ),
        ).to.equal(3);

        expect(
          await kinoraQuestData.getPlayerTotalPointScore(playerProfileId),
        ).to.equal(pointScore);

        expect(await kinoraNFTCreator.getTokenSupply()).to.equal(1);
        expect(await kinoraNFTCreator.tokenURI(1)).to.equal("myuri");
      });

      it("Terminates Quest & Player Can't Join Or Claim", async () => {
        const tx = await kinoraQuest
          .connect(questEnvoker)
          .terminateQuest(pubId);

        receipt = await tx.wait();

        const event = receipt.events?.find(
          (event) => event.event === "QuestTerminated",
        );
        expect(event).to.not.be.undefined;

        if (event) {
          expect(event.args[0]).to.equal(profileId);
          expect(event.args[1]).to.equal(pubId);
        }

        expect(await kinoraQuestData.getQuestStatus(profileId, pubId)).to.equal(
          1,
        );

        try {
          await kinoraQuest
            .connect(kinoraOpenAction)
            .playerJoinQuest(
              await playerAddress.getAddress(),
              pubId,
              playerProfileId,
            );
        } catch (error) {
          expect(error.message).to.include("QuestClosed()");
        }
      });

      it("Executes Emergency Withdraw", async () => {
        const kinoraEscrowAddress =
          await kinoraFactory.getPKPToDeployedKinoraEscrow(
            await pkp.getAddress(),
          );

        kinoraEscrow = new Contract(
          kinoraEscrowAddress,
          kinoraBaseLogicEscrow.interface,
        );

        await token
          .connect(questEnvoker)
          .transfer(
            await kinoraFactory.getPKPToDeployedKinoraEscrow(
              await pkp.getAddress(),
            ),
            BigNumber.from(40),
          );

        await token.approve(
          await questEnvoker.getAddress(),
          BigNumber.from(40),
        );

        await token
          .connect(questEnvoker)
          .approve(kinoraEscrowAddress, BigNumber.from(40));

        await kinoraEscrow
          .connect(kinoraOpenAction)
          .depositERC20(
            token.address,
            await questEnvoker.getAddress(),
            BigNumber.from(20),
            pubId,
            1,
          );

        await kinoraEscrow
          .connect(kinoraOpenAction)
          .depositERC20(
            token.address,
            await questEnvoker.getAddress(),
            BigNumber.from(20),
            pubId,
            2,
          );

        const tx1 = await kinoraEscrow
          .connect(questEnvoker)
          .emergencyWithdrawERC20(await questEnvoker.getAddress(), pubId, 1);
        const receipt1 = await tx1.wait();
        const tx2 = await kinoraEscrow
          .connect(questEnvoker)
          .emergencyWithdrawERC20(await questEnvoker.getAddress(), pubId, 2);
        const receipt2 = await tx2.wait();

        const event1 = receipt1.events?.find(
          (event) => event.event === "EmergencyERC20Withdrawn",
        );
        expect(event1).to.not.be.undefined;

        if (event1) {
          expect(event1.args[0]).to.equal(await questEnvoker.getAddress());
          expect(event1.args[1]).to.equal(pubId);
          expect(event1.args[2]).to.equal(1);
        }

        const event2 = receipt2.events?.find(
          (event) => event.event === "EmergencyERC20Withdrawn",
        );
        expect(event2).to.not.be.undefined;

        if (event2) {
          expect(event2.args[0]).to.equal(await questEnvoker.getAddress());
          expect(event2.args[1]).to.equal(pubId);
          expect(event2.args[2]).to.equal(2);
        }
      });
    });
  });
});
