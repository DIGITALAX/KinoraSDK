import { PlayerProps } from "@livepeer/react";
import { HlsVideoConfig } from "livepeer/media/browser/hls";
import { WebRTCVideoConfig } from "livepeer/media/browser/webrtc";
import { ControlsOptions } from "livepeer/media/browser";
import {
  DiscordProvider,
  EthWalletProvider,
  GoogleProvider,
} from "@lit-protocol/lit-auth-client";

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

export type ContractABI = (
  | {
      inputs: { internalType: string; name: string; type: string }[];
      stateMutability: string;
      type: string;
      anonymous?: undefined;
      name?: undefined;
      outputs?: undefined;
    }
  | {
      anonymous: boolean;
      inputs: any[];
      name: string;
      type: string;
      stateMutability?: undefined;
      outputs?: undefined;
    }
  | {}
)[];

export type LitProvider = GoogleProvider | DiscordProvider | EthWalletProvider;
