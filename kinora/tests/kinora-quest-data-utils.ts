import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt } from "@graphprotocol/graph-ts"
import {
  MilestoneCompleted,
  PlayerEligibleToClaimMilestone,
  PlayerJoinedQuest,
  PlayerMetricsUpdated,
  QuestCompleted,
  QuestInstantiated,
  QuestStatusUpdated
} from "../generated/KinoraQuestData/KinoraQuestData"

export function createMilestoneCompletedEvent(
  questId: BigInt,
  playerProfileId: BigInt,
  milestone: BigInt
): MilestoneCompleted {
  let milestoneCompletedEvent = changetype<MilestoneCompleted>(newMockEvent())

  milestoneCompletedEvent.parameters = new Array()

  milestoneCompletedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  milestoneCompletedEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )
  milestoneCompletedEvent.parameters.push(
    new ethereum.EventParam(
      "milestone",
      ethereum.Value.fromUnsignedBigInt(milestone)
    )
  )

  return milestoneCompletedEvent
}

export function createPlayerEligibleToClaimMilestoneEvent(
  playerProfileId: BigInt,
  questId: BigInt,
  milestone: BigInt,
  eligibility: boolean
): PlayerEligibleToClaimMilestone {
  let playerEligibleToClaimMilestoneEvent = changetype<
    PlayerEligibleToClaimMilestone
  >(newMockEvent())

  playerEligibleToClaimMilestoneEvent.parameters = new Array()

  playerEligibleToClaimMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )
  playerEligibleToClaimMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  playerEligibleToClaimMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "milestone",
      ethereum.Value.fromUnsignedBigInt(milestone)
    )
  )
  playerEligibleToClaimMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "eligibility",
      ethereum.Value.fromBoolean(eligibility)
    )
  )

  return playerEligibleToClaimMilestoneEvent
}

export function createPlayerJoinedQuestEvent(
  questId: BigInt,
  playerProfileId: BigInt
): PlayerJoinedQuest {
  let playerJoinedQuestEvent = changetype<PlayerJoinedQuest>(newMockEvent())

  playerJoinedQuestEvent.parameters = new Array()

  playerJoinedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  playerJoinedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )

  return playerJoinedQuestEvent
}

export function createPlayerMetricsUpdatedEvent(
  playerProfileId: BigInt,
  videoPubId: BigInt,
  videoProfileId: BigInt
): PlayerMetricsUpdated {
  let playerMetricsUpdatedEvent = changetype<PlayerMetricsUpdated>(
    newMockEvent()
  )

  playerMetricsUpdatedEvent.parameters = new Array()

  playerMetricsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )
  playerMetricsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "videoPubId",
      ethereum.Value.fromUnsignedBigInt(videoPubId)
    )
  )
  playerMetricsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "videoProfileId",
      ethereum.Value.fromUnsignedBigInt(videoProfileId)
    )
  )

  return playerMetricsUpdatedEvent
}

export function createQuestCompletedEvent(
  questId: BigInt,
  playerProfileId: BigInt
): QuestCompleted {
  let questCompletedEvent = changetype<QuestCompleted>(newMockEvent())

  questCompletedEvent.parameters = new Array()

  questCompletedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  questCompletedEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )

  return questCompletedEvent
}

export function createQuestInstantiatedEvent(
  questId: BigInt,
  milestoneCount: BigInt
): QuestInstantiated {
  let questInstantiatedEvent = changetype<QuestInstantiated>(newMockEvent())

  questInstantiatedEvent.parameters = new Array()

  questInstantiatedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  questInstantiatedEvent.parameters.push(
    new ethereum.EventParam(
      "milestoneCount",
      ethereum.Value.fromUnsignedBigInt(milestoneCount)
    )
  )

  return questInstantiatedEvent
}

export function createQuestStatusUpdatedEvent(
  questId: BigInt,
  status: i32
): QuestStatusUpdated {
  let questStatusUpdatedEvent = changetype<QuestStatusUpdated>(newMockEvent())

  questStatusUpdatedEvent.parameters = new Array()

  questStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  questStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "status",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(status))
    )
  )

  return questStatusUpdatedEvent
}
