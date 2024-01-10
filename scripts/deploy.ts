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
      address: "0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0xC2f4b95412a1A16e073F21bae1ECf30B2f78c06E",
      constructorArguments: ["0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9"],
    });
    await run(`verify:verify`, {
      address: "0x044E0155CF3d2e4c1F64f20870663c2A2C7ff689",
      constructorArguments: [
        "0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9",
        "0x7484461387456E530A72601A3294972c9a9b6049",
        "0xC2f4b95412a1A16e073F21bae1ECf30B2f78c06E",
      ],
    });
    await run(`verify:verify`, {
      address: "0x967Bd674F5cc3E5D96c76C1Ddc25D6Be87bbd062",
      constructorArguments: [
        "0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9",
        "0x7484461387456E530A72601A3294972c9a9b6049",
      ],
    });
    await run(`verify:verify`, {
      address: "0x7484461387456E530A72601A3294972c9a9b6049",
      constructorArguments: ["0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9"],
    });
    await run(`verify:verify`, {
      address: "0xD4b3b444899df0692eDEA44f606145c52b99647E",
      constructorArguments: [
        "metadata open action",
        "0x044E0155CF3d2e4c1F64f20870663c2A2C7ff689",
        "0x7484461387456E530A72601A3294972c9a9b6049",
        "0x5E4b3a0Cb5213fAed8F52E22d79bbaCd8C60b9C9",
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
