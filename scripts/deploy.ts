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
      address: "0x329148ADC391b85C247c0bfFA3B02CbFda8F5260",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0x3a27DdB8BD7d311cA1c908D3132Af131F321119C",
      constructorArguments: ["0x329148ADC391b85C247c0bfFA3B02CbFda8F5260"],
    });
    await run(`verify:verify`, {
      address: "0x71A584c68d5B61Df0a6FadA8dbfa4382781D9c25",
      constructorArguments: [
        "0x329148ADC391b85C247c0bfFA3B02CbFda8F5260",
        "0x7118487566985d9C2d504c705c8FFe2a17fBbDAE",
        "0x3a27DdB8BD7d311cA1c908D3132Af131F321119C",
      ],
    });
    await run(`verify:verify`, {
      address: "0x4b315b4463603788AFc8cdCA3F549217Dd633B55",
      constructorArguments: [
        "0x329148ADC391b85C247c0bfFA3B02CbFda8F5260",
        "0x7118487566985d9C2d504c705c8FFe2a17fBbDAE",
      ],
    });
    await run(`verify:verify`, {
      address: "0x7118487566985d9C2d504c705c8FFe2a17fBbDAE",
      constructorArguments: ["0x329148ADC391b85C247c0bfFA3B02CbFda8F5260"],
    });
    await run(`verify:verify`, {
      address: "0x9b83de365593BF5efB754eB581387034D655aEaF",
      constructorArguments: [
        "metadata open action",
        "0x9d2b23DBf065DD9f3dA152DD3c64784Ac6036c26",
        "0x71A584c68d5B61Df0a6FadA8dbfa4382781D9c25",
        "0x329148ADC391b85C247c0bfFA3B02CbFda8F5260",
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
