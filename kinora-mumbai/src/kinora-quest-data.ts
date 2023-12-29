import {
  MilestoneCompleted as MilestoneCompletedEvent,
  PlayerEligibleToClaimMilestone as PlayerEligibleToClaimMilestoneEvent,
  PlayerJoinedQuest as PlayerJoinedQuestEvent,
  PlayerMetricsUpdated as PlayerMetricsUpdatedEvent,
  QuestInstantiated as QuestInstantiatedEvent,
  QuestStatusUpdated as QuestStatusUpdatedEvent
} from "../generated/KinoraQuestData/KinoraQuestData"
import {
  MilestoneCompleted,
  PlayerEligibleToClaimMilestone,
  PlayerJoinedQuest,
  PlayerMetricsUpdated,
  QuestInstantiated,
  QuestStatusUpdated
} from "../generated/schema"

export function handleMilestoneCompleted(event: MilestoneCompletedEvent): void {
  let entity = new MilestoneCompleted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.playerProfileId = event.params.playerProfileId
  entity.milestone = event.params.milestone

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerEligibleToClaimMilestone(
  event: PlayerEligibleToClaimMilestoneEvent
): void {
  let entity = new PlayerEligibleToClaimMilestone(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerProfileId = event.params.playerProfileId
  entity.questId = event.params.questId
  entity.milestone = event.params.milestone
  entity.eligibility = event.params.eligibility

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerJoinedQuest(event: PlayerJoinedQuestEvent): void {
  let entity = new PlayerJoinedQuest(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.playerProfileId = event.params.playerProfileId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerMetricsUpdated(
  event: PlayerMetricsUpdatedEvent
): void {
  let entity = new PlayerMetricsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerProfileId = event.params.playerProfileId
  entity.videoPubId = event.params.videoPubId
  entity.videoProfileId = event.params.videoProfileId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuestInstantiated(event: QuestInstantiatedEvent): void {
  let entity = new QuestInstantiated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.milestoneCount = event.params.milestoneCount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuestStatusUpdated(event: QuestStatusUpdatedEvent): void {
  let entity = new QuestStatusUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.status = event.params.status

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
