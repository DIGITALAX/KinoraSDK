import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  KinoraQuestData,
  MilestoneCompleted as MilestoneCompletedEvent,
  PlayerEligibleToClaimMilestone as PlayerEligibleToClaimMilestoneEvent,
  PlayerJoinedQuest as PlayerJoinedQuestEvent,
  PlayerMetricsUpdated as PlayerMetricsUpdatedEvent,
  QuestInstantiated as QuestInstantiatedEvent,
  QuestStatusUpdated as QuestStatusUpdatedEvent,
} from "../generated/KinoraQuestData/KinoraQuestData";
import { QuestMetadata as QuestMetadataTemplate } from "../generated/templates";
import {
  MilestoneCompleted,
  PlayerEligibleToClaimMilestone,
  PlayerJoinedQuest,
  PlayerMetricsUpdated,
  QuestInstantiated,
  Milestone,
  Gate,
  QuestStatusUpdated,
  Video,
  ERC20Logic,
  ERC721Logic,
  Reward,
} from "../generated/schema";

export function handleMilestoneCompleted(event: MilestoneCompletedEvent): void {
  let entity = new MilestoneCompleted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;
  entity.playerProfileId = event.params.playerProfileId;
  entity.milestone = event.params.milestone;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePlayerEligibleToClaimMilestone(
  event: PlayerEligibleToClaimMilestoneEvent,
): void {
  let entity = new PlayerEligibleToClaimMilestone(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.playerProfileId = event.params.playerProfileId;
  entity.questId = event.params.questId;
  entity.milestone = event.params.milestone;
  entity.eligibility = event.params.eligibility;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePlayerJoinedQuest(event: PlayerJoinedQuestEvent): void {
  let entity = new PlayerJoinedQuest(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;
  entity.playerProfileId = event.params.playerProfileId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePlayerMetricsUpdated(
  event: PlayerMetricsUpdatedEvent,
): void {
  let entity = new PlayerMetricsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.playerProfileId = event.params.playerProfileId;
  entity.videoPubId = event.params.videoPubId;
  entity.videoProfileId = event.params.videoProfileId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleQuestInstantiated(event: QuestInstantiatedEvent): void {
  let entity = new QuestInstantiated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;
  entity.milestoneCount = event.params.milestoneCount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let questData = KinoraQuestData.bind(
    Address.fromString("0x4cD2B29E8D80b150b46b90478f32D79417540F9d"),
  );

  entity.uri = questData.getQuestURI(entity.questId);

  if (entity.uri !== null) {
    let hash = entity.uri.split("/").pop();
    if (hash !== null) {
      entity.questMetadata = hash;
      QuestMetadataTemplate.create(hash);
    }
  }

  let outerGate = new Gate(entity.uri.split("/").pop());

  const addressesErc20 = questData.getQuestGatedERC20Addresses(entity.questId);
  const thresholdsErc20 = questData.getQuestGatedERC20Thresholds(
    entity.questId,
  );

  let erc20Logic: Array<string> = [];
  let erc721Logic: Array<string> = [];

  for (let h = 0; h < addressesErc20.length; h++) {
    let erc20 = new ERC20Logic(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc20[h].toString(),
    );

    erc20.amount = thresholdsErc20[h];
    erc20.address = addressesErc20[h];
    erc20.save();

    erc20Logic.push(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc20[h].toString(),
    );
  }

  const addressesErc721 = questData.getQuestGatedERC721Addresses(
    entity.questId,
  );
  const tokenIds = questData.getQuestGatedERC721TokenIds(entity.questId);
  const tokenURIs = questData.getQuestGatedERC721TokenURIs(entity.questId);

  for (let h = 0; h < addressesErc721.length; h++) {
    let erc721 = new ERC721Logic(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc20[h].toString(),
    );

    erc721.address = addressesErc721[h];

    erc721.tokenIds = tokenIds[h];
    erc721.uris = tokenURIs[h];
    erc721.save();
    erc721Logic.push(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc20[h].toString(),
    );
  }

  outerGate.erc20Logic = erc20Logic;
  outerGate.erc721Logic = erc721Logic;

  outerGate.oneOf = questData.getQuestGatedOneOf(entity.questId);

  outerGate.save();

  entity.gate = entity.uri.split("/").pop();

  let milestones: Array<string> = [];

  for (let i = 0; i < entity.milestoneCount.toI32(); i++) {
    let milestoneId = (i + 1 + entity.questId.toI32()).toString();

    let milestone = new Milestone(milestoneId);

    const milestoneURI = questData.getMilestoneURI(
      entity.questId,
      new BigInt(i),
    );

    let hash = milestoneURI.split("/").pop();
    if (hash !== null) {
      milestone.details = hash;
      QuestMetadataTemplate.create(hash);
    }

    let gated = new Gate(milestoneURI + milestoneId);

    const addressesErc20 = questData.getMilestoneGatedERC20Addresses(
      entity.questId,
      new BigInt(i),
    );
    const thresholdsErc20 = questData.getMilestoneGatedERC20Thresholds(
      entity.questId,
      new BigInt(i),
    );

    let erc20Logic: Array<string> = [];
    let erc721Logic: Array<string> = [];

    for (let h = 0; h < addressesErc20.length; h++) {
      let erc20 = new ERC20Logic(
        milestoneId + h.toString() + addressesErc20[h].toString(),
      );

      erc20.amount = thresholdsErc20[h];
      erc20.address = addressesErc20[h];
      erc20.save();

      erc20Logic.push(
        milestoneId + h.toString() + addressesErc20[h].toString(),
      );
    }

    const addressesErc721 = questData.getMilestoneGatedERC721Addresses(
      entity.questId,
      new BigInt(i),
    );
    const tokenIds = questData.getMilestoneGatedERC721TokenIds(
      entity.questId,
      new BigInt(i),
    );
    const tokenURIs = questData.getMilestoneGatedERC721TokenURIs(
      entity.questId,
      new BigInt(i),
    );

    for (let h = 0; h < addressesErc721.length; h++) {
      let erc721 = new ERC721Logic(
        milestoneId + h.toString() + addressesErc721[h].toString(),
      );

      erc721.address = addressesErc721[h];

      erc721.tokenIds = tokenIds[h];
      erc721.uris = tokenURIs[h];
      erc721.save();
      erc721Logic.push(
        milestoneId + h.toString() + addressesErc721[h].toString(),
      );
    }

    gated.erc20Logic = erc20Logic;
    gated.erc721Logic = erc721Logic;

    gated.oneOf = questData.getMilestoneGatedOneOf(
      entity.questId,
      new BigInt(i),
    );

    gated.save();

    milestone.gated = milestoneURI + milestoneId;
    milestone.videoLength = questData.getMilestoneVideoLength(
      entity.questId,
      new BigInt(i),
    );

    let videos: Array<string> = [];
    const allVideos = questData.getMilestoneVideos(
      entity.questId,
      new BigInt(i),
    );

    for (let j = 0; j < allVideos.length; j++) {
      let currentVideo = new Video(allVideos[j]);

      currentVideo.pubId = BigInt.fromString(
        parseInt(allVideos[j].split("-")[0], 16).toString(),
      );
      currentVideo.profileId = BigInt.fromString(
        parseInt(allVideos[j].split("-")[0], 16).toString(),
      );

      if (<BigInt>currentVideo.pubId && <BigInt>currentVideo.profileId) {
        currentVideo.playerId = questData.getVideoPlaybackId(
          <BigInt>currentVideo.pubId,
          <BigInt>currentVideo.profileId,
        );

        currentVideo.minPlayCount = questData.getMilestoneVideoMinPlayCount(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minAVD = questData.getMilestoneVideoMinAVD(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minCTR = questData.getMilestoneVideoMinCTR(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minDuration = questData.getMilestoneVideoMinDuration(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minEngagementRate = questData.getMilestoneVideoMinEngagementRate(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minImpressionCount = questData.getMilestoneVideoMinImpressionCount(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.quote = questData.getMilestoneVideoQuote(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.mirror = questData.getMilestoneVideoMirror(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.react = questData.getMilestoneVideoReact(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.comment = questData.getMilestoneVideoComment(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.bookmark = questData.getMilestoneVideoBookmark(
          entity.questId,
          new BigInt(i),
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );

        videos.push(allVideos[j]);
      }

      currentVideo.save();
    }

    let rewards: Array<string> = [];

    const rewardLength = questData.getMilestoneRewardsLength(
      entity.questId,
      new BigInt(i),
    );

    for (let j = 0; j < rewardLength.toI32(); j++) {
      let currentReward = new Reward(milestoneURI + j.toString());

      currentReward.amount = questData.getMilestoneRewardTokenAmount(
        entity.questId,
        new BigInt(j),
        new BigInt(i),
      );
      currentReward.tokenAddress = questData.getMilestoneRewardTokenAddress(
        entity.questId,
        new BigInt(j),
        new BigInt(i),
      );
      currentReward.type = new BigInt(
        questData.getMilestoneRewardType(
          entity.questId,
          new BigInt(j),
          new BigInt(i),
        ),
      );
      currentReward.uri = questData.getMilestoneRewardURI(
        entity.questId,
        new BigInt(j),
        new BigInt(i),
      );

      currentReward.save();
      rewards.push(milestoneURI + j.toString());
    }

    milestone.rewards = rewards;
    milestone.videos = videos;
    milestone.milestoneId = new BigInt(i + 1);

    milestone.save();

    milestones.push(milestoneId);
  }

  entity.milestones = milestones;

  entity.save();
}

export function handleQuestStatusUpdated(event: QuestStatusUpdatedEvent): void {
  let entity = new QuestStatusUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;
  entity.status = event.params.status;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
