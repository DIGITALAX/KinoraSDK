import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt } from "@graphprotocol/graph-ts"
import { MilestoneCompleted } from "../generated/schema"
import { MilestoneCompleted as MilestoneCompletedEvent } from "../generated/KinoraQuestData/KinoraQuestData"
import { handleMilestoneCompleted } from "../src/kinora-quest-data"
import { createMilestoneCompletedEvent } from "./kinora-quest-data-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let questId = BigInt.fromI32(234)
    let playerProfileId = BigInt.fromI32(234)
    let milestone = BigInt.fromI32(234)
    let newMilestoneCompletedEvent = createMilestoneCompletedEvent(
      questId,
      playerProfileId,
      milestone
    )
    handleMilestoneCompleted(newMilestoneCompletedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("MilestoneCompleted created and stored", () => {
    assert.entityCount("MilestoneCompleted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "MilestoneCompleted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "questId",
      "234"
    )
    assert.fieldEquals(
      "MilestoneCompleted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "playerProfileId",
      "234"
    )
    assert.fieldEquals(
      "MilestoneCompleted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "milestone",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
