import { Address, BigInt, ByteArray, Bytes } from "@graphprotocol/graph-ts";
import {
  KinoraQuestData,
  MilestoneCompleted as MilestoneCompletedEvent,
  QuestCompleted as QuestCompletedEvent,
  PlayerEligibleToClaimMilestone as PlayerEligibleToClaimMilestoneEvent,
  PlayerJoinedQuest as PlayerJoinedQuestEvent,
  PlayerMetricsUpdated as PlayerMetricsUpdatedEvent,
  QuestInstantiated as QuestInstantiatedEvent,
  QuestStatusUpdated as QuestStatusUpdatedEvent,
} from "../generated/KinoraQuestData/KinoraQuestData";
import { QuestMetadata as QuestMetadataTemplate } from "../generated/templates";
import {
  MilestoneCompleted,
  QuestCompleted,
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
  Player,
  Eligible,
  CompletionActivity,
  VideoActivity,
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

  let currentPlayer = Player.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
  );

  if (currentPlayer) {
    let currentEligible = new Eligible(
      event.params.milestone.toString() +
        event.params.playerProfileId.toString() +
        event.params.questId.toString(),
    );

    currentEligible.status = false;

    currentEligible.save();

    let currentCompleted = new CompletionActivity(
      event.params.milestone.toString() +
        event.params.playerProfileId.toString() +
        event.params.questId.toString(),
    );

    currentCompleted.questId = entity.questId;
    currentCompleted.milestonesCompleted = entity.milestone;

    currentCompleted.save();

    let completed: Array<string> | null = currentPlayer.milestonesCompleted;

    if (!completed) {
      completed = [];
    }
    completed.push(
      event.params.milestone.toString() +
        event.params.playerProfileId.toString() +
        event.params.questId.toString(),
    );

    currentPlayer.milestonesCompleted = completed;

    currentPlayer.save();
  }

  entity.save();
}

export function handleQuestCompleted(event: QuestCompletedEvent): void {
  let entity = new QuestCompleted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;
  entity.playerProfileId = event.params.playerProfileId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
  );

  if (currentPlayer) {
    let completedQuests: Array<BigInt> | null = currentPlayer.questsCompleted;

    if (!completedQuests) {
      completedQuests = [];
    }

    completedQuests.push(entity.questId);

    currentPlayer.questsCompleted = completedQuests;

    currentPlayer.save();
  }

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

  let currentPlayer = Player.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
  );

  if (currentPlayer) {
    let currentEligible = new Eligible(
      event.params.milestone.toString() +
        event.params.playerProfileId.toString() +
        event.params.questId.toString(),
    );

    currentEligible.milestone = entity.milestone;
    currentEligible.questId = entity.questId;
    currentEligible.status = true;

    currentEligible.save();

    let eligibile: Array<string> | null = currentPlayer.eligibile;

    if (!eligibile) {
      eligibile = [];
    }
    eligibile.push(
      event.params.milestone.toString() +
        event.params.playerProfileId.toString() +
        event.params.questId.toString(),
    );

    currentPlayer.eligibile = eligibile;

    currentPlayer.save();
  }

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

  let currentPlayer = Player.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
  );

  if (!currentPlayer) {
    currentPlayer = new Player(
      Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
    );
    currentPlayer.profileId = event.params.playerProfileId;
  }

  if (currentPlayer) {
    let questsJoined: Array<BigInt> | null = currentPlayer.questsJoined;

    if (!questsJoined) {
      questsJoined = [];
    }
    questsJoined.push(entity.questId);
    currentPlayer.questsJoined = questsJoined;

    currentPlayer.save();
  }

  let quest = QuestInstantiated.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.questId)),
  );

  if (quest) {
    let players: Array<Bytes> | null = quest.players;

    if (!players) {
      players = [];
    }

    players.push(
      Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
    );
    quest.save();
  }

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

  let currentPlayer = Player.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.playerProfileId)),
  );

  let questData = KinoraQuestData.bind(
    Address.fromString("0x4682D92f246a08B027cB400f3369a0a0D35AC923"),
  );

  if (currentPlayer) {
    let currentVideo = new VideoActivity(
      entity.playerProfileId.toString() +
        entity.videoPubId.toString() +
        entity.videoProfileId.toString(),
    );

    currentVideo.profileId = entity.videoPubId;
    currentVideo.pubId = entity.videoProfileId;
    currentVideo.playCount = questData.getPlayerVideoPlayCount(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.ctr = questData.getPlayerVideoCTR(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.avd = questData.getPlayerVideoAVD(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.impressionCount = questData.getPlayerVideoImpressionCount(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.engagementRate = questData.getPlayerVideoEngagementRate(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.duration = questData.getPlayerVideoDuration(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.mostViewedSegment = questData.getPlayerVideoMostViewedSegment(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.interactionRate = questData.getPlayerVideoInteractionRate(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.mostReplayedArea = questData.getPlayerVideoMostReplayedArea(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.hasQuoted = questData.getPlayerVideoQuote(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.hasMirrored = questData.getPlayerVideoMirror(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.hasBookmarked = questData.getPlayerVideoBookmark(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.hasCommented = questData.getPlayerVideoComment(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.hasReacted = questData.getPlayerVideoReact(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );

    currentVideo.save();

    let videos: Array<string> | null = currentPlayer.videos;

    if (!videos) {
      videos = [];
    }
    videos.push(
      entity.playerProfileId.toString() +
        entity.videoPubId.toString() +
        entity.videoProfileId.toString(),
    );

    currentPlayer.videos = videos;

    currentPlayer.save();
  }

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
    Address.fromString("0x4682D92f246a08B027cB400f3369a0a0D35AC923"),
  );

  entity.uri = questData.getQuestURI(entity.questId);
  entity.status = true;

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

    milestone.gated = milestoneURI + milestoneId.toString();
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

  let quest = QuestInstantiated.load(
    Bytes.fromByteArray(ByteArray.fromBigInt(event.params.questId)),
  );

  if (quest) {
    if (entity.status == 0) {
      quest.status = true;
    } else {
      quest.status = false;
    }

    quest.save();
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
