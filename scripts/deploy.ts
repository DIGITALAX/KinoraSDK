import { ethers, run } from "hardhat";

const main = async () => {
  try {
    // const KinoraGlobalAccessControl = await ethers.getContractFactory(
    //   "KinoraGlobalAccessControl",
    // );
    // const KinoraGlobalPKPDB = await ethers.getContractFactory(
    //   "KinoraGlobalPKPDB",
    // );
    // const KinoraMetrics = await ethers.getContractFactory("KinoraMetrics");
    // const KinoraQuest = await ethers.getContractFactory("KinoraQuest");
    // const KinoraEscrow = await ethers.getContractFactory("KinoraEscrow");
    // const Kinora721QuestReward = await ethers.getContractFactory(
    //   "Kinora721QuestReward",
    // );
    // const KinoraAccessControl = await ethers.getContractFactory(
    //   "KinoraAccessControl",
    // );
    // const KinoraFactory = await ethers.getContractFactory("KinoraFactory");

    // const kinoraGlobalAccessControl = await KinoraGlobalAccessControl.deploy();
    // const kinoraGlobalPKPDB = await KinoraGlobalPKPDB.deploy(
    //   kinoraGlobalAccessControl.address,
    // );
    // const kinoraFactory = await KinoraFactory.deploy(
    //   "0x12e5aA90906C29844181d3B29438030fBc109Fc5",
    //   "0xeaF2072c9b6D0c42Dfb245607F8C2876AF6bC002",
    // );
    // const kinoraMetrics = await KinoraMetrics.deploy();
    // const kinoraQuest = await KinoraQuest.deploy();
    // const kinoraEscrow = await KinoraEscrow.deploy();
    // const kinora721QuestReward = await Kinora721QuestReward.deploy();
    // const kinoraAccessControl = await KinoraAccessControl.deploy();

    const WAIT_BLOCK_CONFIRMATIONS = 20;
    // kinoraGlobalAccessControl.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraGlobalPKPDB.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraMetrics.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraQuest.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraEscrow.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinora721QuestReward.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraAccessControl.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    // kinoraFactory.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    // console.log(
    //   `kinoraGlobalAccessControl deployed at\n${kinoraGlobalAccessControl.address}`,
    // );
    // console.log(`kinoraGlobalPKPDB deployed at\n${kinoraGlobalPKPDB.address}`);
    // console.log(`kinoraMetrics deployed at\n${kinoraMetrics.address}`);
    // console.log(`kinoraQuest deployed at\n${kinoraQuest.address}`);
    // console.log(`kinoraEscrow deployed at\n${kinoraEscrow.address}`);
    // console.log(
    //   `kinora721QuestReward deployed at\n${kinora721QuestReward.address}`,
    // );
    // console.log(
    //   `kinoraAccessControl deployed at\n${kinoraAccessControl.address}`,
    // );
    // console.log(`kinoraFactory deployed at\n${kinoraFactory.address}`);

    // await run(`verify:verify`, {
    //   address: "0x12e5aA90906C29844181d3B29438030fBc109Fc5",
    //   constructorArguments: [],
    // });
    // await run(`verify:verify`, {
    //   address: "0xeaF2072c9b6D0c42Dfb245607F8C2876AF6bC002",
    //   constructorArguments: ["0x12e5aA90906C29844181d3B29438030fBc109Fc5"],
    // });
    await run(`verify:verify`, {
      address: "0x5173c677550B932Bd078509D3B77619340Cd92c5",
      constructorArguments: [
        "0x12e5aA90906C29844181d3B29438030fBc109Fc5",
        "0xeaF2072c9b6D0c42Dfb245607F8C2876AF6bC002",
      ],
    });
    // await run(`verify:verify`, {
    //   address: "0x061920dEE081E742e391fe0d10AC8037C3eDa96D",
    // });
    // await run(`verify:verify`, {
    //   address: "0x833F0A9b37908d2252B6E6d04fDe4E9345469c25",
    // });
    // await run(`verify:verify`, {
    //   address: "0x7305A30DBB3a6697500Eb8765987B65ce8848dB2",
    // });
    // await run(`verify:verify`, {
    //   address: "0x9698bD5ECA3CE99d85abb0C7c5648415D94E827F",
    // });
    // await run(`verify:verify`, {
    //   address: "0xeA6fbcB061333b05e4b47732E0162Ee1a35e7b03",
    // });
  } catch (err: any) {
    console.error(err.message);
  }
};

main();

/*
1. set logic addresses in factory
2. set contract factory pkpdb
3. approve tokens for escrow
*/

/*
kinoraGlobalAccessControl deployed at
0x12e5aA90906C29844181d3B29438030fBc109Fc5
kinoraGlobalPKPDB deployed at
0xeaF2072c9b6D0c42Dfb245607F8C2876AF6bC002
kinoraMetrics deployed at
0xeA6fbcB061333b05e4b47732E0162Ee1a35e7b03
kinoraQuest deployed at
0x9698bD5ECA3CE99d85abb0C7c5648415D94E827F
kinoraEscrow deployed at
0x7305A30DBB3a6697500Eb8765987B65ce8848dB2
kinora721QuestReward deployed at
0x833F0A9b37908d2252B6E6d04fDe4E9345469c25
kinoraAccessControl deployed at
0x061920dEE081E742e391fe0d10AC8037C3eDa96D
kinoraFactory deployed at
0x5173c677550B932Bd078509D3B77619340Cd92c5
*/
