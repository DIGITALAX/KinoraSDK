import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";

const pubId = 1;
const playerProfileId = 302;

describe("Contract Test Suite", () => {
  let maintainer: Signer,
    questEnvoker: Signer,
    playerAddress: Signer,
    kinoraOpenAction: Contract,
    kinoraAccessControl: Contract,
    hub: Signer,
    kinoraEscrow: Contract,
    kinoraMetrics: Contract,
    kinoraQuestData: Contract,
    kinoraNFTCreator: Contract,
    token: Contract;

  before(async () => {
    [maintainer, hub, questEnvoker, playerAddress] = await ethers.getSigners();

    const KinoraAccessControl = await ethers.getContractFactory(
      "KinoraAccessControl",
    );
    const KinoraEscrow = await ethers.getContractFactory("KinoraEscrow");
    const KinoraMetrics = await ethers.getContractFactory("KinoraMetrics");
    const KinoraOpenAction = await ethers.getContractFactory(
      "KinoraOpenAction",
    );
    const KinoraNFTCreator = await ethers.getContractFactory(
      "KinoraNFTCreator",
    );
    const KinoraQuestData = await ethers.getContractFactory("KinoraQuestData");

    kinoraAccessControl = await KinoraAccessControl.deploy();
    kinoraQuestData = await KinoraQuestData.deploy(kinoraAccessControl.address);

    kinoraNFTCreator = await KinoraNFTCreator.deploy(
      kinoraAccessControl.address,
    );
    kinoraEscrow = await KinoraEscrow.deploy(
      kinoraAccessControl.address,
      kinoraQuestData.address,
      kinoraNFTCreator.address,
    );
    kinoraMetrics = await KinoraMetrics.deploy(
      kinoraAccessControl.address,
      kinoraQuestData.address,
    );
    kinoraOpenAction = await KinoraOpenAction.deploy(
      "metadata open action",
      kinoraEscrow.address,
      kinoraQuestData.address,
      kinoraAccessControl.address,
      await hub.getAddress(),
      "0x4BeB63842BB800A1Da77a62F2c74dE3CA39AF7C0",
    );

    const Token = await ethers.getContractFactory("TestERC20");
    token = await Token.connect(questEnvoker).deploy();

    await kinoraNFTCreator.setKinoraEscrowContract(kinoraEscrow.address);
    await kinoraEscrow.setKinoraOpenActionContract(kinoraOpenAction.address);
    await kinoraQuestData.setKinoraMetricsContract(kinoraMetrics.address);
    await kinoraQuestData.setKinoraEscrowContract(kinoraEscrow.address);
    await kinoraQuestData.setKinoraOpenActionContract(kinoraOpenAction.address);
  });

  describe("Kinora Open Action", () => {
    describe("Initialize Publication", () => {
      it("Only Admin Can Update The Logic Addresses", async () => {
        await token
          .connect(questEnvoker)
          .approve(kinoraEscrow.address, "100001");

        const encodedData = ethers.utils.defaultAbiCoder.encode(
          [
            "tuple(" +
              "tuple(tuple(string[][] erc721TokenURIs, uint256[][] erc721TokenIds, address[] erc721Addresses, address[] erc20Addresses, uint256[] erc20Thresholds, bool oneOf) gated, tuple(uint8 rewardType, string uri, address tokenAddress, uint256 amount)[] rewards, tuple(string playerId, uint256 profileId, uint256 pubId, uint256 minPlayCount, uint256 minCTR, uint256 minAVD, uint256 minImpressionCount, uint256 minEngagementRate, uint256 minDuration, bool quote, bool mirror, bool comment, bool bookmark, bool react)[] videos, string uri, uint256 milestone)[] milestones, " +
              "tuple(" +
              "string[][] erc721TokenURIs, " +
              "uint256[][] erc721TokenIds, " +
              "address[] erc721Addresses, " +
              "address[] erc20Addresses, " +
              "uint256[] erc20Thresholds, " +
              "bool oneOf" +
              ") gateLogic, " +
              " string uri, " +
              " address envokerAddress, " +
              "uint256 maxPlayerCount" +
              ")",
          ],
          [
            {
              milestones: [
                {
                  gated: {
                    erc721TokenURIs: [
                      [
                        "ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a",
                        "ipfs://QmcdAXfprAtwjWnYcjWFf2u4N34GRuEzkbyEffDZKq5ncj",
                      ],
                    ],
                    erc721TokenIds: [[]],
                    erc721Addresses: [
                      "0x062aA8B94a308fE84bE7974bAC758bC574145907",
                    ],
                    erc20Addresses: [],
                    erc20Thresholds: [],
                    oneOf: true,
                  },
                  rewards: [
                    {
                      rewardType: 0,
                      uri: "",
                      tokenAddress: token.address,
                      amount: "1",
                    },
                    {
                      rewardType: 1,
                      uri: "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
                      tokenAddress:
                        "0x0000000000000000000000000000000000000000",
                      amount: "0",
                    },
                  ],
                  videos: [
                    {
                      playerId: "",
                      profileId: 116393,
                      pubId: 68,
                      minPlayCount: 100,
                      minCTR: 100,
                      minAVD: 100,
                      minImpressionCount: 100,
                      minEngagementRate: 100,
                      minDuration: 100,
                      quote: true,
                      mirror: true,
                      comment: true,
                      bookmark: true,
                      react: true,
                    },
                  ],
                  uri: "ipfs://QmQEDiSfRh2ZCD3U7R3HvjtLdBafxwUSdHEcykiHLHF5Mo",
                  milestone: 1,
                },
                {
                  gated: {
                    erc721TokenURIs: [
                      ["ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a"],
                    ],
                    erc721TokenIds: [],
                    erc721Addresses: [
                      "0x062aA8B94a308fE84bE7974bAC758bC574145907",
                    ],
                    erc20Addresses: [],
                    erc20Thresholds: [],
                    oneOf: true,
                  },
                  rewards: [
                    {
                      rewardType: 0,
                      uri: "",
                      tokenAddress: token.address,
                      amount: "10000",
                    },
                  ],
                  videos: [
                    {
                      playerId: "",
                      profileId: 116393,
                      pubId: 67,
                      minPlayCount: 100,
                      minCTR: 100,
                      minAVD: 100,
                      minImpressionCount: 100,
                      minEngagementRate: 100,
                      minDuration: 100,
                      quote: true,
                      mirror: true,
                      comment: true,
                      bookmark: true,
                      react: true,
                    },
                  ],
                  uri: "ipfs://QmcVoUWZ5xx9N8RYUHKsYZMaNuDcR9rDZ7yRb5gPLBZgsg",
                  milestone: 2,
                },
              ],
              gateLogic: {
                erc721TokenURIs: [
                  ["ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a"],
                ],
                erc721TokenIds: [],
                erc721Addresses: ["0x062aA8B94a308fE84bE7974bAC758bC574145907"],
                erc20Addresses: [],
                erc20Thresholds: [],
                oneOf: true,
              },
              uri: "ipfs://QmPhn3PNY75hG5iBWVnjrGnNdWSU8hfH9UDYSTV3C5yxFu",
              envokerAddress: await questEnvoker?.getAddress(),
              maxPlayerCount: 100,
            },
          ],
        );

        try {
          await kinoraOpenAction
            .connect(hub)
            .initializePublicationAction(
              playerProfileId,
              pubId,
              await questEnvoker.getAddress(),
              encodedData,
            );
        } catch (error) {
          console.log(error.message);
        }
      });
    });
  });
});
