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
    //   "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
    //   "0x71732bf30b19A4b950B5D0758380169bB5fE14a4",
    //   "0xdf2968FA65364f563aB68A16722F46b4d2eB4920",
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
    //   address: "0xdf2968FA65364f563aB68A16722F46b4d2eB4920",
    //   constructorArguments: [],
    // });
    // await run(`verify:verify`, {
    //   address: "0x71732bf30b19A4b950B5D0758380169bB5fE14a4",
    //   constructorArguments: ["0xdf2968FA65364f563aB68A16722F46b4d2eB4920"],
    // });
    // await run(`verify:verify`, {
    //   address: "0x87681c02220C4B5bBF4E9a85dEd0F9aFb37509e1",
    //   constructorArguments: ["0xdf2968FA65364f563aB68A16722F46b4d2eB4920"],
    // });
    // await run(`verify:verify`, {
    //   address: "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
    //   constructorArguments: [
    //     "0xdf2968FA65364f563aB68A16722F46b4d2eB4920",
    //     "0x71732bf30b19A4b950B5D0758380169bB5fE14a4",
    //     "0x87681c02220C4B5bBF4E9a85dEd0F9aFb37509e1",
    //   ],
    // });
    // await run(`verify:verify`, {
    //   address: "0xbA3c91FD5667508BFbBc5B620aB7EE8693610962",
    //   constructorArguments: [
    //     "0xdf2968FA65364f563aB68A16722F46b4d2eB4920",
    //     "0x71732bf30b19A4b950B5D0758380169bB5fE14a4",
    //   ],
    // });
    await run(`verify:verify`, {
      address: "0x8333e6CEBBE02FD45AF0fF3755aC852AF70b6022",
      constructorArguments: [
      "metadata open action",
      "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
      "0x71732bf30b19A4b950B5D0758380169bB5fE14a4",
      "0xdf2968FA65364f563aB68A16722F46b4d2eB4920",
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
