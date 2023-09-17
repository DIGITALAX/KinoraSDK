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
    //   kinoraGlobalAccessControl.address,
    //   kinoraGlobalPKPDB.address,
    // );
    // const kinoraMetrics = await KinoraMetrics.deploy();
    // const kinoraQuest = await KinoraQuest.deploy();
    // const kinoraEscrow = await KinoraEscrow.deploy();
    // const kinora721QuestReward = await Kinora721QuestReward.deploy();
    // const kinoraAccessControl = await KinoraAccessControl.deploy();

    // const WAIT_BLOCK_CONFIRMATIONS = 20;
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

    await run(`verify:verify`, {
      address: "0x877Ce296BB6e38C2c5eca784268aDd455AeA4eC7",
      constructorArguments: [],
    });
    await run(`verify:verify`, {
      address: "0x8Af27590B7B9527518549b84962D1E1Dd464C31D",
      constructorArguments: ["0x877Ce296BB6e38C2c5eca784268aDd455AeA4eC7"],
    });
    await run(`verify:verify`, {
      address: "0xdFf27C77d9aD5cf78960c2a2063517Ecd99FB35a",
      constructorArguments: [
        "0x877Ce296BB6e38C2c5eca784268aDd455AeA4eC7",
        "0x8Af27590B7B9527518549b84962D1E1Dd464C31D",
      ],
    });
    await run(`verify:verify`, {
      address: "0xa8887a12BF6d9D069031951404344bd29C53ec46",
    });
    await run(`verify:verify`, {
      address: "0x377E37B37e110bf08E4064B965D2820d50d827ac",
    });
    await run(`verify:verify`, {
      address: "0x9A082fdb7Fc108574E565CB7Bfc95e165e03ca23",
    });
    await run(`verify:verify`, {
      address: "0x1B0Dd172cf155d8779699d1FF0bB31D79a2882D4",
    });
    await run(`verify:verify`, {
      address: "0xA70F1446a4e22B28ed0009DdC80cb2CE4580E172",
    });
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
0x877Ce296BB6e38C2c5eca784268aDd455AeA4eC7
kinoraGlobalPKPDB deployed at
0x8Af27590B7B9527518549b84962D1E1Dd464C31D
kinoraMetrics deployed at
0xa8887a12BF6d9D069031951404344bd29C53ec46
kinoraQuest deployed at
0x377E37B37e110bf08E4064B965D2820d50d827ac
kinoraEscrow deployed at
0x9A082fdb7Fc108574E565CB7Bfc95e165e03ca23
kinora721QuestReward deployed at
0x1B0Dd172cf155d8779699d1FF0bB31D79a2882D4
kinoraAccessControl deployed at
0xA70F1446a4e22B28ed0009DdC80cb2CE4580E172
kinoraFactory deployed at
0xdFf27C77d9aD5cf78960c2a2063517Ecd99FB35a
*/
