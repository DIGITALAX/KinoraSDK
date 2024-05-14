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
    let images = value.get("images");
    if (images && images.kind === JSONValueKind.ARRAY) {
      metadata.images = images
        .toArray()
        .filter(
          item =>
            item.kind === JSONValueKind.STRING &&
            !item.toString().includes("base64"),
        )
        .map<string>(item => item.toString());
    }
    let video = value.get("video");
    if (
      video &&
      video.kind === JSONValueKind.STRING &&
      !video.toString().includes("base64")
    ) {
      metadata.video = video.toString();
    }
    let audio = value.get("audio");
    if (
      audio &&
      audio.kind === JSONValueKind.STRING &&
      !audio.toString().includes("base64")
    ) {
      metadata.audio = audio.toString();
    }
    let mediaCover = value.get("cover");
    if (
      mediaCover &&
      mediaCover.kind === JSONValueKind.STRING &&
      !mediaCover.toString().includes("base64")
    ) {
      metadata.mediaCover = mediaCover.toString();
    }

    let mediaType = value.get("mediaType");
    if (
      mediaType &&
      mediaType.kind === JSONValueKind.STRING &&
      !mediaType.toString().includes("base64")
    ) {
      metadata.mediaType = mediaType.toString();
    }
    let videoCovers = value.get("videoCovers");
    if (videoCovers && videoCovers.kind === JSONValueKind.ARRAY) {
      metadata.videoCovers = videoCovers
        .toArray()
        .filter(
          item =>
            item.kind === JSONValueKind.STRING &&
            !item.toString().includes("base64"),
        )
        .map<string>(item => item.toString());
    }
    let prompt = value.get("prompt");
    if (prompt && prompt.kind === JSONValueKind.STRING) {
      metadata.prompt = prompt.toString();
    }
    // let tags = value.get("tags");
    // if (tags && tags.kind === JSONValueKind.STRING) {
    //   metadata.tags = tags.toString();
    // }

    metadata.save();
  }
}
