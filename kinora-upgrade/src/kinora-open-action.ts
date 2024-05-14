import {
  NewFactoryDeployment as NewFactoryDeploymentEvent,
  PlayerCompletedMilestone as PlayerCompletedMilestoneEvent,
  PlayerCompletedQuest as PlayerCompletedQuestEvent,
  PlayerJoinedQuest as PlayerJoinedQuestEvent,
  QuestInitialized as QuestInitializedEvent
} from "../generated/KinoraOpenAction/KinoraOpenAction"
import {
  NewFactoryDeployment,
  PlayerCompletedMilestone,
  PlayerCompletedQuest,
  PlayerJoinedQuest,
  QuestInitialized
} from "../generated/schema"

export function handleNewFactoryDeployment(
  event: NewFactoryDeploymentEvent
): void {
  let entity = new NewFactoryDeployment(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.kac = event.params.kac
  entity.ke = event.params.ke
  entity.kqd = event.params.kqd
  entity.km = event.params.km
  entity.knc = event.params.knc

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerCompletedMilestone(
  event: PlayerCompletedMilestoneEvent
): void {
  let entity = new PlayerCompletedMilestone(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.milestoneId = event.params.milestoneId
  entity.playerAddress = event.params.playerAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerCompletedQuest(
  event: PlayerCompletedQuestEvent
): void {
  let entity = new PlayerCompletedQuest(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.pubId = event.params.pubId
  entity.profileId = event.params.profileId
  entity.envokerAddress = event.params.envokerAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlayerJoinedQuest(event: PlayerJoinedQuestEvent): void {
  let entity = new PlayerJoinedQuest(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.playerProfileId = event.params.playerProfileId
  entity.questId = event.params.questId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleQuestInitialized(event: QuestInitializedEvent): void {
  let entity = new QuestInitialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.questId = event.params.questId
  entity.pubId = event.params.pubId
  entity.profileId = event.params.profileId
  entity.envokerAddress = event.params.envokerAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
