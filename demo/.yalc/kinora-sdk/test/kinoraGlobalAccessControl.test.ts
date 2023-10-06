import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

xdescribe("Kinora Global Access Control Contract", () => {
  let kinoraGlobalAccessControl: Contract,
    admin1: SignerWithAddress,
    admin2: SignerWithAddress,
    nonAdmin: SignerWithAddress;

  beforeEach(async () => {
    [admin1, admin2, nonAdmin] = await ethers.getSigners();

    const KinoraGlobalAccessControl = await ethers.getContractFactory(
      "KinoraGlobalAccessControl",
    );
    kinoraGlobalAccessControl = await KinoraGlobalAccessControl.deploy();
    await kinoraGlobalAccessControl.deployed();
  });

  describe("Deployment", () => {
    it("Should set the correct values for symbol and name", async () => {
      expect(await kinoraGlobalAccessControl.symbol()).to.equal("KGAC");
      expect(await kinoraGlobalAccessControl.name()).to.equal(
        "KinoraGlobalAccessControl",
      );
    });

    it("Should set the deployer as the initial admin", async () => {
      expect(await kinoraGlobalAccessControl.isAdmin(admin1.address)).to.equal(
        true,
      );
    });
  });

  describe("Admin management", () => {
    it("Should add a new admin", async () => {
      await expect(
        kinoraGlobalAccessControl.connect(admin1).addAdmin(admin2.address),
      )
        .to.emit(kinoraGlobalAccessControl, "AdminAdded")
        .withArgs(admin2.address);

      expect(await kinoraGlobalAccessControl.isAdmin(admin2.address)).to.equal(
        true,
      );
    });

    it("Should not add an existing admin or the contract owner", async () => {
      await expect(
        kinoraGlobalAccessControl.connect(admin1).addAdmin(admin1.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "adminAlreadyExists",
      );
      await kinoraGlobalAccessControl.connect(admin1).addAdmin(admin2.address);
      await expect(
        kinoraGlobalAccessControl.connect(admin1).addAdmin(admin2.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "adminAlreadyExists",
      );
    });

    it("Should remove an admin", async () => {
      await kinoraGlobalAccessControl.connect(admin1).addAdmin(admin2.address);

      await expect(
        kinoraGlobalAccessControl.connect(admin1).removeAdmin(admin2.address),
      )
        .to.emit(kinoraGlobalAccessControl, "AdminRemoved")
        .withArgs(admin2.address);

      expect(await kinoraGlobalAccessControl.isAdmin(admin2.address)).to.equal(
        false,
      );
    });

    it("Should not remove a non-existing admin or the contract owner", async () => {
      await expect(
        kinoraGlobalAccessControl.connect(admin1).removeAdmin(admin1.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "cantRemoveSelf",
      );
      await expect(
        kinoraGlobalAccessControl.connect(admin1).removeAdmin(nonAdmin.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "adminDoesntExist",
      );
    });
  });

  describe("Access control", () => {
    it("Should restrict non-admins from adding or removing admins", async () => {
      await expect(
        kinoraGlobalAccessControl.connect(nonAdmin).addAdmin(admin2.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "userNotAdmin",
      );
      await expect(
        kinoraGlobalAccessControl.connect(nonAdmin).removeAdmin(admin1.address),
      ).to.be.revertedWithCustomError(
        { interface: kinoraGlobalAccessControl.interface },
        "userNotAdmin",
      );
    });
  });
});
