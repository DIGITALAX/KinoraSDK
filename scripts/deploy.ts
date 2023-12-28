import { ethers, run } from "hardhat";

const main = async () => {
  try {
    // const KinoraAccessControl = await ethers.getContractFactory(
    //   "KinoraAccessControl",
    // );
    // const KinoraEscrow = await ethers.getContractFactory("KinoraEscrow");
    // const KinoraMetrics = await ethers.getContractFactory("KinoraMetrics");
    // const KinoraOpenAction = await ethers.getContractFactory(
    //   "KinoraOpenAction",
    // );
    // const KinoraNFTCreator = await ethers.getContractFactory(
    //   "KinoraNFTCreator",
    // );
    // const KinoraQuestData = await ethers.getContractFactory("KinoraQuestData");

    // const kinoraAccessControl = await KinoraAccessControl.deploy();
    // const kinoraQuestData = await KinoraQuestData.deploy(
    //   kinoraAccessControl.address,
    // );

    // const kinoraNFTCreator = await KinoraNFTCreator.deploy(
    //   kinoraAccessControl.address,
    // );
    // const kinoraEscrow = await KinoraEscrow.deploy(
    //   kinoraAccessControl.address,
    //   kinoraQuestData.address,
    //   kinoraNFTCreator.address,
    // );
    // const kinoraMetrics = await KinoraMetrics.deploy(
    //   kinoraAccessControl.address,
    //   kinoraQuestData.address,
    // );
    // const kinoraOpenAction = await KinoraOpenAction.deploy(
    //   "metadata open action",
    //   kinoraEscrow.address,
    //   kinoraQuestData.address,
    //   kinoraAccessControl.address,
    //   "0x4fbffF20302F3326B20052ab9C217C44F6480900",
    //   "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0",
    // );

    // const WAIT_BLOCK_CONFIRMATIONS = 20;
    // kinoraAccessControl.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraEscrow.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraMetrics.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraOpenAction.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraNFTCreator.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraQuestData.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    // console.log(
    //   `kinoraAccessControl deployed at\n${kinoraAccessControl.address}`,
    // );
    // console.log(`kinoraEscrow deployed at\n${kinoraEscrow.address}`);
    // console.log(`kinoraMetrics deployed at\n${kinoraMetrics.address}`);
    // console.log(`kinoraQuestData deployed at\n${kinoraQuestData.address}`);
    // console.log(`kinoraOpenAction deployed at\n${kinoraOpenAction.address}`);
    // console.log(`kinoraNFTCreator deployed at\n${kinoraNFTCreator.address}`);

    await run(`verify:verify`, {
      address: "0x9eaeD9F507b80CAE208E236A41e228e8f3D96044",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0x14d6c3b84eA9655C75A4d4B264584469D57E37e3",
      constructorArguments: ["0x9eaeD9F507b80CAE208E236A41e228e8f3D96044"],
    });
    await run(`verify:verify`, {
      address: "0xaA1e30a440Aa7711f091D1786E9A5eD4EBd23EaF",
      constructorArguments: ["0x9eaeD9F507b80CAE208E236A41e228e8f3D96044"],
    });
    await run(`verify:verify`, {
      address: "0x9Bf62E348FB5AAbEC7BF34413D85Fc3005064C8C",
      constructorArguments: [
        "0x9eaeD9F507b80CAE208E236A41e228e8f3D96044",
        "0x14d6c3b84eA9655C75A4d4B264584469D57E37e3",
        "0xaA1e30a440Aa7711f091D1786E9A5eD4EBd23EaF",
      ],
    });
    await run(`verify:verify`, {
      address: "0xDde50BaA229207997b23e1Ad0Cd7be8f1Feb7d4d",
      constructorArguments: [
        "0x9eaeD9F507b80CAE208E236A41e228e8f3D96044",
        "0x14d6c3b84eA9655C75A4d4B264584469D57E37e3",
      ],
    });
    await run(`verify:verify`, {
      address: "0xB733d2d175c0535d122b0C3D706f0bE314eEC41B",
      constructorArguments: [
        "metadata open action",
        "0x9Bf62E348FB5AAbEC7BF34413D85Fc3005064C8C",
        "0x14d6c3b84eA9655C75A4d4B264584469D57E37e3",
        "0x9eaeD9F507b80CAE208E236A41e228e8f3D96044",
        "0x4fbffF20302F3326B20052ab9C217C44F6480900",
        "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0",
      ],
    });
  } catch (err: any) {
    console.error(err.message);
  }
};

main();

/* 
- set kinora nft creator > escrow
- set kinora escrow > open action
- set kinora open > register action
- set kinora quest data > metrics & escrow
*/
