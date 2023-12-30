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

    // await run(`verify:verify`, {
    //   address: "0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903",
    //   constructorArguments: [],
    // });
    // await run(`verify:verify`, {
    //   address: "0x970440d4f54b9ca9a32219798F96408b8045876D",
    //   constructorArguments: ["0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903"],
    // });
    // await run(`verify:verify`, {
    //   address: "0x9266F71E1888a53923A605a82882F83211eF64E0",
    //   constructorArguments: [
    //     "0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903",
    //     "0x4682D92f246a08B027cB400f3369a0a0D35AC923",
    //     "0x970440d4f54b9ca9a32219798F96408b8045876D",
    //   ],
    // });
    // await run(`verify:verify`, {
    //   address: "0x31802679f1b53EceEf3F401CC0427F260F98014D",
    //   constructorArguments: [
    //     "0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903",
    //     "0x4682D92f246a08B027cB400f3369a0a0D35AC923",
    //   ],
    // });
    // await run(`verify:verify`, {
    //   address: "0x4682D92f246a08B027cB400f3369a0a0D35AC923",
    //   constructorArguments: ["0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903"],
    // });
    // await run(`verify:verify`, {
    //   address: "0xF451CD340AEfe28C58162543D5167E35b36325d7",
    //   constructorArguments: [
    //     "metadata open action",
    //     "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
    //     "0x9266F71E1888a53923A605a82882F83211eF64E0",
    //     "0x8976C2692ADbF9C2DE124e5BaF085429D95Ab903",
    //     "0x4fbffF20302F3326B20052ab9C217C44F6480900",
    //     "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0",
    //   ],
    // });
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
