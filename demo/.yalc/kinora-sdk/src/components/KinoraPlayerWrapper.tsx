import React, { useEffect, useCallback, useState } from "react";

type KinoraPlayerWrapperProps = {
  onPlay?: () => void;
  onPause?: () => void;
  onAbort?: (event: Event) => void;
  onCanPlay?: (event: Event) => void;
  onCanPlayThrough?: (event: Event) => void;
  onDurationChange?: (event: Event) => void;
  onEmptied?: (event: Event) => void;
  onEnded?: (event: Event) => void;
  onError?: (event: Event) => void;
  onLoadedData?: (event: Event) => void;
  onLoadedMetadata?: (event: Event) => void;
  onLoadStart?: (event: Event) => void;
  onPlaying?: (event: Event) => void;
  onProgress?: (event: Event) => void;
  onRateChange?: (event: Event) => void;
  onSeeked?: (event: Event) => void;
  onSeeking?: (event: Event) => void;
  onStalled?: (event: Event) => void;
  onSuspend?: (event: Event) => void;
  onTimeUpdate?: (event: Event) => void;
  onVolumeChange?: (event: Event) => void;
  onWaiting?: (event: Event) => void;
  onFullScreenChange?: (event: Event) => void;
  volume?: { level: number; id: number };
  seekTo?: { time: number; id: number };
  play?: boolean;
  pause?: boolean;
  fullscreen?: boolean;
  fillWidthHeight?: boolean;
  customControls?: boolean;
  children: (
    setMediaElement: (node: HTMLVideoElement) => void,
  ) => React.ReactNode;
};

const KinoraPlayerWrapper: React.FC<KinoraPlayerWrapperProps> = ({
  children,
  fullscreen = false,
  seekTo = { time: 0, id: Math.random() },
  volume = { level: 0.5, id: Math.random() },
  play = false,
  pause = true,
  customControls = true,
  fillWidthHeight = false,
  ...props
}) => {
  const mediaElementRef = React.useRef<HTMLVideoElement>(null);
  const [lastSeekId, setLastSeekId] = useState<number>(0);
  const [lastVolumeId, setLastVolumeId] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const eventProps: string[] = [
    "onAbort",
    "onCanPlay",
    "onCanPlayThrough",
    "onDurationChange",
    "onEmptied",
    "onEnded",
    "onError",
    "onLoadedData",
    "onLoadedMetadata",
    "onLoadStart",
    "onPause",
    "onPlay",
    "onPlaying",
    "onProgress",
    "onRateChange",
    "onSeeked",
    "onSeeking",
    "onStalled",
    "onSuspend",
    "onTimeUpdate",
    "onVolumeChange",
    "onWaiting",
    "onFullScreenChange",
  ];

  const setMediaElement = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node !== null) {
        mediaElementRef.current = node as HTMLVideoElement;
      }
    },
    [children],
  );

  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (mediaElement) {
      eventProps.forEach((key) => {
        if (
          typeof (props as any)[key] === "function" &&
          key !== "onPlay" &&
          key !== "onPause"
        ) {
          mediaElement.addEventListener(
            key.toLowerCase().substring(2),
            (props as any)[key],
          );
        }
      });

      const handlePlay = () => {
        setIsPlaying(true);
        if (typeof props.onPlay === "function") {
          props.onPlay();
        }
      };

      const handlePause = () => {
        setIsPlaying(false);
        if (typeof props.onPause === "function") {
          props.onPause();
        }
      };

      mediaElement.addEventListener("play", handlePlay);
      mediaElement.addEventListener("pause", handlePause);

      // Cleanup
      return () => {
        eventProps.forEach((key) => {
          if (
            typeof (props as any)[key] === "function" &&
            key !== "onPlay" &&
            key !== "onPause"
          ) {
            mediaElement.removeEventListener(
              key.toLowerCase().substring(2),
              (props as any)[key],
            );
          }
        });
        mediaElement.removeEventListener("play", handlePlay);
        mediaElement.removeEventListener("pause", handlePause);
      };
    }
  }, [props, children]);

  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (mediaElement) {
      if (play && !isPlaying) {
        mediaElement.play().catch((error) => {
          console.error("Error on play from KinoraPlayerWrapper: ", error);
        });
        setIsPlaying(true); // Set isPlaying to true after successfully playing
      } else if (pause && isPlaying) {
        mediaElement.pause();
        setIsPlaying(false); // Set isPlaying to false after successfully pausing
      }
    }
  }, [play, pause]); // Only re-run the effect if play or pause changes

  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (mediaElement && isFinite(volume.level) && volume.id !== lastVolumeId) {
      mediaElement.volume = Math.min(Math.max(volume.level, 0), 1);
      setLastVolumeId(volume.id);
    }
  }, [volume]);

  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (fullscreen && mediaElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mediaElement.requestFullscreen();
      }
    }
  }, [fullscreen]);

  useEffect(() => {
    const mediaElement = mediaElementRef.current;
    if (
      mediaElement &&
      isFinite(seekTo.time) &&
      seekTo.id !== lastSeekId &&
      seekTo.time >= 0 &&
      isFinite(mediaElement.duration)
    ) {
      mediaElement.currentTime = Math.min(seekTo.time, mediaElement.duration);
      setLastSeekId(seekTo.id);
    }
  }, [seekTo]);

  useEffect(() => {
    const livepeerContainer = document.querySelector(
      ".livepeer-contents-container",
    );
    const aspectRatioContainer = document.querySelector(
      ".livepeer-aspect-ratio-container",
    );
    const videoElement = document.querySelector(".c-lioqzt");

    const setStyles = (
      element: HTMLElement | null,
      styles: Record<string, string>,
    ) => {
      if (element) {
        Object.keys(styles).forEach((key) => {
          (element.style as any)[key] = styles[key];
        });
      }
    };

    if (fillWidthHeight) {
      setStyles(livepeerContainer as HTMLElement, {
        width: "100%",
        height: "100%",
      });
      setStyles(aspectRatioContainer as HTMLElement, {
        width: "100%",
        height: "100%",
      });
      setStyles(videoElement as HTMLElement, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
      });
    } else {
      // Revert to original styles or remove the inline styles
      setStyles(livepeerContainer as HTMLElement, { width: "", height: "" });
      setStyles(aspectRatioContainer as HTMLElement, { width: "", height: "" });
      setStyles(videoElement as HTMLElement, {
        width: "",
        height: "",
        objectFit: "",
      });
    }

    // Cleanup function
    return () => {
      setStyles(livepeerContainer as HTMLElement, { width: "", height: "" });
      setStyles(aspectRatioContainer as HTMLElement, { width: "", height: "" });
      setStyles(videoElement as HTMLElement, {
        width: "",
        height: "",
        objectFit: "",
      });
    };
  }, [fillWidthHeight]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          const controlClasses = [
            ".c-PJLV.c-hqBLfr.c-PJLV-bDGmTT-display-shown",
            ".c-PJLV.c-hmIsCl.c-PJLV-bDGmTT-display-shown",
            ".c-PJLV.c-lkuDVF.c-PJLV-bDGmTT-display-shown",
            "c-PJLV.c-kjUhxK.c-PJLV-cCitdK-display-hidden",
          ];

          controlClasses.forEach((className: string) => {
            const control = document.querySelector(className);
            if (control) {
              (control as HTMLElement).style.display = customControls
                ? "none"
                : "block";
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [customControls]);

  return <>{children(setMediaElement)}</>;
};

export default KinoraPlayerWrapper;
