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
  PlayerEligibleToClaimMilestone,
  PlayerJoinedQuest,
  QuestCompleted,
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

  let currentPlayer = Player.load(event.params.playerProfileId.toString());

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

  let currentPlayer = Player.load(event.params.playerProfileId.toString());

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

  let currentPlayer = Player.load(event.params.playerProfileId.toString());

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
  entity.id = Bytes.fromByteArray(
    ByteArray.fromBigInt(event.params.playerProfileId),
  );
  entity.questId = event.params.questId;
  entity.playerProfileId = event.params.playerProfileId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(event.params.playerProfileId.toString());

  if (!currentPlayer) {
    currentPlayer = new Player(event.params.playerProfileId.toString());
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
    let players: Array<string> | null = quest.players;

    if (!players) {
      players = [];
    }

    players.push(event.params.playerProfileId.toString());
    quest.players = players;
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

  let currentPlayer = Player.load(event.params.playerProfileId.toString());

  let questData = KinoraQuestData.bind(
    Address.fromString("0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7"),
  );

  if (currentPlayer) {
    let currentVideo = new VideoActivity(
      entity.playerProfileId.toString() +
        entity.videoPubId.toString() +
        entity.videoProfileId.toString(),
    );

    currentVideo.profileId = entity.videoPubId;
    currentVideo.pubId = entity.videoProfileId;
    // currentVideo.videosBytes = questData.getPlayerVideoBytes();
    currentVideo.playCount = questData.getPlayerVideoPlayCount(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );
    currentVideo.avd = questData.getPlayerVideoAVD(
      entity.playerProfileId,
      entity.videoPubId,
      entity.videoProfileId,
    );

    currentVideo.duration = questData.getPlayerVideoDuration(
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
  entity.id = Bytes.fromByteArray(ByteArray.fromBigInt(event.params.questId));
  entity.questId = event.params.questId;
  entity.milestoneCount = event.params.milestoneCount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let questData = KinoraQuestData.bind(
    Address.fromString("0x04F1aC508F3b2b9a3d1Cf00dFAB278109D01EbA7"),
  );

  entity.maxPlayerCount = questData.getQuestMaxPlayerCount(entity.questId);

  entity.profileId = questData.getQuestProfileId(entity.questId);
  entity.pubId = questData.getQuestPubId(entity.questId);

  entity.uri = questData.getQuestURI(entity.questId);
  entity.status = true;

  if (entity.uri !== null) {
    let hash = entity.uri;

    if (hash.includes("ipfs://")) {
      hash = hash.split("/").pop();
    }
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
        addressesErc20[h].toHexString(),
    );

    erc20.amount = thresholdsErc20[h];
    erc20.address = addressesErc20[h];
    erc20.save();

    erc20Logic.push(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc20[h].toHexString(),
    );
  }

  const addressesErc721 = questData.getQuestGatedERC721Addresses(
    entity.questId,
  );
  let tokenIds = questData.getQuestGatedERC721TokenIds(entity.questId);
  let tokenURIs = questData.getQuestGatedERC721TokenURIs(entity.questId);

  if (!tokenIds) {
    tokenIds = [];
  }

  if (!tokenURIs) {
    tokenURIs = [];
  }

  for (let h = 0; h < addressesErc721.length; h++) {
    let erc721 = new ERC721Logic(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc721[h].toHexString(),
    );

    erc721.address = addressesErc721[h];

    if (h < tokenIds.length && tokenIds[h]) {
      erc721.tokenIds = tokenIds[h];
    }

    if (h < tokenURIs.length && tokenURIs[h]) {
      erc721.uris = tokenURIs[h];
    }

    erc721.save();
    erc721Logic.push(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc721[h].toHexString(),
    );
  }

  outerGate.erc20Logic = erc20Logic;
  outerGate.erc721Logic = erc721Logic;

  outerGate.oneOf = questData.getQuestGatedOneOf(entity.questId);

  outerGate.save();

  entity.gate = entity.uri.split("/").pop();

  let milestones: Array<string> = [];
  let milestoneCount = entity.milestoneCount.toI32();

  for (let i = 0; i < milestoneCount; i++) {
    let milestoneId = (i + 1 + entity.questId.toI32()).toString();
    let milestone = new Milestone(milestoneId);
    milestone.milestoneId = BigInt.fromString((i + 1).toString());

    let milestoneURI = questData.getMilestoneURI(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );
    if (milestoneURI.includes("ipfs://")) {
      milestoneURI = milestoneURI.split("/").pop();
    }

    if (milestoneURI !== null) {
      milestone.uri = milestoneURI;

      milestone.milestoneMetadata = milestoneURI;
      QuestMetadataTemplate.create(milestoneURI);
    }

    let gated = new Gate(milestoneURI + milestoneId);

    const addressesErc20 = questData.getMilestoneGatedERC20Addresses(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );
    const thresholdsErc20 = questData.getMilestoneGatedERC20Thresholds(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    let erc20Logic: Array<string> = [];
    let erc721Logic: Array<string> = [];

    for (let h = 0; h < addressesErc20.length; h++) {
      let erc20 = new ERC20Logic(
        milestoneId + h.toString() + addressesErc20[h].toHexString(),
      );

      erc20.amount = thresholdsErc20[h];
      erc20.address = addressesErc20[h];
      erc20.save();

      erc20Logic.push(
        milestoneId + h.toString() + addressesErc20[h].toHexString(),
      );
    }

    const addressesErc721 = questData.getMilestoneGatedERC721Addresses(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );
    let tokenIds = questData.getMilestoneGatedERC721TokenIds(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );
    let tokenURIs = questData.getMilestoneGatedERC721TokenURIs(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    if (!tokenIds) {
      tokenIds = [];
    }

    if (!tokenURIs) {
      tokenURIs = [];
    }

    for (let h = 0; h < addressesErc721.length; h++) {
      let erc721 = new ERC721Logic(
        milestoneId + h.toString() + addressesErc721[h].toHexString(),
      );

      erc721.address = addressesErc721[h];

      if (h < tokenIds.length && tokenIds[h]) {
        erc721.tokenIds = tokenIds[h];
      }

      if (h < tokenURIs.length && tokenURIs[h]) {
        erc721.uris = tokenURIs[h];
      }
      erc721.save();
      erc721Logic.push(
        milestoneId + h.toString() + addressesErc721[h].toHexString(),
      );
    }

    gated.erc20Logic = erc20Logic;
    gated.erc721Logic = erc721Logic;

    gated.oneOf = questData.getMilestoneGatedOneOf(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    gated.save();

    milestone.gated = milestoneURI + milestoneId.toString();
    milestone.videoLength = questData.getMilestoneVideoLength(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    let videos: Array<string> = [];
    const allVideos = questData.getMilestoneVideos(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    for (let j = 0; j < allVideos.length; j++) {
      let currentVideo = new Video(
        allVideos[j].toString() +
          entity.questId.toString() +
          (<BigInt>milestone.milestoneId).toString(),
      );

      currentVideo.pubId = BigInt.fromString(
        parseInt(allVideos[j].split("-")[1], 16)
          .toString()
          .replace(".0", ""),
      );
      currentVideo.profileId = BigInt.fromString(
        parseInt(allVideos[j].split("-")[0], 16)
          .toString()
          .replace(".0", ""),
      );

      if (<BigInt>currentVideo.pubId && <BigInt>currentVideo.profileId) {
        currentVideo.playerId = questData.getVideoPlaybackId(
          <BigInt>currentVideo.pubId,
          <BigInt>currentVideo.profileId,
        );

        currentVideo.minPlayCount = questData.getMilestoneVideoMinPlayCount(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minAVD = questData.getMilestoneVideoMinAVD(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryQuoteOnQuote = questData.getMilestoneVideoMinSecondaryQuoteOnQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryMirrorOnQuote = questData.getMilestoneVideoMinSecondaryMirrorOnQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryReactOnQuote = questData.getMilestoneVideoMinSecondaryReactOnQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryCommentOnQuote = questData.getMilestoneVideoMinSecondaryCommentOnQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryCollectOnQuote = questData.getMilestoneVideoMinSecondaryCollectOnQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryQuoteOnComment = questData.getMilestoneVideoMinSecondaryQuoteOnComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryMirrorOnComment = questData.getMilestoneVideoMinSecondaryMirrorOnComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryReactOnComment = questData.getMilestoneVideoMinSecondaryReactOnComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryCommentOnComment = questData.getMilestoneVideoMinSecondaryCommentOnComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minSecondaryCollectOnComment = questData.getMilestoneVideoMinSecondaryCollectOnComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.minDuration = questData.getMilestoneVideoMinDuration(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.quote = questData.getMilestoneVideoQuote(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.mirror = questData.getMilestoneVideoMirror(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.react = questData.getMilestoneVideoReact(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.comment = questData.getMilestoneVideoComment(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );
        currentVideo.bookmark = questData.getMilestoneVideoBookmark(
          entity.questId,
          <BigInt>milestone.milestoneId,
          <BigInt>currentVideo.profileId,
          <BigInt>currentVideo.pubId,
        );

        videos.push(
          allVideos[j].toString() +
            entity.questId.toString() +
            (<BigInt>milestone.milestoneId).toString(),
        );
      }

      currentVideo.save();
    }

    let rewards: Array<string> = [];

    const rewardLength = questData.getMilestoneRewardsLength(
      entity.questId,
      <BigInt>milestone.milestoneId,
    );

    milestone.rewardsLength = rewardLength;

    for (let j = 0; j < rewardLength.toI32(); j++) {
      let currentReward = new Reward(milestoneURI + j.toString());

      currentReward.amount = questData.getMilestoneRewardTokenAmount(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestone.milestoneId,
      );
      currentReward.tokenAddress = questData.getMilestoneRewardTokenAddress(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestone.milestoneId,
      );
      currentReward.type = BigInt.fromI32(
        questData.getMilestoneRewardType(
          entity.questId,
          BigInt.fromI32(j),
          <BigInt>milestone.milestoneId,
        ),
      );
      currentReward.uri = questData.getMilestoneRewardURI(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestone.milestoneId,
      );

      if (currentReward.uri) {
        const hash = (<string>currentReward.uri).split("/").pop();
        currentReward.rewardMetadata = hash;
        QuestMetadataTemplate.create(hash);
      }

      currentReward.save();
      rewards.push(milestoneURI + j.toString());
    }

    milestone.rewards = rewards;
    milestone.videos = videos;

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
