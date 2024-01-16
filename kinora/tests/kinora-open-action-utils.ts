import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  NewFactoryDeployment,
  PlayerCompletedMilestone,
  PlayerCompletedQuest,
  PlayerJoinedQuest,
  QuestInitialized
} from "../generated/KinoraOpenAction/KinoraOpenAction"

export function createNewFactoryDeploymentEvent(
  kac: Address,
  ke: Address,
  kqd: Address,
  km: Address,
  knc: Address
): NewFactoryDeployment {
  let newFactoryDeploymentEvent = changetype<NewFactoryDeployment>(
    newMockEvent()
  )

  newFactoryDeploymentEvent.parameters = new Array()

  newFactoryDeploymentEvent.parameters.push(
    new ethereum.EventParam("kac", ethereum.Value.fromAddress(kac))
  )
  newFactoryDeploymentEvent.parameters.push(
    new ethereum.EventParam("ke", ethereum.Value.fromAddress(ke))
  )
  newFactoryDeploymentEvent.parameters.push(
    new ethereum.EventParam("kqd", ethereum.Value.fromAddress(kqd))
  )
  newFactoryDeploymentEvent.parameters.push(
    new ethereum.EventParam("km", ethereum.Value.fromAddress(km))
  )
  newFactoryDeploymentEvent.parameters.push(
    new ethereum.EventParam("knc", ethereum.Value.fromAddress(knc))
  )

  return newFactoryDeploymentEvent
}

export function createPlayerCompletedMilestoneEvent(
  questId: BigInt,
  milestoneId: BigInt,
  playerAddress: Address
): PlayerCompletedMilestone {
  let playerCompletedMilestoneEvent = changetype<PlayerCompletedMilestone>(
    newMockEvent()
  )

  playerCompletedMilestoneEvent.parameters = new Array()

  playerCompletedMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  playerCompletedMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "milestoneId",
      ethereum.Value.fromUnsignedBigInt(milestoneId)
    )
  )
  playerCompletedMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "playerAddress",
      ethereum.Value.fromAddress(playerAddress)
    )
  )

  return playerCompletedMilestoneEvent
}

export function createPlayerCompletedQuestEvent(
  questId: BigInt,
  pubId: BigInt,
  profileId: BigInt,
  envokerAddress: Address
): PlayerCompletedQuest {
  let playerCompletedQuestEvent = changetype<PlayerCompletedQuest>(
    newMockEvent()
  )

  playerCompletedQuestEvent.parameters = new Array()

  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam("pubId", ethereum.Value.fromUnsignedBigInt(pubId))
  )
  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "profileId",
      ethereum.Value.fromUnsignedBigInt(profileId)
    )
  )
  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "envokerAddress",
      ethereum.Value.fromAddress(envokerAddress)
    )
  )

  return playerCompletedQuestEvent
}

export function createPlayerJoinedQuestEvent(
  playerProfileId: BigInt,
  questId: BigInt
): PlayerJoinedQuest {
  let playerJoinedQuestEvent = changetype<PlayerJoinedQuest>(newMockEvent())

  playerJoinedQuestEvent.parameters = new Array()

  playerJoinedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfileId",
      ethereum.Value.fromUnsignedBigInt(playerProfileId)
    )
  )
  playerJoinedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )

  return playerJoinedQuestEvent
}

export function createQuestInitializedEvent(
  questId: BigInt,
  pubId: BigInt,
  profileId: BigInt,
  envokerAddress: Address
): QuestInitialized {
  let questInitializedEvent = changetype<QuestInitialized>(newMockEvent())

  questInitializedEvent.parameters = new Array()

  questInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  questInitializedEvent.parameters.push(
    new ethereum.EventParam("pubId", ethereum.Value.fromUnsignedBigInt(pubId))
  )
  questInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "profileId",
      ethereum.Value.fromUnsignedBigInt(profileId)
    )
  )
  questInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "envokerAddress",
      ethereum.Value.fromAddress(envokerAddress)
    )
  )

  return questInitializedEvent
}
