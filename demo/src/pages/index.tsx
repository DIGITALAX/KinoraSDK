"use client";
 
import {
  Player,
  LivepeerConfig,
  createReactClient,
  studioProvider,
} from "@livepeer/react"; 
import React, { useState } from "react";
import dynamic from "next/dynamic";

const KinoraPlayerWrapper = dynamic(
  () => import('kinora-sdk').then((mod) => mod.KinoraPlayerWrapper),
  { ssr: false }  
);

const client = createReactClient({ 
  provider: studioProvider({
    apiKey: process.env.REACT_APP_LIVEPEER_STUDIO_KEY!,
  }), 
});

export default function Home() {
  const [seekTo, setSeekTo] = useState<{
    time: number;
    id: number;
  }>({ time: 0, id: 0 });
  const [volume, setVolume] = useState<{
    level: number;
    id: number;
  }>({ level: 0.5, id: 0 });
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volumeOpen, setVolumeOpen] = useState<boolean>(false);
  const [fullScreen, setFullScreen] = useState<boolean>(false);

  const handleSeek = (e: Event) => {
    const progressRect = (e as any).currentTarget.getBoundingClientRect();
    const seekPosition =
      ((e as any).clientX - progressRect.left) / progressRect.width;
    setSeekTo({ time: seekPosition * duration, id: Math.random() });
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: Event) => {
    setVolume({ level: Number((e.target as any).value), id: Math.random() });
  };

  return (
    <div className="bg-black w-full h-screen flex flex-col items-center justify-center">
      <LivepeerConfig client={client}>
        <div className="flex items-center justify-center w-2/3 h-2/3 gap-4 flex-col">
          <div className="flex w-full h-full border-white border">
            <KinoraPlayerWrapper
              onSeeking={handleSeek}
              onSeeked={handleSeek}
              volume={volume}
              seekTo={seekTo}
              play={isPlaying} 
              fillWidthHeight 
              fullscreen={fullScreen} 
              customControls={true}
              onTimeUpdate={(e) =>
                setCurrentTime((e.target as any).currentTime)
              }
              onCanPlayThrough={(e) => {
                setDuration((e.target as any).duration);
              }}
            >
              {(setMediaElement: (node: HTMLVideoElement) => void) => (
                <Player
                  mediaElementRef={setMediaElement}
                  playbackId="f5eese9wwl88k4g8"
                  objectFit="cover"
                />
              )}
            </KinoraPlayerWrapper>
          </div>
          <div className="relative w-full h-fit">
            <Controls
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              volumeOpen={volumeOpen}
              volume={volume.level}
              handleVolumeChange={handleVolumeChange}
              handleSeek={handleSeek}
              setVolumeOpen={setVolumeOpen}
              handleTogglePlay={handleTogglePlay}
              fullScreen={fullScreen}
              setFullScreen={setFullScreen}
            />
          </div>
        </div>
      </LivepeerConfig>
    </div>
  );
}

const Controls = ({
  currentTime,
  duration,
  isPlaying,
  volumeOpen,
  volume,
  handleVolumeChange,
  handleSeek,
  setVolumeOpen,
  handleTogglePlay,
  fullScreen,
  setFullScreen,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volumeOpen: boolean;
  volume: number;
  handleVolumeChange: (e: Event) => void;
  handleSeek: (e: Event) => void;
  setVolumeOpen: (e: boolean) => void;
  handleTogglePlay: () => void;
  fullScreen: boolean;
  setFullScreen: (e: boolean) => void;
}) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  return (
    <div
      className={`relative h-fit flex w-full gap-3 items-center galaxy:px-2 justify-center flex-col md:flex-row`}
    >
      <div
        className={`relative w-fit h-full flex justify-center items-center gap-3 md:w-56`}
      >
        <div className="relative flex flex-row w-full h-full items-center">
          <div
            className="relative w-4 h-4 cursor-pointer flex"
            onClick={() => setFullScreen(!fullScreen)}
          >
            <img
              src={`https://chromadin.infura-ipfs.io/ipfs/QmVpncAteeF7voaGu1ZV5qP63UpZW2xmiCWVftL1QnL5ja`}
            />
          </div>
        </div>
        <div className="relative w-fit h-full flex items-center font-digi text-base text-white">
          <span className="text-rosa">{formatTime(currentTime)}</span>/
          <span className="text-light">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <div
          className="relative w-full h-2 bg-white/40 rounded-sm cursor-pointer"
          onClick={(e: any) => handleSeek(e)}
        >
          <div
            className="absolute h-full bg-white/80 rounded-sm"
            style={{
              width: `${(currentTime / duration) * 100}%`,
            }}
          />
        </div>
      </div>
      <div
        className={`relative w-fit flex flex-row gap-3 items-center justify-center md:justify-end`}
      >
        <div
          className="relative cursor-pointer w-3 h-3 flex items-center justify-center"
          onClick={() => handleTogglePlay()}
        >
          <img
            src={`https://chromadin.infura-ipfs.io/ipfs/${
              isPlaying
                ? "Qmbg8t4xoNywhtCexD5Ln5YWvcKMXGahfwyK6UHpR3nBip"
                : "QmXw52mJFnzYXmoK8eExoHKv7YW9RBVEwSFtfvxXgy7sfp"
            }`}
          />
        </div>

        <div
          className="relative cursor-pointer w-3 h-3 flex items-center justify-center"
          onClick={() => setVolumeOpen(!volumeOpen)}
        >
          <img
            src={`https://chromadin.infura-ipfs.io/ipfs/${
              volume === 0
                ? "QmVVzvq68RwGZFi46yKEthuG6PXQf74BaMW4yCrZCkgtzK"
                : "Qme1i88Yd1x4SJfgrSCFyXp7GELCZRnnPQeFUt6jbfPbqL"
            }`}
          />
        </div>
        {volumeOpen && (
          <input
            className="absolute w-40 h-fit bottom-10 z-50"
            type="range"
            value={volume}
            max={1}
            min={0}
            step={0.1}
            onChange={(e: any) => handleVolumeChange(e)}
          />
        )}
      </div>
    </div>
  );
};
