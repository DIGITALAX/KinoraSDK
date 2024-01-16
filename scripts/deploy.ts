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
    // const KinoraMilestoneCheckLogic = await ethers.getContractFactory(
    //   "KinoraMilestoneCheckLogic",
    // );

    // const kinoraAccessControl = await KinoraAccessControl.deploy();
    // const kinoraMilestoneCheckLogic = await KinoraMilestoneCheckLogic.deploy();
    // const kinoraQuestData = await KinoraQuestData.deploy();
    // const kinoraNFTCreator = await KinoraNFTCreator.deploy();
    // const kinoraEscrow = await KinoraEscrow.deploy();
    // const kinoraMetrics = await KinoraMetrics.deploy();
    // const kinoraOpenAction = await KinoraOpenAction.deploy(
    //   "ipfs://QmWF5gk291QnyS2WpxtMdWjm98pzxvnXeZgtqq3Lx4zDBf",
    //   kinoraEscrow.address,
    //   kinoraQuestData.address,
    //   kinoraAccessControl.address,
    //   kinoraMetrics.address,
    //   kinoraNFTCreator.address,
    //   "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
    //   "0x1eD5983F0c883B96f7C35528a1e22EEA67DE3Ff9",
    //   kinoraMilestoneCheckLogic.address,
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
    // console.log(
    //   `kinoraMilestoneLogic deployed at\n${kinoraMilestoneCheckLogic.address}`,
    // );

    await run(`verify:verify`, {
      address: "0xf31a86F0c8A12ee70518573b624B5214b967319e",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xD3438CaB2f870a936E39bf1e40F1E84608517f1d",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xe28316Ad5770781537677bA537Ac8119707bE0D7",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xA9176a6F27d77668f388F2725193875984dA544F",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xA257CAAa0aC1aEe2aEE7ED824De5d2052FD284dA",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xec5F2f43299932561aC4bAE25db7691EBC1efD83",
      constructorArguments: [],
    });

    await run(`verify:verify`, {
      address: "0x196f267A4aCA1243CCCB85AD7098D1fDA1D683CD",
      constructorArguments: [
        "ipfs://QmWF5gk291QnyS2WpxtMdWjm98pzxvnXeZgtqq3Lx4zDBf",
        "0xD3438CaB2f870a936E39bf1e40F1E84608517f1d",
        "0xA9176a6F27d77668f388F2725193875984dA544F",
        "0xf31a86F0c8A12ee70518573b624B5214b967319e",
        "0xe28316Ad5770781537677bA537Ac8119707bE0D7",
        "0xec5F2f43299932561aC4bAE25db7691EBC1efD83",
        "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
        "0x1eD5983F0c883B96f7C35528a1e22EEA67DE3Ff9",
        "0xA257CAAa0aC1aEe2aEE7ED824De5d2052FD284dA",
      ],
    });
  } catch (err: any) {
    console.error(err.message);
  }
};

main();

/* 
- kinoraMilestoneCheckLogic > freeze open action
- set kinora quest data > metrics & escrow
*/
