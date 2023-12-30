import {
  Bytes,
  JSONValueKind,
  dataSource,
  json,
} from "@graphprotocol/graph-ts";
import { QuestMetadata } from "../generated/schema";

export function handleQuestMetadata(content: Bytes): void {
  let metadata = new QuestMetadata(dataSource.stringParam());
  const value = json.fromString(content.toString()).toObject();
  if (value) {
    let cover = value.get("cover");
    if (cover && cover.kind === JSONValueKind.STRING) {
      metadata.cover = cover.toString();
    }
    let title = value.get("title");
    if (title && title.kind === JSONValueKind.STRING) {
      metadata.title = title.toString();
    }
    let description = value.get("description");
    if (description && description.kind === JSONValueKind.STRING) {
      metadata.description = description.toString();
    }

    metadata.save();
  }
}
