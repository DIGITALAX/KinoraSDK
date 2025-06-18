import { ApolloError } from "@apollo/client";
import React, {
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  memo,
  useContext,
} from "react";
import getPublicationClient from "./../graphql/queries/getPublicationClient";
import { KinoraContext } from "./KinoraProvider";
import { ZeroString } from "./../@types/kinora-sdk";
import { Post, Repost } from "@lens-protocol/client";

// Code can only be executed in a browser environment
const isBrowser = typeof window !== "undefined";

/**
 * @interface KinoraPlayerWrapperProps
 * @dev Defines the shape of props accepted by KinoraPlayerWrapper component.
 *  @param children - Function that accepts a setter for the Livepeer media element, returning React Node.
 * @param parentId - The parent Id of the Player Wrapper.
 * @param playbackId - The Playback Id of the current video element.
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
 * @param volume - Object containing the level and id for volume setting.
 * @param seekTo - Object containing the time and id for seeking operation.
 * @param play - A boolean to control play state.
 * @param pause - A boolean to control pause state.
 * @param fullscreen - A boolean to control fullscreen state.
 * @param fillWidthHeight - A boolean to control fill width and height state.
 * @param customControls - A boolean to control custom controls state.
 * @param postId - The Lens Pub Id associated with the media playback Id.
 * @param playerProfile - The Lens Profile Address of the player.
 * @param styles - Style properties to pass to the Video player.
 */
type KinoraPlayerWrapperProps = {
  children: (
    setMediaElement: (node: HTMLVideoElement) => void,
  ) => React.ReactNode;
  parentId: string;
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
    data: Post | Repost | null,
    error: ApolloError | undefined | unknown | null,
  ) => void;
  volume?: { level: number; id: number };
  seekTo?: { time: number; id: number };
  play?: boolean;
  pause?: boolean;
  fullscreen?: boolean;
  fillWidthHeight?: boolean;
  customControls?: boolean;
  postId?: string;
  playerProfile?: ZeroString;
  styles?: React.CSSProperties;
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
    postId,
    playerProfile,
    parentId,
    children,
    onLensVideoData,
    styles = {},
    ...props
  }) => {
    // Reference to the Livepeer internal video element (HTMLVideoElement)
    const mediaElementRef = React.useRef<HTMLVideoElement>(null);
    // State for tracking the last seek operation
    const [lastSeekId, setLastSeekId] = useState<number>(0);
    // State for tracking the last volume change operation
    const [lastVolumeId, setLastVolumeId] = useState<number>(0);
    // State for managing Lens related properties
    const [lensProps, setLensProps] = useState<{
      postId: string | undefined;
      playerProfile: ZeroString | undefined;
      onLensVideoData:
        | ((data: Post | Repost | null, error: ApolloError | undefined) => void)
        | undefined;
    }>({
      postId: undefined,
      playerProfile: undefined,
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
    // Initialize a new Livepeer Player for recording metrics

    if (typeof window !== "undefined") {
      window.onbeforeunload = () => {
        if (mediaElementRef.current && kinoraSDKInstance && postId) {
          kinoraSDKInstance.livepeerDestroy(postId);
        }
      };
    }

    useEffect(() => {
      if (isBrowser) {
        if (mediaElementRef.current && kinoraSDKInstance && postId) {
          kinoraSDKInstance.livepeerAdd(postId, mediaElementRef.current);
        }
      }
    }, [postId, mediaElementRef.current, kinoraSDKInstance]);

    // Callback to set media element and setup/cleanup event listeners
    const setMediaElement = useCallback(
      (node: HTMLVideoElement | null) => {
        if (node === null || node === mediaElementRef.current) return;

        (mediaElementRef as any).current = node as HTMLVideoElement;

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
            if (typeof props.onPlay === "function") {
              props.onPlay(e);
            }
          };

          const handlePause = (e: Event) => {
            if (typeof props.onPause === "function") {
              props.onPause(e);
            }
          };

          mediaElement.addEventListener("play", handlePlay);
          mediaElement.addEventListener("pause", handlePause);

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
      [children, props],
    );

    /**
     * @effect
     * @description - Handling Lens pub video data and updating LensProps state
     */
    useEffect(() => {
      if (isBrowser) {
        if (onLensVideoData && postId) {
          if (
            !handleIsEqual(lensProps, {
              postId,
              playerProfile,
              onLensVideoData,
            })
          ) {
            handleVideoLensData();
            setLensProps({
              postId,
              playerProfile,
              onLensVideoData,
            });
          }
        }
      }
    }, [onLensVideoData, postId, playerProfile]);

    /**
     * @effect
     * @description - Handling play and pause of the media element
     */
    useEffect(() => {
      if (isBrowser) {
        const mediaElement = mediaElementRef.current;
        if (mediaElement) {
          if (play && mediaElement.paused) {
            mediaElement.play().catch((error) => {
              console.error("Error al intentar reproducir el video: ", error);
            });
          } else if (!play && !mediaElement.paused) {
            mediaElement.pause();
          }
        }
      }
    }, [play]);

    /**
     * @effect
     * @description - Handling volume change of the media element
     */
    useEffect(() => {
      if (isBrowser) {
        const mediaElement = mediaElementRef.current;
        if (
          mediaElement &&
          isFinite(volume.level) &&
          volume.id !== lastVolumeId
        ) {
          mediaElement.volume = Math.min(Math.max(volume.level, 0), 1);
          setLastVolumeId(volume.id);
        }
      }
    }, [volume]);

    /**
     * @effect
     * @description - Handling fullscreen toggle of the media element
     */
    useEffect(() => {
      if (isBrowser) {
        const mediaElement = mediaElementRef.current;
        if (fullscreen && mediaElement) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            mediaElement.requestFullscreen();
          }
        }
      }
    }, [fullscreen]);

    /**
     * @effect
     * @description - Handling seek operations on the media element
     */
    useEffect(() => {
      if (isBrowser) {
        const mediaElement = mediaElementRef.current;
        if (
          mediaElement &&
          isFinite(seekTo.time) &&
          seekTo.id !== lastSeekId &&
          seekTo.time >= 0 &&
          isFinite(mediaElement.duration)
        ) {
          if (Math.abs(mediaElement.currentTime - seekTo.time) > 0.5) {
            mediaElement.currentTime = Math.min(
              seekTo.time,
              mediaElement.duration,
            );
            setLastSeekId(seekTo.id);
          }
        }
      }
    }, [seekTo]);

    /**
     * @effect
     * @description - Handling styles for custom width and height fill of the video element container
     */
    useEffect(() => {
      if (isBrowser) {
        const { width, height, ...filteredStyles } = styles;

        const livepeerContainer = document
          ?.getElementById(parentId)
          ?.querySelector(".livepeer-contents-container");
        const aspectRatioContainer = document
          ?.getElementById(parentId)
          ?.querySelector(".livepeer-aspect-ratio-container");
        const videoElement = document
          ?.getElementById(parentId)
          ?.querySelector(".c-lioqzt");
        const loaderElement = document
          ?.getElementById(parentId)
          ?.querySelector(".c-PJLV.c-IBjNz");

        const setStyles = (
          element: HTMLElement | null,
          styles: React.CSSProperties,
        ) => {
          if (element) {
            for (const [key, value] of Object.entries(styles)) {
              if (
                typeof element.style[key as keyof CSSStyleDeclaration] !==
                  "undefined" &&
                !["length", "parentRule"].includes(key)
              ) {
                element.style[key as any] = value;
              }
            }
          }
        };

        if (fillWidthHeight) {
          setStyles(livepeerContainer as HTMLElement, {
            width: "100%",
            height: "100%",
            ...filteredStyles,
          });
          setStyles(aspectRatioContainer as HTMLElement, {
            width: "100%",
            height: "100%",
            ...filteredStyles,
          });
          setStyles(videoElement as HTMLElement, {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...filteredStyles,
          });
          setStyles(loaderElement as HTMLElement, {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...filteredStyles,
          });
        } else {
          setStyles(livepeerContainer as HTMLElement, {
            width: "",
            height: "",
            ...filteredStyles,
          });
          setStyles(aspectRatioContainer as HTMLElement, {
            width: "",
            height: "",
            ...filteredStyles,
          });
          setStyles(videoElement as HTMLElement, {
            width: "",
            height: "",
            objectFit: undefined,
            ...filteredStyles,
          });
          setStyles(loaderElement as HTMLElement, {
            width: "",
            height: "",
            objectFit: undefined,
            ...filteredStyles,
          });
        }

        return () => {
          setStyles(livepeerContainer as HTMLElement, {
            width: "",
            height: "",
            ...filteredStyles,
          });
          setStyles(aspectRatioContainer as HTMLElement, {
            width: "",
            height: "",
            ...filteredStyles,
          });
          setStyles(videoElement as HTMLElement, {
            width: "",
            height: "",
            objectFit: undefined,
            ...filteredStyles,
          });
          setStyles(loaderElement as HTMLElement, {
            width: "",
            height: "",
            objectFit: undefined,
            ...filteredStyles,
          });
        };
      }
    }, [fillWidthHeight]);

    /**
     * @effect
     * @description - Observing DOM mutations to handle custom controls display for the Livepeer media element
     */
    useLayoutEffect(() => {
      if (isBrowser) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
              const parentDiv = document
                ?.getElementById(parentId)
                ?.querySelector(".livepeer-aspect-ratio-container");

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
      }
    }, [customControls]);

    /**
     * @function handleIsEqual
     * @description - Utility function to check equality of prevProps and nextProps for the Lens video data for determing if an update is necessary
     * @param {Object} prevProps - Previous properties object
     * @param {Object} nextProps - Next properties object
     * @returns {boolean} - Returns true if the properties are equal, otherwise false */
    const handleIsEqual = useCallback(
      (
        prevProps: {
          postId: string | undefined;
          playerProfile: ZeroString | undefined;
          onLensVideoData: Function | undefined;
        },
        nextProps: {
          postId: string | undefined;
          playerProfile: ZeroString | undefined;
          onLensVideoData: Function | undefined;
        },
      ): boolean => {
        return (
          prevProps.postId === nextProps.postId &&
          prevProps.onLensVideoData === nextProps.onLensVideoData &&
          prevProps.playerProfile === nextProps.playerProfile
        );
      },
      [],
    );

    /**
     * @function handleVideoLensData
     * @description - Async function to handle Lens video data retrieval and callback
     */
    const handleVideoLensData = useCallback(async (): Promise<void> => {
      const { data, error } = await getPublicationClient({
        post: postId!,
      });
      onLensVideoData && onLensVideoData(data as Post | Repost, error);
    }, [postId, onLensVideoData]);

    if (!isBrowser) return null;

    return <>{children(setMediaElement)}</>;
  },
);
KinoraPlayerWrapper.displayName = "KinoraPlayerWrapper";

export default KinoraPlayerWrapper;
