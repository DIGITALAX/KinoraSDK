import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

const pubId = 1;
const secondPubId = 3;
const enokerProfileId = 302;
const secondEnvokerProfileId = 55;
const playerProfileId = 89811;

describe("Contract Test Suite", () => {
  let maintainer: Signer,
    questEnvoker: Signer,
    secondEnvoker: Signer,
    playerAddress: Signer,
    secondPlayerAddress: Signer,
    thirdPlayerAddress: Signer,
    nonPlayerAddress: Signer,
    kinoraOpenAction: Contract,
    kinoraAccessControl: Contract,
    hub: Signer,
    kinoraEscrow: Contract,
    kinoraMetrics: Contract,
    kinoraQuestData: Contract,
    kinoraNFTCreator: Contract,
    token: Contract,
    nft: Contract;

  before(async () => {
    [
      maintainer,
      hub,
      questEnvoker,
      playerAddress,
      nonPlayerAddress,
      secondPlayerAddress,
      thirdPlayerAddress,
      secondEnvoker,
    ] = await ethers.getSigners();

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

    const NFT = await ethers.getContractFactory("TestERC721");
    nft = await NFT.connect(questEnvoker).deploy();

    await nft.transferFrom(
      await questEnvoker.getAddress(),
      await playerAddress.getAddress(),
      3,
    );
    await token.transfer(await playerAddress.getAddress(), "10");
    await kinoraNFTCreator.setKinoraEscrowContract(kinoraEscrow.address);
    await kinoraEscrow.setKinoraOpenActionContract(kinoraOpenAction.address);
    await kinoraQuestData.setKinoraMetricsContract(kinoraMetrics.address);
    await kinoraQuestData.setKinoraEscrowContract(kinoraEscrow.address);
    await kinoraQuestData.setKinoraOpenActionContract(kinoraOpenAction.address);
  });

  describe("Kinora Open Action", () => {
    before("Create Quest", async () => {
      await token
        .connect(questEnvoker)
        .approve(kinoraEscrow.address, (100001 * 100).toString());

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(" +
            "tuple(tuple(string[][] erc721TokenURIs, uint256[][] erc721TokenIds, address[] erc721Addresses, address[] erc20Addresses, uint256[] erc20Thresholds, bool oneOf) gated, tuple(uint8 rewardType, string uri, address tokenAddress, uint256 amount)[] rewards, tuple(string playerId, string videoBytes, uint256 profileId, uint256 pubId, uint256 minPlayCount, uint256 minCTR, uint256 minAVD, uint256 minImpressionCount, uint256 minEngagementRate, uint256 minDuration, bool quote, bool mirror, bool comment, bool bookmark, bool react)[] videos, string uri, uint256 milestone)[] milestones, " +
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
                  erc721TokenIds: [[], [4]],
                  erc721Addresses: [nft.address, nft.address],
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
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    amount: "0",
                  },
                ],
                videos: [
                  {
                    playerId: "0x135",
                    videoBytes: "116393-68",
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
                  erc721Addresses: [nft.address],
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
                    playerId: "0x136",
                    videoBytes: "116393-67",
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
              erc721Addresses: [nft.address],
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

      await kinoraOpenAction
        .connect(hub)
        .initializePublicationAction(
          enokerProfileId,
          pubId,
          await questEnvoker.getAddress(),
          encodedData,
        );
    });

    it("Checks Quest Data", async () => {
      expect(await kinoraQuestData.getTotalQuestCount()).to.equal(1);
      expect(await kinoraQuestData.getTotalPlayerCount()).to.equal(0);

      expect(await kinoraQuestData.getQuestEnvoker(1)).to.equal(
        await questEnvoker.getAddress(),
      );
      expect(await kinoraQuestData.getQuestPlayers(1)).to.deep.equal([]);
      expect(await kinoraQuestData.getQuestMaxPlayerCount(1)).to.equal(100);
      expect(await kinoraQuestData.getQuestStatus(1)).to.equal(0);
      expect(await kinoraQuestData.getQuestPubId(1)).to.equal(1);
      expect(await kinoraQuestData.getQuestProfileId(1)).to.equal(302);
      expect(await kinoraQuestData.getQuestURI(1)).to.equal(
        "ipfs://QmPhn3PNY75hG5iBWVnjrGnNdWSU8hfH9UDYSTV3C5yxFu",
      );
      expect(
        await kinoraQuestData.getQuestGatedERC721Addresses(1),
      ).to.deep.equal([nft.address]);
      expect(
        await kinoraQuestData.getQuestGatedERC721TokenIds(1),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getQuestGatedERC721TokenURIs(1),
      ).to.deep.equal([
        ["ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a"],
      ]);
      expect(await kinoraQuestData.getQuestGatedOneOf(1)).to.equal(true);
      expect(
        await kinoraQuestData.getQuestGatedERC20Addresses(1),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getQuestGatedERC20Thresholds(1),
      ).to.deep.equal([]);
    });

    it("Checks Milestone Data", async () => {
      // Milestone Two
      expect(await kinoraQuestData.getMilestoneURI(1, 2)).to.equal(
        "ipfs://QmcVoUWZ5xx9N8RYUHKsYZMaNuDcR9rDZ7yRb5gPLBZgsg",
      );
      expect(
        await kinoraQuestData.getMilestoneGatedERC721Addresses(1, 2),
      ).to.deep.equal([nft.address]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC721TokenIds(1, 2),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC721TokenURIs(1, 2),
      ).to.deep.equal([
        ["ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a"],
      ]);
      expect(await kinoraQuestData.getMilestoneGatedOneOf(1, 2)).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneGatedERC20Addresses(1, 2),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC20Thresholds(1, 2),
      ).to.deep.equal([]);
      expect(await kinoraQuestData.getMilestoneVideoLength(1, 2)).to.equal(1);
      expect(await kinoraQuestData.getMilestoneRewardsLength(1, 2)).to.equal(1);

      // video
      expect(await kinoraQuestData.getMilestoneVideos(1, 2)).to.deep.equal([
        "116393-67",
      ]);
      expect(
        await kinoraQuestData.getMilestoneVideoMinPlayCount(1, 2, 116393, 67),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinCTR(1, 2, 116393, 67),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinAVD(1, 2, 116393, 67),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinImpressionCount(
          1,
          2,
          116393,
          67,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinEngagementRate(
          1,
          2,
          116393,
          67,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinDuration(1, 2, 116393, 67),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoQuote(1, 2, 116393, 67),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoMirror(1, 2, 116393, 67),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoBookmark(1, 2, 116393, 67),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoReact(1, 2, 116393, 67),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoComment(1, 2, 116393, 67),
      ).to.equal(true);

      // reward
      expect(await kinoraQuestData.getMilestoneRewardType(1, 0, 2)).to.equal(0);
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAddress(1, 0, 2),
      ).to.equal(token.address);
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAmount(1, 0, 2),
      ).to.equal((10000).toString());
      expect(await kinoraQuestData.getMilestoneRewardURI(1, 0, 2)).to.equal("");

      // Milestone One
      expect(await kinoraQuestData.getMilestoneURI(1, 1)).to.equal(
        "ipfs://QmQEDiSfRh2ZCD3U7R3HvjtLdBafxwUSdHEcykiHLHF5Mo",
      );
      expect(
        await kinoraQuestData.getMilestoneGatedERC721Addresses(1, 1),
      ).to.deep.equal([nft.address, nft.address]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC721TokenIds(1, 1),
      ).to.deep.equal([[],[4]]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC721TokenURIs(1, 1),
      ).to.deep.equal([
        [
          "ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a",
          "ipfs://QmcdAXfprAtwjWnYcjWFf2u4N34GRuEzkbyEffDZKq5ncj",
        ],
      ]);
      expect(await kinoraQuestData.getMilestoneGatedOneOf(1, 1)).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneGatedERC20Addresses(1, 1),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getMilestoneGatedERC20Thresholds(1, 1),
      ).to.deep.equal([]);
      expect(await kinoraQuestData.getMilestoneVideoLength(1, 1)).to.equal(1);
      expect(await kinoraQuestData.getMilestoneRewardsLength(1, 1)).to.equal(2);

      // video
      expect(await kinoraQuestData.getMilestoneVideos(1, 1)).to.deep.equal([
        "116393-68",
      ]);
      expect(
        await kinoraQuestData.getMilestoneVideoMinPlayCount(1, 1, 116393, 68),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinCTR(1, 1, 116393, 68),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinAVD(1, 1, 116393, 68),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinImpressionCount(
          1,
          1,
          116393,
          68,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinEngagementRate(
          1,
          1,
          116393,
          68,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoMinDuration(1, 1, 116393, 68),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getMilestoneVideoQuote(1, 1, 116393, 68),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoMirror(1, 1, 116393, 68),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoBookmark(1, 1, 116393, 68),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoReact(1, 1, 116393, 68),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getMilestoneVideoComment(1, 1, 116393, 68),
      ).to.equal(true);

      // reward
      expect(await kinoraQuestData.getMilestoneRewardType(1, 0, 1)).to.equal(0);
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAddress(1, 0, 1),
      ).to.equal(token.address);
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAmount(1, 0, 1),
      ).to.equal((1).toString());
      expect(await kinoraQuestData.getMilestoneRewardURI(1, 0, 1)).to.equal("");
      expect(await kinoraQuestData.getMilestoneRewardType(1, 1, 1)).to.equal(1);
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAddress(1, 1, 1),
      ).to.equal("0x0000000000000000000000000000000000000000");
      expect(
        await kinoraQuestData.getMilestoneRewardTokenAmount(1, 1, 1),
      ).to.equal("0");
      expect(await kinoraQuestData.getMilestoneRewardURI(1, 1, 1)).to.equal(
        "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
      );
    });

    it("Contains Escrow", async () => {
      // Milestone One
      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          1,
        ),
      ).to.equal((1 * 100).toString());
      expect(await kinoraEscrow.getQuestMilestoneERC721URI(1, 1, 1)).to.equal(
        "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
      );

      // Milestone Two
      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          2,
        ),
      ).to.equal((10000 * 100).toString());
    });

    it("Player Joins", async () => {
      await kinoraOpenAction.connect(hub).processPublicationAction({
        publicationActedProfileId: 302,
        publicationActedId: 1,
        actorProfileId: playerProfileId,
        actorProfileOwner: await playerAddress.getAddress(),
        transactionExecutor: await hub.getAddress(),
        referrerProfileIds: [],
        referrerPubIds: [],
        referrerPubTypes: [],
        actionModuleData: "0x",
      });

      expect(await kinoraQuestData.getTotalPlayerCount()).to.equal(1);
      expect(
        await kinoraQuestData.getPlayerQuestsCompleted(playerProfileId),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
          playerProfileId,
          1,
        ),
      ).to.equal(0);
      expect(
        await kinoraQuestData.getPlayerEligibleToClaimMilestone(
          playerProfileId,
          1,
          1,
        ),
      ).to.equal(false);
      expect(await kinoraQuestData.getPlayerAddress(playerProfileId)).to.equal(
        await playerAddress.getAddress(),
      );
      expect(
        await kinoraQuestData.getPlayerQuestsJoined(playerProfileId),
      ).to.deep.equal([1]);
      expect(
        await kinoraQuestData.getPlayerHasJoinedQuest(playerProfileId, 1),
      ).to.equal(true);
    });

    it("Player Adds Metrics", async () => {
      try {
        await kinoraMetrics.connect(nonPlayerAddress).addPlayerMetrics({
          profileId: 116393,
          pubId: 67,
          playCount: 10,
          ctr: 20,
          avd: 30,
          impressionCount: 1,
          engagementRate: 0,
          duration: 100,
          mostViewedSegment: 50,
          interactionRate: 23,
          mostReplayedArea: 30,
          hasQuoted: true,
          hasMirrored: true,
          hasCommented: true,
          hasBookmarked: true,
          hasReacted: true,
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }

      await kinoraMetrics.connect(playerAddress).addPlayerMetrics({
        profileId: 116393,
        pubId: 67,
        playCount: 10,
        ctr: 20,
        avd: 30,
        impressionCount: 1,
        engagementRate: 0,
        duration: 100,
        mostViewedSegment: 50,
        interactionRate: 23,
        mostReplayedArea: 30,
        hasQuoted: true,
        hasMirrored: true,
        hasCommented: true,
        hasBookmarked: true,
        hasReacted: true,
      });

      // check video metrics
      expect(
        await kinoraQuestData.getPlayerVideoAVD(playerProfileId, 67, 116393),
      ).to.equal(30);
      expect(
        await kinoraQuestData.getPlayerVideoCTR(playerProfileId, 67, 116393),
      ).to.equal(20);
      expect(
        await kinoraQuestData.getPlayerVideoPlayCount(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(10);
      expect(
        await kinoraQuestData.getPlayerVideoImpressionCount(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(1);
      expect(
        await kinoraQuestData.getPlayerVideoEngagementRate(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(0);
      expect(
        await kinoraQuestData.getPlayerVideoDuration(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoMostViewedSegment(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(50);
      expect(
        await kinoraQuestData.getPlayerVideoInteractionRate(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(23);
      expect(
        await kinoraQuestData.getPlayerVideoMostReplayedArea(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(30);
      expect(
        await kinoraQuestData.getPlayerVideoQuote(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoMirror(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoComment(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoReact(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoBookmark(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoBytes(playerProfileId),
      ).to.deep.equal(["116393-67"]);

      await kinoraMetrics.connect(playerAddress).addPlayerMetrics({
        profileId: 116393,
        pubId: 67,
        playCount: 100,
        ctr: 100,
        avd: 100,
        impressionCount: 100,
        engagementRate: 100,
        duration: 100,
        mostViewedSegment: 100,
        interactionRate: 100,
        mostReplayedArea: 100,
        hasQuoted: true,
        hasMirrored: true,
        hasCommented: true,
        hasBookmarked: true,
        hasReacted: true,
      });

      // check video metrics
      expect(
        await kinoraQuestData.getPlayerVideoAVD(playerProfileId, 67, 116393),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoCTR(playerProfileId, 67, 116393),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoPlayCount(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoImpressionCount(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoEngagementRate(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoDuration(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoMostViewedSegment(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoInteractionRate(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoMostReplayedArea(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(100);
      expect(
        await kinoraQuestData.getPlayerVideoQuote(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoMirror(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoComment(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoReact(playerProfileId, 67, 116393),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoBookmark(
          playerProfileId,
          67,
          116393,
        ),
      ).to.equal(true);
      expect(
        await kinoraQuestData.getPlayerVideoBytes(playerProfileId),
      ).to.deep.equal(["116393-67"]);
    });

    it("Player Milestone Claim Change", async () => {
      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: playerProfileId,
          actorProfileOwner: await playerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }

      await kinoraMetrics.connect(playerAddress).addPlayerMetrics({
        profileId: 116393,
        pubId: 68,
        playCount: 100,
        ctr: 100,
        avd: 100,
        impressionCount: 100,
        engagementRate: 100,
        duration: 100,
        mostViewedSegment: 100,
        interactionRate: 100,
        mostReplayedArea: 100,
        hasQuoted: true,
        hasMirrored: true,
        hasCommented: true,
        hasBookmarked: true,
        hasReacted: true,
      });

      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: playerProfileId,
          actorProfileOwner: await playerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }
    });

    it("Play Completes Milestones & Claim Reward", async () => {
      try {
        await kinoraMetrics.playerEligibleToClaimMilestone(
          1,
          1,
          playerProfileId,
          true,
        );
      } catch (err: any) {
        expect(err.message).to.include("InvalidAddress()");
      }

      await kinoraMetrics
        .connect(questEnvoker)
        .playerEligibleToClaimMilestone(1, 1, playerProfileId, true);

      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          1,
        ),
      ).to.equal((1 * 100).toString());
      expect(await kinoraEscrow.getQuestMilestoneERC721URI(1, 1, 1)).to.equal(
        "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
      );

      const playerBalance20 = await token.balanceOf(
        await playerAddress.getAddress(),
      );
      // player erc20 + nft balance

      await kinoraOpenAction.connect(hub).processPublicationAction({
        publicationActedProfileId: 302,
        publicationActedId: 1,
        actorProfileId: playerProfileId,
        actorProfileOwner: await playerAddress.getAddress(),
        transactionExecutor: await hub.getAddress(),
        referrerProfileIds: [],
        referrerPubIds: [],
        referrerPubTypes: [],
        actionModuleData: "0x",
      });

      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          1,
        ),
      ).to.equal((1 * 99).toString());
      expect(await kinoraNFTCreator.tokenURI(1)).to.equal(
        "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
      );
      expect(await kinoraNFTCreator.getTokenSupply()).to.equal(1);

      expect(await token.balanceOf(await playerAddress.getAddress())).to.equal(
        playerBalance20.add(1),
      );
      expect(
        await kinoraNFTCreator.balanceOf(await playerAddress.getAddress()),
      ).to.equal("1");

      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: playerProfileId,
          actorProfileOwner: await playerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }

      expect(
        await kinoraQuestData.getPlayerQuestsCompleted(playerProfileId),
      ).to.deep.equal([]);
      expect(
        await kinoraQuestData.getPlayerVideoBytes(playerProfileId),
      ).to.deep.equal(["116393-67", "116393-68"]);
      expect(
        await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
          playerProfileId,
          1,
        ),
      ).to.equal(1);
      expect(
        await kinoraQuestData.getPlayerEligibleToClaimMilestone(
          playerProfileId,
          1,
          1,
        ),
      ).to.equal(true);
    });

    it("Player Completes Quest", async () => {
      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: playerProfileId,
          actorProfileOwner: await playerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }

      await kinoraMetrics
        .connect(questEnvoker)
        .playerEligibleToClaimMilestone(1, 2, playerProfileId, true);

      const playerBalance20 = await token.balanceOf(
        await playerAddress.getAddress(),
      );

      await kinoraOpenAction.connect(hub).processPublicationAction({
        publicationActedProfileId: 302,
        publicationActedId: 1,
        actorProfileId: playerProfileId,
        actorProfileOwner: await playerAddress.getAddress(),
        transactionExecutor: await hub.getAddress(),
        referrerProfileIds: [],
        referrerPubIds: [],
        referrerPubTypes: [],
        actionModuleData: "0x",
      });

      expect(
        await kinoraQuestData.getPlayerQuestsCompleted(playerProfileId),
      ).to.deep.equal([1]);
      expect(
        await kinoraQuestData.getPlayerVideoBytes(playerProfileId),
      ).to.deep.equal(["116393-67", "116393-68"]);
      expect(
        await kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
          playerProfileId,
          1,
        ),
      ).to.equal(2);
      expect(
        await kinoraQuestData.getPlayerEligibleToClaimMilestone(
          playerProfileId,
          1,
          2,
        ),
      ).to.equal(true);

      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          2,
        ),
      ).to.equal((10000 * 100 - 10000).toString());
      expect(await kinoraNFTCreator.getTokenSupply()).to.equal(1);
      expect(await token.balanceOf(await playerAddress.getAddress())).to.equal(
        playerBalance20.add(10000),
      );
      expect(
        await kinoraNFTCreator.balanceOf(await playerAddress.getAddress()),
      ).to.equal("1");
    });

    it("Terminate & Withdraw", async () => {
      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: 22,
          actorProfileOwner: await secondPlayerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("PlayerNotEligible()");
      }

      await nft.transferFrom(
        await questEnvoker.getAddress(),
        await secondPlayerAddress.getAddress(),
        1,
      );
      await nft.transferFrom(
        await questEnvoker.getAddress(),
        await thirdPlayerAddress.getAddress(),
        4,
      );

      await kinoraOpenAction.connect(hub).processPublicationAction({
        publicationActedProfileId: 302,
        publicationActedId: 1,
        actorProfileId: 22,
        actorProfileOwner: await secondPlayerAddress.getAddress(),
        transactionExecutor: await hub.getAddress(),
        referrerProfileIds: [],
        referrerPubIds: [],
        referrerPubTypes: [],
        actionModuleData: "0x",
      });

      // terminate and withdraw, receive erc20 tokens and check balances
      try {
        await kinoraEscrow.emergencyWithdrawERC20(
          await questEnvoker.getAddress(),
          1,
        );
      } catch (err: any) {
        expect(err.message).to.include("InvalidAddress()");
      }

      try {
        await kinoraEscrow
          .connect(questEnvoker)
          .emergencyWithdrawERC20(await questEnvoker.getAddress(), 2);
      } catch (err: any) {
        expect(err.message).to.include("InvalidAddress()");
      }

      const envokerBalance = await token.balanceOf(
        await questEnvoker.getAddress(),
      );
      const escrowBalance = await token.balanceOf(kinoraEscrow.address);

      const count = (
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          1,
        )
      ).add(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          2,
        ),
      );
      await kinoraEscrow
        .connect(questEnvoker)
        .emergencyWithdrawERC20(await questEnvoker.getAddress(), 1);

      expect(await token.balanceOf(await questEnvoker.getAddress())).to.equal(
        envokerBalance.add(count),
      );
      expect(await token.balanceOf(kinoraEscrow.address)).to.equal(
        escrowBalance.sub(count),
      );

      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          1,
        ),
      ).to.equal(0);
      expect(
        await kinoraEscrow.getQuestMilestoneERC20TotalDeposit(
          token.address,
          1,
          2,
        ),
      ).to.equal(0);

      expect(await kinoraQuestData.getQuestStatus(1)).to.equal(1);

      try {
        await kinoraMetrics.connect(secondPlayerAddress).addPlayerMetrics({
          profileId: 116393,
          pubId: 68,
          playCount: 100,
          ctr: 100,
          avd: 100,
          impressionCount: 100,
          engagementRate: 100,
          duration: 100,
          mostViewedSegment: 100,
          interactionRate: 100,
          mostReplayedArea: 100,
          hasQuoted: true,
          hasMirrored: true,
          hasCommented: true,
          hasBookmarked: true,
          hasReacted: true,
        });

        await kinoraMetrics
          .connect(questEnvoker)
          .playerEligibleToClaimMilestone(1, 1, 22, true);

        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: 22,
          actorProfileOwner: await secondPlayerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("QuestClosed()");
      }

      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: 302,
          publicationActedId: 1,
          actorProfileId: 3,
          actorProfileOwner: await thirdPlayerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("QuestClosed()");
      }
    });

    it("Additional Quest", async () => {
      await token
        .connect(secondEnvoker)
        .approve(kinoraEscrow.address, (22 * 100).toString());
      await token.transfer(await secondEnvoker.getAddress(), "22");

      const encodedData = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(" +
            "tuple(tuple(string[][] erc721TokenURIs, uint256[][] erc721TokenIds, address[] erc721Addresses, address[] erc20Addresses, uint256[] erc20Thresholds, bool oneOf) gated, tuple(uint8 rewardType, string uri, address tokenAddress, uint256 amount)[] rewards, tuple(string playerId, string videoBytes, uint256 profileId, uint256 pubId, uint256 minPlayCount, uint256 minCTR, uint256 minAVD, uint256 minImpressionCount, uint256 minEngagementRate, uint256 minDuration, bool quote, bool mirror, bool comment, bool bookmark, bool react)[] videos, string uri, uint256 milestone)[] milestones, " +
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
                  erc721TokenURIs: [],
                  erc721TokenIds: [],
                  erc721Addresses: [],
                  erc20Addresses: [],
                  erc20Thresholds: [],
                  oneOf: true,
                },
                rewards: [
                  {
                    rewardType: 0,
                    uri: "",
                    tokenAddress: token.address,
                    amount: "22",
                  },
                  {
                    rewardType: 1,
                    uri: "ipfs://QmWxQo9TnUaSEo6fj1mdbHs6qnRtsTJrHfhsVkGykYiz8G",
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    amount: "0",
                  },
                ],
                videos: [
                  {
                    playerId: "0x135",
                    videoBytes: "116393-68",
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
            ],
            gateLogic: {
              erc721TokenURIs: [],
              erc721TokenIds: [],
              erc721Addresses: [],
              erc20Addresses: [],
              erc20Thresholds: [],
              oneOf: true,
            },
            uri: "ipfs://QmPhn3PNY75hG5iBWVnjrGnNdWSU8hfH9UDYSTV3C5yxFu",
            envokerAddress: await secondEnvoker?.getAddress(),
            maxPlayerCount: 1,
          },
        ],
      );

      await kinoraOpenAction
        .connect(hub)
        .initializePublicationAction(
          secondEnvokerProfileId,
          secondPubId,
          await secondEnvoker.getAddress(),
          encodedData,
        );

      expect(await kinoraQuestData.getTotalQuestCount()).to.equal(2);

      await kinoraOpenAction.connect(hub).processPublicationAction({
        publicationActedProfileId: secondEnvokerProfileId,
        publicationActedId: secondPubId,
        actorProfileId: 3,
        actorProfileOwner: await thirdPlayerAddress.getAddress(),
        transactionExecutor: await hub.getAddress(),
        referrerProfileIds: [],
        referrerPubIds: [],
        referrerPubTypes: [],
        actionModuleData: "0x",
      });

      try {
        await kinoraOpenAction.connect(hub).processPublicationAction({
          publicationActedProfileId: secondEnvokerProfileId,
          publicationActedId: secondPubId,
          actorProfileId: playerProfileId,
          actorProfileOwner: await playerAddress.getAddress(),
          transactionExecutor: await hub.getAddress(),
          referrerProfileIds: [],
          referrerPubIds: [],
          referrerPubTypes: [],
          actionModuleData: "0x",
        });
      } catch (err: any) {
        expect(err.message).to.include("MaxPlayerCountReached()");
      }
    });

  });
});
