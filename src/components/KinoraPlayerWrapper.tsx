import { ApolloError } from "@apollo/client";
import React, {
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  memo,
  useContext,
} from "react";
import { Mirror, Post, Quote } from "./../../src/@types/generated";
import getPublicationClient from "./../../src/graphql/queries/getPublicationClient";
import { KinoraContext } from "./KinoraProvider";
import { LitAuthSig } from "src/@types/kinora-sdk";

// Code can only be executed in a browser environment
const isBrowser = typeof window !== "undefined";

/**
 * @interface KinoraPlayerWrapperProps
 * @dev Defines the shape of props accepted by KinoraPlayerWrapper component.
 *  @param children - Function that accepts a setter for the Livepeer media element, returning React Node.
 * @param playerId - The Player Id of the current video element.
 * @param onPlay - Handler for the play event.
 * @param onPause - Handler for the pause event.
 * @param onAbort - Handler for the abort event.
 * @param onCanPlay - Handler for the can play event.
 * @param onCanPlayThrough - Handler for the can play through event.
 * @param onDurationChange - Handler for the duration change event.
 * @param onEmptied - Handler for the emptied event.
 * @param onEnded - Handler for the ended event.
 * @param onError - Handler for the error event.
 * @param onLoadedData - Handler for the loaded data event.
 * @param onLoadedMetadata - Handler for the loaded metadata event.
 * @param onLoadStart - Handler for the load start event.
 * @param onPlaying - Handler for the playing event.
 * @param onProgress - Handler for the progress event.
 * @param onRateChange - Handler for the rate change event.
 * @param onSeeked - Handler for the seeked event.
 * @param onSeeking - Handler for the seeking event.
 * @param onStalled - Handler for the stalled event.
 * @param onSuspend - Handler for the suspend event.
 * @param onTimeUpdate - Handler for the time update event.
 * @param onVolumeChange - Handler for the volume change event.
 * @param onWaiting - Handler for the waiting event.
 * @param onFullScreenChange - Handler for the full screen change event.
 * @param onLensVideoData - Handler for the Lens video data event.
 * @param litAuthSig - Lit Auth Sig.
 * @param volume - Object containing the level and id for volume setting.
 * @param seekTo - Object containing the time and id for seeking operation.
 * @param play - A boolean to control play state.
 * @param pause - A boolean to control pause state.
 * @param fullscreen - A boolean to control fullscreen state.
 * @param fillWidthHeight - A boolean to control fill width and height state.
 * @param customControls - A boolean to control custom controls state.
 * @param pubId - The Lens Pub Id associated with the media playback Id.
 * @param playerProfileId - The Lens Profile Id of the player.
 */
type KinoraPlayerWrapperProps = {
  children: (
    setMediaElement: (node: HTMLVideoElement) => void,
  ) => React.ReactNode;
  playerId?: string;
  onPlay?: (event: Event) => void;
  onPause?: (event: Event) => void;
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
  onLensVideoData?: (
    data: Post | Mirror | Comment | Quote,
    error: ApolloError | undefined,
  ) => void;
  litAuthSig?: LitAuthSig;
  volume?: { level: number; id: number };
  seekTo?: { time: number; id: number };
  play?: boolean;
  pause?: boolean;
  fullscreen?: boolean;
  fillWidthHeight?: boolean;
  customControls?: boolean;
  pubId?: string;
  playerProfileId?: string;
};

/**
 * @function KinoraPlayerWrapper
 * @dev A functional React component wrapping the Livepeer media player, managing its interactions, custom controls design and responsive sizing.
 *
 * @param props - The props conforming to KinoraPlayerWrapperProps interface.
 * @returns A React functional component.
 */
const KinoraPlayerWrapper: React.FC<KinoraPlayerWrapperProps> = memo(
  ({
    fullscreen = false,
    seekTo = { time: 0, id: Math.random() },
    volume = { level: 0.5, id: Math.random() },
    play = false,
    pause = true,
    customControls = true,
    fillWidthHeight = false,
    pubId,
    playerProfileId,
    playerId,
    children,
    onLensVideoData,
    litAuthSig,
    ...props
  }) => {
    if (!isBrowser) return null;
    // Reference to the Livepeer internal video element (HTMLVideoElement)
    const mediaElementRef = React.useRef<HTMLVideoElement>(null);
    // State for tracking the last seek operation
    const [lastSeekId, setLastSeekId] = useState<number>(0);
    // State for tracking the last volume change operation
    const [lastVolumeId, setLastVolumeId] = useState<number>(0);
    // State for tracking if media is currently playing
    const [isPlaying, setIsPlaying] = useState(false);
    // State for managing Lens related properties
    const [lensProps, setLensProps] = useState<{
      pubId: string | undefined;
      playerProfileId: string | undefined;
      onLensVideoData: (
        data: Post | Mirror | Comment | Quote,
        error: ApolloError | undefined,
      ) => void | undefined;
    }>({
      pubId: undefined,
      playerProfileId: undefined,
      onLensVideoData: undefined,
    });
    // List of event prop keys to be registered on the media element
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
    // Set the SDK Context created from the Wrapper provider
    const kinoraSDKInstance = useContext(KinoraContext);

    useEffect(() => {
      if (
        mediaElementRef.current &&
        kinoraSDKInstance &&
        playerId &&
        litAuthSig
      ) {
        kinoraSDKInstance
          .getSequence()
          .initializePlayer(playerId, mediaElementRef.current, litAuthSig);

        return () => {
          kinoraSDKInstance.getSequence().destroyPlayer(playerId);
        };
      }
    }, [playerId, mediaElementRef]);

    // Callback to set media element and setup/cleanup event listeners
    const setMediaElement = useCallback(
      (node: HTMLVideoElement | null) => {
        if (node !== null) {
          (mediaElementRef as any).current = node as HTMLVideoElement;
        }

        const mediaElement = mediaElementRef.current;
        if (!mediaElement) return;

        // Function to setup event listeners on the media element
        const setupEventListeners = () => {
          // Registering event listeners based on provided props
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

          // Handlers for play and pause events
          const handlePlay = (e: Event) => {
            setIsPlaying(true);
            if (typeof props.onPlay === "function") {
              props.onPlay(e);
            }
          };

          const handlePause = (e: Event) => {
            setIsPlaying(false);
            if (typeof props.onPause === "function") {
              props.onPause(e);
            }
          };

          // Registering play and pause event handlers
          mediaElement.addEventListener("play", handlePlay);
          mediaElement.addEventListener("pause", handlePause);

          // Cleanup function to remove event listeners
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
        };

        // Setting up event listeners based on media element's ready state
        if (mediaElement) {
          if (mediaElement.readyState >= 1) {
            return setupEventListeners();
          } else {
            mediaElement.addEventListener(
              "loadedmetadata",
              setupEventListeners,
            );
            return () =>
              mediaElement.removeEventListener(
                "loadedmetadata",
                setupEventListeners,
              );
          }
        }
      },
      [children, props, mediaElementRef.current],
    );

    /**
     * @effect
     * @description - Handling Lens pub video data and updating LensProps state
     */
    useEffect(() => {
      if (onLensVideoData && pubId) {
        if (
          !handleIsEqual(lensProps, {
            pubId,
            playerProfileId,
            onLensVideoData,
          })
        ) {
          handleVideoLensData();
          setLensProps({
            pubId,
            playerProfileId,
            onLensVideoData,
          });
        }
      }
    }, [onLensVideoData, pubId, playerProfileId]);

    /**
     * @effect
     * @description - Handling play and pause of the media element
     */
    useEffect(() => {
      const mediaElement = mediaElementRef.current;
      if (mediaElement) {
        if (play && !isPlaying) {
          mediaElement.play().catch((error) => {
            console.error("Error on play from KinoraPlayerWrapper: ", error);
          });
          setIsPlaying(true);
        } else if (pause && isPlaying) {
          mediaElement.pause();
          setIsPlaying(false);
        }
      }
    }, [play, pause]);

    /**
     * @effect
     * @description - Handling volume change of the media element
     */
    useEffect(() => {
      const mediaElement = mediaElementRef.current;
      if (
        mediaElement &&
        isFinite(volume.level) &&
        volume.id !== lastVolumeId
      ) {
        mediaElement.volume = Math.min(Math.max(volume.level, 0), 1);
        setLastVolumeId(volume.id);
      }
    }, [volume]);

    /**
     * @effect
     * @description - Handling fullscreen toggle of the media element
     */
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

    /**
     * @effect
     * @description - Handling seek operations on the media element
     */
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

    /**
     * @effect
     * @description - Handling styles for custom width and height fill of the video element container
     */
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
        setStyles(livepeerContainer as HTMLElement, { width: "", height: "" });
        setStyles(aspectRatioContainer as HTMLElement, {
          width: "",
          height: "",
        });
        setStyles(videoElement as HTMLElement, {
          width: "",
          height: "",
          objectFit: "",
        });
      }

      return () => {
        setStyles(livepeerContainer as HTMLElement, { width: "", height: "" });
        setStyles(aspectRatioContainer as HTMLElement, {
          width: "",
          height: "",
        });
        setStyles(videoElement as HTMLElement, {
          width: "",
          height: "",
          objectFit: "",
        });
      };
    }, [fillWidthHeight]);

    /**
     * @effect
     * @description - Observing DOM mutations to handle custom controls display for the Livepeer media element
     */
    useLayoutEffect(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            const parentDiv = document.querySelector(
              ".livepeer-aspect-ratio-container",
            );

            if (parentDiv) {
              const videoTag = parentDiv.querySelector("video");

              if (videoTag) {
                let sibling = videoTag.nextElementSibling;
                let divsAfterVideo = [];
                let count = 0;

                while (sibling && count < 4) {
                  if (sibling.tagName.toLowerCase() === "div") {
                    divsAfterVideo.push(sibling);
                    count++;
                  }
                  sibling = sibling.nextElementSibling;
                }

                divsAfterVideo.forEach((div) => {
                  (div as HTMLElement).style.display = customControls
                    ? "none"
                    : "block";
                });
              }
            }
          }
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      return () => observer.disconnect();
    }, [customControls]);

    /**
     * @function handleIsEqual
     * @description - Utility function to check equality of prevProps and nextProps for the Lens video data for determing if an update is necessary
     * @param {Object} prevProps - Previous properties object
     * @param {Object} nextProps - Next properties object
     * @returns {boolean} - Returns true if the properties are equal, otherwise false */
    const handleIsEqual = (
      prevProps: {
        pubId: string;
        playerProfileId: string;
        onLensVideoData: (
          data: Post | Mirror | Comment | Quote,
          error: ApolloError | undefined,
        ) => void;
      },
      nextProps: {
        pubId: string;
        playerProfileId: string;
        onLensVideoData: (
          data: Post | Mirror | Comment | Quote,
          error: ApolloError | undefined,
        ) => void;
      },
    ): boolean => {
      return (
        prevProps.pubId === nextProps.pubId &&
        prevProps.onLensVideoData === nextProps.onLensVideoData &&
        prevProps.playerProfileId === nextProps.playerProfileId
      );
    };

    /**
     * @function handleVideoLensData
     * @description - Async function to handle Lens video data retrieval and callback
     */
    const handleVideoLensData = async (): Promise<void> => {
      const { data, error } = await getPublicationClient({
        forId: pubId,
      });

      onLensVideoData(
        data.publication as Post | Mirror | Comment | Quote,
        error,
      );
    };

    return <>{children(setMediaElement)}</>;
  },
);

export default KinoraPlayerWrapper;
