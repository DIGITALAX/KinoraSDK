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
      address: "0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0x5339F0c733a325db0b4D30d8D915783D0198cb94",
      constructorArguments: ["0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C"],
    });
    await run(`verify:verify`, {
      address: "0x32Dd59AE48B38C4Af8dE119Aee734dd25b82F477",
      constructorArguments: [
        "0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C",
        "0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7",
        "0x5339F0c733a325db0b4D30d8D915783D0198cb94",
      ],
    });
    await run(`verify:verify`, {
      address: "0x16a1C859C4C1C1f39db98464D168c1Cc029Dc353",
      constructorArguments: [
        "0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C",
        "0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7",
      ],
    });
    await run(`verify:verify`, {
      address: "0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7",
      constructorArguments: ["0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C"],
    });
    await run(`verify:verify`, {
      address: "0x69257Ea75D2Cb2193E805FB8d31F4240B6cBba05",
      constructorArguments: [
        "metadata open action",
        "0x32Dd59AE48B38C4Af8dE119Aee734dd25b82F477",
        "0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7",
        "0x315689Db3f1704Ae2f0B5b22933101C3Bfd44C3C",
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
