import { NewFactoryDeployment as NewFactoryDeploymentEvent } from "../generated/KinoraOpenAction/KinoraOpenAction";
import { NewFactoryDeployment } from "../generated/schema";
import { KinoraQuestData } from "../generated/templates";

export function handleNewFactoryDeployment(
  event: NewFactoryDeploymentEvent,
): void {
  let entity = new NewFactoryDeployment(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.kac = event.params.kac;
  entity.ke = event.params.ke;
  entity.kqd = event.params.kqd;
  entity.km = event.params.km;
  entity.knc = event.params.knc;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  KinoraQuestData.create(event.params.kqd);
}
