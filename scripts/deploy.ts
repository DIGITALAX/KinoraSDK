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
    //   "0xA75251c14f43d824Bd46Ef174f1d4d2987f3D8b4",
    //   "0x4cD2B29E8D80b150b46b90478f32D79417540F9d",
    //   "0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528",
    //   "0x4fbffF20302F3326B20052ab9C217C44F6480900",
    //   "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0",
    // );

    const WAIT_BLOCK_CONFIRMATIONS = 20;
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

    // await run(`verify:verify`, {
    //   address: "0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528",
    //   constructorArguments: [],
    // });
    // await run(`verify:verify`, {
    //   address: "0xF393225C219b5af44cb024aB2B5d9bBa49c87358",
    //   constructorArguments: ["0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528"],
    // });
    // await run(`verify:verify`, {
    //   address: "0xA75251c14f43d824Bd46Ef174f1d4d2987f3D8b4",
    //   constructorArguments: [
    //     "0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528",
    //     "0x4cD2B29E8D80b150b46b90478f32D79417540F9d",
    //     "0xF393225C219b5af44cb024aB2B5d9bBa49c87358",
    //   ],
    // });
    // await run(`verify:verify`, {
    //   address: "0x39709a202854608983Ae96791d63FAdc3e30477f",
    //   constructorArguments: [
    //     "0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528",
    //     "0x4cD2B29E8D80b150b46b90478f32D79417540F9d",
    //   ],
    // });
    // await run(`verify:verify`, {
    //   address: "0x4cD2B29E8D80b150b46b90478f32D79417540F9d",
    //   constructorArguments: ["0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528"],
    // });
    await run(`verify:verify`, {
      address: "0xC185fe57a86f17b31cfA08FA29dd2693143f00cc",
      constructorArguments: [
        "metadata open action",
        "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
        "0xA75251c14f43d824Bd46Ef174f1d4d2987f3D8b4",
        "0x09AdFa0C5b8E97E4F2E63D1639011F0Bb7328528",
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
- set kinora quest data > metrics & escrow & action
*/
