import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

xdescribe("Kinora Global PKP Contract", () => {
  let admin: SignerWithAddress,
    developerOne: SignerWithAddress,
    developerPkpOne: SignerWithAddress,
    userPkp: SignerWithAddress,
    userPkpThree: SignerWithAddress,
    kinoraGlobalAccessControl: Contract,
    kinoraGlobalPKPDB: Contract,
    kinoraFactory: Contract,
    kinoraMetrics: Contract,
    kinoraQuest: Contract,
    kinoraEscrow: Contract,
    kinora721QuestReward: Contract,
    kinoraAccessControl: Contract;

  before(async () => {
    [admin, developerOne, developerPkpOne, userPkp, userPkpThree] =
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

    await kinoraGlobalPKPDB.setKinoraFactoyAddress(kinoraFactory.address);

    const tx = await kinoraFactory
      .connect(developerOne)
      .deployFromKinoraFactory(developerPkpOne.address);
    await tx.wait();
  });

  describe("Deployment", () => {
    it("Should initialize with the correct AccessControl address", async () => {
      expect(await kinoraGlobalPKPDB.getGlobalKinoraAccessControl()).to.equal(
        kinoraGlobalAccessControl.address,
      );
    });
  });

  describe("User management", () => {
    it("Should add a new user PKP", async () => {
      await kinoraGlobalPKPDB
        .connect(developerPkpOne)
        .addUserPKP(userPkp.address);
      expect(await kinoraGlobalPKPDB.userExists(userPkp.address)).to.equal(
        true,
      );
    });

    it("Should not add an existing user PKP", async () => {
      await expect(
        kinoraGlobalPKPDB.connect(developerPkpOne).addUserPKP(userPkp.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalPKPDB.interface },
        "userAlreadyExists",
      );
    });

    it("Only admin can remove user", async () => {
      await kinoraGlobalPKPDB
        .connect(developerPkpOne)
        .addUserPKP(userPkpThree.address);

      await expect(
        kinoraGlobalPKPDB
          .connect(developerPkpOne)
          .removeUserPKP(userPkpThree.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalPKPDB.interface },
        "userNotAdmin",
      );
    });

    it("Should remove an existing user PKP", async () => {
      await kinoraGlobalPKPDB.connect(admin).removeUserPKP(userPkp.address);
      expect(await kinoraGlobalPKPDB.userExists(userPkp.address)).to.equal(
        false,
      );
    });

    it("Should not remove a non-existing user PKP", async () => {
      await kinoraGlobalPKPDB
        .connect(admin)
        .removeUserPKP(userPkpThree.address);
      await expect(
        kinoraGlobalPKPDB.connect(admin).removeUserPKP(userPkpThree.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalPKPDB.interface },
        "userDoesntExist",
      );
    });
  });

  describe("GlobalKinoraAccessControl and KinoraFactory Update", () => {
    it("Should update GlobalKinoraAccessControl address", async () => {
      const KinoraGlobalAccessControl = await ethers.getContractFactory(
        "KinoraGlobalAccessControl",
      );
      const newAccessControl = await KinoraGlobalAccessControl.deploy();
      await kinoraGlobalPKPDB
        .connect(admin)
        .updateGlobalKinoraAccessControl(newAccessControl.address);
      expect(await kinoraGlobalPKPDB.getGlobalKinoraAccessControl()).to.equal(
        newAccessControl.address,
      );
    });

    it("Should update KinoraFactory address", async () => {
      const KinoraFactory = await ethers.getContractFactory("KinoraFactory");
      const newFactory = await KinoraFactory.deploy(
        kinoraGlobalAccessControl.address,
        kinoraGlobalPKPDB.address,
      );
      await kinoraGlobalPKPDB
        .connect(admin)
        .setKinoraFactoyAddress(newFactory.address);
      expect(await kinoraGlobalPKPDB.getKinoraFactory()).to.equal(
        newFactory.address,
      );
    });
  });
});
