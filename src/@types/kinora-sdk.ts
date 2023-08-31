import { PlayerProps } from "@livepeer/react";
import { HlsVideoConfig } from "livepeer/media/browser/hls";
import { WebRTCVideoConfig } from "livepeer/media/browser/webrtc";
import { ControlsOptions } from "livepeer/media/browser";

export type LivepeerPlayer<TPlaybackPolicyObject extends object, TSlice> = {
  on: (eventName: string, callback: Function) => void;
  props: PlayerProps<TPlaybackPolicyObject, TSlice>;
  showPipButton?: boolean;
  controls?: ControlsOptions;
  hlsConfig?: HlsVideoConfig;
  lowLatency?: boolean | "force";
  webrtcConfig?: WebRTCVideoConfig;
  allowCrossOriginCredentials?: boolean;
  tabIndex?: number;
};

export const ChainIds: { [key: string]: number } = {
  polygon: 137,
  mumbai: 80001,
};
