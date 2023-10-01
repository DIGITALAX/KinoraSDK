import "./App.css";
import {
  Player,
  LivepeerConfig,
  createReactClient,
  studioProvider,
} from "@livepeer/react";
import { useState } from "react";
// import PlayerWrapper from "./PlayerWrapper"
import { KinoraPlayerWrapper, Sequence } from "kinora-sdk";

const client = createReactClient({
  provider: studioProvider({
    apiKey: process.env.REACT_APP_LIVEPEER_STUDIO_KEY!,
  }),
});

const App = () => {
  const handlePlay = () => {
    console.log("Video is playing");
  };
  const [seekTo, setSeekTo] = useState({ time: 0, id: 0 });
  const [volume, setVolume] = useState({ level: 0.5, id: 0 });
  const [play, setPlay] = useState(false);
  const [pause, setPause] = useState(true);
  const handlePause = () => {
    console.log("Video is paused");
  };

  const handleSeek = (event: Event) => {
    console.log(`Video seeked to ${event.timeStamp} seconds`);
  };

  return (
    <LivepeerConfig client={client}>
      <div
        style={{
          height: 500,
          width: 300,
        }}
      >
        <KinoraPlayerWrapper
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeking={handleSeek}
          onSeeked={handleSeek}
          onVolumeChange={() => console.log("volume")}
          onTimeUpdate={() => console.log("time updated")}
          volume={volume}
          seekTo={seekTo}
          play={play}
          fillWidthHeight
          customControls={true}
        >
          {(setMediaElement) => (
            <Player
              mediaElementRef={setMediaElement}
              playbackId="f5eese9wwl88k4g8"
              objectFit="cover"
            />
          )}
        </KinoraPlayerWrapper>
        <>
          <SeekSlider setSeekTo={setSeekTo} maxTime={160} />
          <VolumeSlider setVolume={setVolume} />
          <PlayPauseButton setPlay={setPlay} setPause={setPause} />
        </>
      </div>
    </LivepeerConfig>
  );
};

export default App;

const SeekSlider = ({
  setSeekTo,
  maxTime,
}: {
  setSeekTo: (e: { time: number; id: number }) => void;
  maxTime: number;
}) => {
  const [value, setValue] = useState(0);

  const handleChange = (e: any) => {
    const newValue = parseInt(e.target.value, 10);
    setValue(newValue);
    setSeekTo({ time: newValue, id: Math.random() });
  };

  return (
    <div>
      <input
        type="range"
        min="0"
        max={maxTime}
        value={value}
        onChange={handleChange}
      />
      <span>{value}s</span>
    </div>
  );
};

const VolumeSlider = ({
  setVolume,
}: {
  setVolume: (e: { level: number; id: number }) => void;
}) => {
  const [value, setValue] = useState(50);

  const handleChange = (e: any) => {
    const newValue = parseInt(e.target.value, 10);
    setValue(newValue);
    setVolume({ level: newValue / 100, id: Math.random() });
  };

  return (
    <div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={handleChange}
      />
      <span>{value}%</span>
    </div>
  );
};

const PlayPauseButton = ({
  setPlay,
  setPause,
}: {
  setPlay: (e: boolean) => void;
  setPause: (e: boolean) => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    if (isPlaying) {
      setPause(true);
      setPlay(false);
    } else {
      setPlay(true);
      setPause(false);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
  );
};
