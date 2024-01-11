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
    //   "ipfs://QmWF5gk291QnyS2WpxtMdWjm98pzxvnXeZgtqq3Lx4zDBf",
    //   kinoraEscrow.address,
    //   kinoraQuestData.address,
    //   kinoraAccessControl.address,
    //   "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
    //   "0x1eD5983F0c883B96f7C35528a1e22EEA67DE3Ff9",
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
      address: "0xE59DB9d446aE270B68Ff12756A9A6111536C5555",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xd3fc6D84451eE32243409Cfe1d364edeFf6c4be9",
      constructorArguments: ["0xE59DB9d446aE270B68Ff12756A9A6111536C5555"],
    });
    await run(`verify:verify`, {
      address: "0x0a6a1CfCE6d5DD6f277BaC5FB17C1C9bd2Dd6E9D",
      constructorArguments: [
        "0xE59DB9d446aE270B68Ff12756A9A6111536C5555",
        "0x4a3298205F64cFdc794DF374Acb439843218fA45",
        "0xd3fc6D84451eE32243409Cfe1d364edeFf6c4be9",
      ],
    });
    await run(`verify:verify`, {
      address: "0x3310E657715F0c091Cf795609EE8c285820b6e80",
      constructorArguments: [
        "0xE59DB9d446aE270B68Ff12756A9A6111536C5555",
        "0x4a3298205F64cFdc794DF374Acb439843218fA45",
      ],
    });
    await run(`verify:verify`, {
      address: "0x4a3298205F64cFdc794DF374Acb439843218fA45",
      constructorArguments: ["0xE59DB9d446aE270B68Ff12756A9A6111536C5555"],
    });
    await run(`verify:verify`, {
      address: "0x6369b7a2A256ec2834d117b280Cec2e94Ebf3439",
      constructorArguments: [
        "ipfs://QmWF5gk291QnyS2WpxtMdWjm98pzxvnXeZgtqq3Lx4zDBf",
        "0x0a6a1CfCE6d5DD6f277BaC5FB17C1C9bd2Dd6E9D",
        "0x4a3298205F64cFdc794DF374Acb439843218fA45",
        "0xE59DB9d446aE270B68Ff12756A9A6111536C5555",
        "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d",
        "0x1eD5983F0c883B96f7C35528a1e22EEA67DE3Ff9",
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
- set kinora quest data > metrics & escrow & action
*/
