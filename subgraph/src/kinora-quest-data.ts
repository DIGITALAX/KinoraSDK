import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  store,
} from "@graphprotocol/graph-ts";
import {
  KinoraQuestData,
  MilestoneCompleted as MilestoneCompletedEvent,
  QuestCompleted as QuestCompletedEvent,
  PlayerEligibleToClaimMilestone as PlayerEligibleToClaimMilestoneEvent,
  PlayerJoinedQuest as PlayerJoinedQuestEvent,
  PlayerMetricsUpdated as PlayerMetricsUpdatedEvent,
  QuestInstantiated as QuestInstantiatedEvent,
  QuestStatusUpdated as QuestStatusUpdatedEvent,
  QuestDeleted as QuestDeletedEvent,
} from "../generated/templates/KinoraQuestData/KinoraQuestData";
import { QuestMetadata as QuestMetadataTemplate } from "../generated/templates";
import {
  MilestoneCompleted,
  PlayerEligibleToClaimMilestone,
  PlayerJoinedQuest,
  QuestCompleted,
  QuestDeleted,
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
  entity.id = Bytes.fromByteArray(
    ByteArray.fromHexString(event.params.playerProfile.toString()),
  );
  entity.questId = event.params.questId;
  entity.playerProfile = event.params.playerProfile;
  entity.milestone = event.params.milestone;
  entity.contractAddress = event.address;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    event.params.playerProfile.toString() + event.address.toHexString(),
  );

  let questData = KinoraQuestData.bind(event.address);
  const uri = questData.getQuestURI(entity.questId);

  if (currentPlayer) {
    let currentEligible = new Eligible(
      event.params.milestone.toString() +
        event.params.playerProfile.toString() +
        event.params.questId.toString() +
        uri +
        event.address.toHexString(),
    );

    currentEligible.status = false;

    currentEligible.save();

    let currentCompleted = new CompletionActivity(
      event.params.milestone.toString() +
        event.params.playerProfile.toString() +
        event.params.questId.toString() +
        uri +
        event.address.toHexString(),
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
        event.params.playerProfile.toString() +
        event.params.questId.toString() +
        uri +
        event.address.toHexString(),
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
  entity.playerProfile = event.params.playerProfile;
  entity.contractAddress = event.address;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    event.params.playerProfile.toString() + event.address.toHexString(),
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
  entity.playerProfile = event.params.playerProfile;
  entity.questId = event.params.questId;
  entity.milestone = event.params.milestone;
  entity.eligibility = event.params.eligibility;
  entity.contractAddress = event.address;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    event.params.playerProfile.toString() + event.address.toHexString(),
  );

  let questData = KinoraQuestData.bind(event.address);
  const uri = questData.getQuestURI(entity.questId);

  if (currentPlayer) {
    let currentEligible = new Eligible(
      event.params.milestone.toString() +
        event.params.playerProfile.toString() +
        event.params.questId.toString() +
        uri +
        event.address.toHexString(),
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
        event.params.playerProfile.toString() +
        event.params.questId.toString() +
        uri +
        event.address.toHexString(),
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
    ByteArray.fromHexString(event.params.playerProfile.toString()),
  );
  entity.contractAddress = event.address;
  entity.questId = event.params.questId;
  entity.playerProfile = event.params.playerProfile;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    event.params.playerProfile.toString() + event.address.toHexString(),
  );

  if (!currentPlayer) {
    currentPlayer = new Player(
      event.params.playerProfile.toString() + event.address.toHexString(),
    );
    currentPlayer.playerProfile = event.params.playerProfile;
    currentPlayer.contractAddress = event.address;
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
    event.params.questId.toString() + event.address.toHexString(),
  );

  if (quest) {
    let players: Array<string> | null = quest.players;

    if (!players) {
      players = [];
    }

    players.push(
      event.params.playerProfile.toString() + event.address.toHexString(),
    );
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
  entity.id = Bytes.fromByteArray(
    ByteArray.fromHexString(event.params.playerProfile.toString()),
  );
  entity.contractAddress = event.address;
  entity.playerProfile = event.params.playerProfile;
  entity.videoPostId = event.params.videoPostId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let currentPlayer = Player.load(
    event.params.playerProfile.toString() + event.address.toHexString(),
  );

  let questData = KinoraQuestData.bind(event.address);

  if (currentPlayer) {
    let currentVideo = new VideoActivity(
      entity.playerProfile.toString() +
        entity.videoPostId.toString() +
        event.address.toHexString(),
    );

    currentVideo.playerProfile = entity.playerProfile;
    currentVideo.contractAddress = event.address;
    currentVideo.postId = entity.videoPostId;
    currentVideo.playCount = questData.getPlayerVideoPlayCount(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.avd = questData.getPlayerVideoAVD(
      entity.playerProfile as Address,
      entity.videoPostId,
    );

    currentVideo.duration = questData.getPlayerVideoDuration(
      entity.playerProfile as Address,
      entity.videoPostId,
    );

    currentVideo.playerId = questData.getVideoPlaybackId(entity.videoPostId);

    currentVideo.mostReplayedArea = questData.getPlayerVideoMostReplayedArea(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.hasQuoted = questData.getPlayerVideoQuote(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.hasMirrored = questData.getPlayerVideoMirror(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.hasBookmarked = questData.getPlayerVideoBookmark(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.hasCommented = questData.getPlayerVideoComment(
      entity.playerProfile as Address,
      entity.videoPostId,
    );
    currentVideo.hasReacted = questData.getPlayerVideoReact(
      entity.playerProfile as Address,
      entity.videoPostId,
    );

    currentVideo.secondaryCollectOnComment =
      questData.getPlayerVideoSecondaryCollectOnComment(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryMirrorOnComment =
      questData.getPlayerVideoSecondaryMirrorOnComment(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryQuoteOnComment =
      questData.getPlayerVideoSecondaryQuoteOnComment(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryReactOnComment =
      questData.getPlayerVideoSecondaryReactOnComment(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryCommentOnComment =
      questData.getPlayerVideoSecondaryCommentOnComment(
        entity.playerProfile as Address,
        entity.videoPostId,
      );

    currentVideo.secondaryCollectOnQuote =
      questData.getPlayerVideoSecondaryCollectOnQuote(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryMirrorOnQuote =
      questData.getPlayerVideoSecondaryMirrorOnQuote(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryQuoteOnQuote =
      questData.getPlayerVideoSecondaryQuoteOnQuote(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryReactOnQuote =
      questData.getPlayerVideoSecondaryReactOnQuote(
        entity.playerProfile as Address,
        entity.videoPostId,
      );
    currentVideo.secondaryCommentOnQuote =
      questData.getPlayerVideoSecondaryCommentOnQuote(
        entity.playerProfile as Address,
        entity.videoPostId,
      );

    currentVideo.save();

    let videos: Array<string> | null = currentPlayer.videos;

    if (!videos) {
      videos = [];
    }
    videos.push(
      entity.playerProfile.toString() +
        entity.videoPostId.toString() +
        event.address.toHexString(),
    );

    currentPlayer.videos = videos;

    currentPlayer.save();
  }

  entity.save();
}

export function handleQuestInstantiated(event: QuestInstantiatedEvent): void {
  let entity = new QuestInstantiated(
    event.params.questId.toString() + event.address.toHexString(),
  );
  entity.questId = event.params.questId;
  entity.milestoneCount = event.params.milestoneCount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.contractAddress = event.address;

  let questData = KinoraQuestData.bind(event.address);

  entity.maxPlayerCount = questData.getQuestMaxPlayerCount(entity.questId);

  entity.postId = questData.getQuestPostId(entity.questId);
  entity.envoker = questData.getQuestEnvoker(entity.questId);

  entity.uri = questData.getQuestURI(entity.questId);
  entity.status = true;

  let rewardHash = "";

  if (entity.uri !== null) {
    let hash = entity.uri;

    if (hash.includes("ipfs://")) {
      hash = hash.split("/").pop();
    }
    if (hash !== null) {
      entity.questMetadata = hash;
      QuestMetadataTemplate.create(hash);
    }

    rewardHash = hash;
  }

  let outerGate = new Gate(entity.uri.split("/").pop());

  const addressesErc20 = questData.getQuestGatedERC20Addresses(entity.questId);
  const thresholdsErc20 = questData.getQuestGatedERC20Thresholds(
    entity.questId,
  );

  let erc20Logic: Array<string> = [];
  let erc721Logic: Array<string> = [];

  for (let h = 0; h < addressesErc20.length; h++) {
    if (h < thresholdsErc20.length) {
      let erc20 = new ERC20Logic(
        entity.uri.split("/").pop() +
          entity.questId.toString() +
          h.toString() +
          addressesErc20[h].toHexString() +
          entity.uri +
          event.address.toHexString(),
      );

      erc20.amount = thresholdsErc20[h];
      erc20.address = addressesErc20[h];
      erc20.contractAddress = event.address;
      erc20.save();

      erc20Logic.push(
        entity.uri.split("/").pop() +
          entity.questId.toString() +
          h.toString() +
          addressesErc20[h].toHexString() +
          entity.uri +
          event.address.toHexString(),
      );
    }
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
        addressesErc721[h].toHexString() +
        entity.uri +
        event.address.toHexString(),
    );

    erc721.address = addressesErc721[h];

    if (h < tokenIds.length && tokenIds[h]) {
      erc721.tokenIds = tokenIds[h];
    }

    if (h < tokenURIs.length && tokenURIs[h]) {
      erc721.uris = tokenURIs[h];
    }
    erc721.contractAddress = event.address;
    erc721.save();
    erc721Logic.push(
      entity.uri.split("/").pop() +
        entity.questId.toString() +
        h.toString() +
        addressesErc721[h].toHexString() +
        entity.uri +
        event.address.toHexString(),
    );
  }

  outerGate.erc20Logic = erc20Logic;
  outerGate.erc721Logic = erc721Logic;

  outerGate.oneOf = questData.getQuestGatedOneOf(entity.questId);
  outerGate.contractAddress = event.address;
  outerGate.save();

  entity.gate = entity.uri.split("/").pop();

  let milestones: Array<string> = [];

  for (let i = 0; i < entity.milestoneCount.toI32(); i++) {
    let milestoneCounter = BigInt.fromI32(i + 1);

    let milestoneURI = questData.getMilestoneURI(
      entity.questId,
      <BigInt>milestoneCounter,
    );
    if (milestoneURI.includes("ipfs://")) {
      milestoneURI = milestoneURI.split("/").pop();
    }
    let milestoneId =
      (i + 1 + entity.questId.toI32()).toString() +
      milestoneURI +
      event.address.toHexString();

    let milestone = new Milestone(milestoneId);
    milestone.milestoneId = <BigInt>milestoneCounter;
    milestone.contractAddress = event.address;
    milestone.questId = entity.questId;

    if (milestoneURI !== null) {
      milestone.uri = milestoneURI;
      milestone.milestoneMetadata = milestoneURI;
      QuestMetadataTemplate.create(milestoneURI);
    }

    let gated = new Gate(
      milestoneURI + milestoneId + event.address.toHexString(),
    );

    const addressesErc20 = questData.getMilestoneGatedERC20Addresses(
      entity.questId,
      <BigInt>milestoneCounter,
    );
    const thresholdsErc20 = questData.getMilestoneGatedERC20Thresholds(
      entity.questId,
      <BigInt>milestoneCounter,
    );

    let erc20Logic: Array<string> = [];
    let erc721Logic: Array<string> = [];

    for (let h = 0; h < addressesErc20.length; h++) {
      let erc20 = new ERC20Logic(
        milestoneId +
          h.toString() +
          addressesErc20[h].toHexString() +
          milestoneURI +
          event.address.toHexString(),
      );
      erc20.contractAddress = event.address;
      erc20.amount = thresholdsErc20[h];
      erc20.address = addressesErc20[h];
      erc20.save();

      erc20Logic.push(
        milestoneId +
          h.toString() +
          addressesErc20[h].toHexString() +
          milestoneURI +
          event.address.toHexString(),
      );
    }

    const addressesErc721 = questData.getMilestoneGatedERC721Addresses(
      entity.questId,
      <BigInt>milestoneCounter,
    );
    let tokenIds = questData.getMilestoneGatedERC721TokenIds(
      entity.questId,
      <BigInt>milestoneCounter,
    );
    let tokenURIs = questData.getMilestoneGatedERC721TokenURIs(
      entity.questId,
      <BigInt>milestoneCounter,
    );

    if (!tokenIds) {
      tokenIds = [];
    }

    if (!tokenURIs) {
      tokenURIs = [];
    }

    for (let h = 0; h < addressesErc721.length; h++) {
      let erc721 = new ERC721Logic(
        milestoneId +
          h.toString() +
          addressesErc721[h].toHexString() +
          milestoneURI +
          event.address.toHexString(),
      );

      erc721.address = addressesErc721[h];

      if (h < tokenIds.length && tokenIds[h]) {
        erc721.tokenIds = tokenIds[h];
      }

      if (h < tokenURIs.length && tokenURIs[h]) {
        erc721.uris = tokenURIs[h];
      }
      erc721.contractAddress = event.address;
      erc721.save();
      erc721Logic.push(
        milestoneId +
          h.toString() +
          addressesErc721[h].toHexString() +
          milestoneURI +
          event.address.toHexString(),
      );
    }

    gated.erc20Logic = erc20Logic;
    gated.erc721Logic = erc721Logic;

    gated.oneOf = questData.getMilestoneGatedOneOf(
      entity.questId,
      <BigInt>milestoneCounter,
    );
    gated.contractAddress = event.address;
    gated.save();

    milestone.gated = milestoneURI + milestoneId + event.address.toHexString();
    milestone.videoLength = questData.getMilestoneVideoLength(
      entity.questId,
      <BigInt>milestoneCounter,
    );

    let videos: Array<string> = [];
    const allVideos = questData.getMilestoneVideos(
      entity.questId,
      <BigInt>milestoneCounter,
    );

    for (let j = 0; j < allVideos.length; j++) {
      let currentVideo = new Video(
        allVideos[j].toString() +
          entity.questId.toString() +
          (<BigInt>milestoneCounter).toString() +
          event.address.toHexString(),
      );
      currentVideo.questId = entity.questId;
      currentVideo.contractAddress = event.address;
      currentVideo.postId = allVideos[j];

      if (<BigInt>currentVideo.postId) {
        currentVideo.playerId = questData.getVideoPlaybackId(
          <BigInt>currentVideo.postId,
        );

        currentVideo.minPlayCount = questData.getMilestoneVideoMinPlayCount(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.minAVD = questData.getMilestoneVideoMinAVD(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.minSecondaryQuoteOnQuote =
          questData.getMilestoneVideoMinSecondaryQuoteOnQuote(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryMirrorOnQuote =
          questData.getMilestoneVideoMinSecondaryMirrorOnQuote(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryReactOnQuote =
          questData.getMilestoneVideoMinSecondaryReactOnQuote(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryCommentOnQuote =
          questData.getMilestoneVideoMinSecondaryCommentOnQuote(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryCollectOnQuote =
          questData.getMilestoneVideoMinSecondaryCollectOnQuote(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryQuoteOnComment =
          questData.getMilestoneVideoMinSecondaryQuoteOnComment(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryMirrorOnComment =
          questData.getMilestoneVideoMinSecondaryMirrorOnComment(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryReactOnComment =
          questData.getMilestoneVideoMinSecondaryReactOnComment(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryCommentOnComment =
          questData.getMilestoneVideoMinSecondaryCommentOnComment(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minSecondaryCollectOnComment =
          questData.getMilestoneVideoMinSecondaryCollectOnComment(
            entity.questId,
            <BigInt>milestoneCounter,
            <BigInt>currentVideo.postId,
          );
        currentVideo.minDuration = questData.getMilestoneVideoMinDuration(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.quote = questData.getMilestoneVideoQuote(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.mirror = questData.getMilestoneVideoMirror(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.react = questData.getMilestoneVideoReact(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.comment = questData.getMilestoneVideoComment(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.bookmark = questData.getMilestoneVideoBookmark(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );
        currentVideo.factoryIds = questData.getMilestoneVideoFactoryIds(
          entity.questId,
          <BigInt>milestoneCounter,
          <BigInt>currentVideo.postId,
        );

        videos.push(
          allVideos[j].toString() +
            entity.questId.toString() +
            (<BigInt>milestoneCounter).toString() +
            event.address.toHexString(),
        );
      }

      currentVideo.save();
    }

    let rewards: Array<string> = [];

    const rewardLength = questData.getMilestoneRewardsLength(
      entity.questId,
      <BigInt>milestoneCounter,
    );

    milestone.rewardsLength = rewardLength;

    for (let j = 0; j < rewardLength.toI32(); j++) {
      let currentReward = new Reward(
        milestoneURI + j.toString() + event.address.toHexString(),
      );

      currentReward.amount = questData.getMilestoneRewardTokenAmount(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestoneCounter,
      );
      currentReward.questMetadata = rewardHash;
      currentReward.questURI = entity.uri;
      currentReward.postId = entity.postId;
      currentReward.questId = entity.questId;
      currentReward.milestone = milestone.milestoneId;
      currentReward.tokenAddress = questData.getMilestoneRewardTokenAddress(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestoneCounter,
      );
      currentReward.type = BigInt.fromI32(
        questData.getMilestoneRewardType(
          entity.questId,
          BigInt.fromI32(j),
          <BigInt>milestoneCounter,
        ),
      );
      currentReward.uri = questData.getMilestoneRewardURI(
        entity.questId,
        BigInt.fromI32(j),
        <BigInt>milestoneCounter,
      );

      if (currentReward.uri) {
        const hash = (<string>currentReward.uri).split("/").pop();
        currentReward.rewardMetadata = hash;
        QuestMetadataTemplate.create(hash);
      }

      currentReward.contractAddress = event.address;
      currentReward.save();
      rewards.push(milestoneURI + j.toString() + event.address.toHexString());
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
    event.params.questId.toString() + event.address.toHexString(),
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

export function handleQuestDeleted(event: QuestDeletedEvent): void {
  let entity = new QuestDeleted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.questId = event.params.questId;

  let quest = QuestInstantiated.load(
    event.params.questId.toString() + event.address.toHexString(),
  );

  if (quest) {
    store.remove("QuestMetadata", quest.uri);
    const gated = Gate.load(<string>quest.gate);
    if (gated) {
      let logic20: Array<string> | null = gated.erc20Logic;
      if (<Array<string>>logic20 && (<Array<string>>logic20).length > 0) {
        for (let h = 0; h < (<Array<string>>logic20).length; h++) {
          store.remove("ERC20Logic", (<Array<string>>logic20)[h]);
        }
      }
      let logic721: Array<string> | null = gated.erc721Logic;
      if (<Array<string>>logic721 && (<Array<string>>logic721).length > 0) {
        for (let h = 0; h < (<Array<string>>logic721).length; h++) {
          store.remove("ERC721Logic", (<Array<string>>logic721)[h]);
        }
      }
    }
    store.remove("Gate", <string>quest.gate);
    let allMilestones: Array<string> | null = quest.milestones;
    if (allMilestones) {
      for (let i = 0; i < quest.milestoneCount.toI32(); i++) {
        let milestoneId: string | null = (<Array<string>>allMilestones)[i];
        if (milestoneId) {
          let milestone = Milestone.load(<string>milestoneId);

          if (milestone) {
            const gated = Gate.load(<string>milestone.gated);
            if (gated) {
              let logic20: Array<string> | null = gated.erc20Logic;
              if (
                <Array<string>>logic20 &&
                (<Array<string>>logic20).length > 0
              ) {
                for (let h = 0; h < (<Array<string>>logic20).length; h++) {
                  store.remove("ERC20Logic", (<Array<string>>logic20)[h]);
                }
              }
              let logic721: Array<string> | null = gated.erc721Logic;
              if (
                <Array<string>>logic721 &&
                (<Array<string>>logic721).length > 0
              ) {
                for (let h = 0; h < (<Array<string>>logic721).length; h++) {
                  store.remove("ERC721Logic", (<Array<string>>logic721)[h]);
                }
              }
            }
            store.remove("Gate", <string>milestone.gated);
            store.remove("QuestMetadata", <string>milestone.uri);

            let rewards: Array<string> | null = milestone.rewards;
            if (rewards) {
              if (<BigInt | null>milestone.rewardsLength) {
                for (
                  let j = 0;
                  j < (<BigInt>milestone.rewardsLength).toI32();
                  j++
                ) {
                  store.remove("Reward", (<Array<string>>milestone.rewards)[j]);
                }
              }
            }

            let videos: Array<string> | null = milestone.videos;
            if (videos) {
              if (<BigInt | null>milestone.videoLength) {
                for (
                  let j = 0;
                  j < (<BigInt>milestone.videoLength).toI32();
                  j++
                ) {
                  store.remove("Video", (<Array<string>>milestone.videos)[j]);
                }
              }
            }
          }
          store.remove("Milestone", milestoneId);
        }
      }
    }
    store.remove(
      "QuestInstantiated",
      event.params.questId.toString() + event.address.toHexString(),
    );
  }

  entity.contractAddress = event.address;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
