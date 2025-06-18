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
  let newFactoryDeploymentEvent =
    changetype<NewFactoryDeployment>(newMockEvent())

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
  playerAddress: Address,
  questId: BigInt,
  milestoneId: BigInt
): PlayerCompletedMilestone {
  let playerCompletedMilestoneEvent =
    changetype<PlayerCompletedMilestone>(newMockEvent())

  playerCompletedMilestoneEvent.parameters = new Array()

  playerCompletedMilestoneEvent.parameters.push(
    new ethereum.EventParam(
      "playerAddress",
      ethereum.Value.fromAddress(playerAddress)
    )
  )
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

  return playerCompletedMilestoneEvent
}

export function createPlayerCompletedQuestEvent(
  envokerAddress: Address,
  questId: BigInt,
  postId: BigInt
): PlayerCompletedQuest {
  let playerCompletedQuestEvent =
    changetype<PlayerCompletedQuest>(newMockEvent())

  playerCompletedQuestEvent.parameters = new Array()

  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "envokerAddress",
      ethereum.Value.fromAddress(envokerAddress)
    )
  )
  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  playerCompletedQuestEvent.parameters.push(
    new ethereum.EventParam("postId", ethereum.Value.fromUnsignedBigInt(postId))
  )

  return playerCompletedQuestEvent
}

export function createPlayerJoinedQuestEvent(
  playerProfile: Address,
  questId: BigInt
): PlayerJoinedQuest {
  let playerJoinedQuestEvent = changetype<PlayerJoinedQuest>(newMockEvent())

  playerJoinedQuestEvent.parameters = new Array()

  playerJoinedQuestEvent.parameters.push(
    new ethereum.EventParam(
      "playerProfile",
      ethereum.Value.fromAddress(playerProfile)
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
  envokerAddress: Address,
  questId: BigInt,
  postId: BigInt
): QuestInitialized {
  let questInitializedEvent = changetype<QuestInitialized>(newMockEvent())

  questInitializedEvent.parameters = new Array()

  questInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "envokerAddress",
      ethereum.Value.fromAddress(envokerAddress)
    )
  )
  questInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "questId",
      ethereum.Value.fromUnsignedBigInt(questId)
    )
  )
  questInitializedEvent.parameters.push(
    new ethereum.EventParam("postId", ethereum.Value.fromUnsignedBigInt(postId))
  )

  return questInitializedEvent
}
