import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { NewFactoryDeployment } from "../generated/schema"
import { NewFactoryDeployment as NewFactoryDeploymentEvent } from "../generated/KinoraOpenAction/KinoraOpenAction"
import { handleNewFactoryDeployment } from "../src/kinora-open-action"
import { createNewFactoryDeploymentEvent } from "./kinora-open-action-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let kac = Address.fromString("0x0000000000000000000000000000000000000001")
    let ke = Address.fromString("0x0000000000000000000000000000000000000001")
    let kqd = Address.fromString("0x0000000000000000000000000000000000000001")
    let km = Address.fromString("0x0000000000000000000000000000000000000001")
    let knc = Address.fromString("0x0000000000000000000000000000000000000001")
    let newNewFactoryDeploymentEvent = createNewFactoryDeploymentEvent(
      kac,
      ke,
      kqd,
      km,
      knc
    )
    handleNewFactoryDeployment(newNewFactoryDeploymentEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("NewFactoryDeployment created and stored", () => {
    assert.entityCount("NewFactoryDeployment", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "NewFactoryDeployment",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "kac",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "NewFactoryDeployment",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "ke",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "NewFactoryDeployment",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "kqd",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "NewFactoryDeployment",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "km",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "NewFactoryDeployment",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "knc",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
