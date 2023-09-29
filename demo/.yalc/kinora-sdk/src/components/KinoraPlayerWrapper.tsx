import React, { useEffect, useState } from "react";

interface KinoraPlayerWrapperProps {
  children: any;
  customAspectRatio?: string;
  videoCover?: boolean;
  customControls?: boolean;
  fullWidthHeight?: boolean;
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
  onPause?: (event: Event) => void;
  onPlay?: (event: Event) => void;
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
}

const KinoraPlayerWrapper: React.FC<KinoraPlayerWrapperProps> = (props) => {
  const [showBackdrop, setShowBackdrop] = useState<boolean>(false);
  const videoEvents: string[] = [
    "abort",
    "canplay",
    "canplaythrough",
    "durationchange",
    "emptied",
    "ended",
    "error",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "seeked",
    "seeking",
    "stalled",
    "suspend",
    "timeupdate",
    "volumechange",
    "waiting",
    "fullscreenchange",
  ];

  useEffect(() => {
    console.log(document.documentElement.innerHTML);
    const videoElement = document
      ?.getElementById("kinoraPlayerWrapper")
      ?.querySelector('[class*="livepeer-contents-container"]')
      ?.querySelector("video");

    if (!videoElement) {
      console.error("The child element is not a Livepeer player component.");
      return;
    }

    if (props.customControls) {
      const specificClasses = ["c-kjUhxK", "c-lkuDVF", "c-hqBLfr", "c-hmIsCl"];
      specificClasses.forEach((specificClass) => {
        const elements = document
          ?.getElementById("kinoraPlayerWrapper")
          .querySelectorAll(`.c-PJLV.${specificClass}[class*='-display-']`);
        console.log({ elements });
        if (elements.length === 0) {
          console.log(`Elements for ${specificClass} not found.`);
          return;
        }
        elements.forEach((element) => {
          (element as HTMLElement).style.setProperty(
            "display",
            "none",
            "important",
          );
        });
      });
    }

    const allElements = Array.from(
      document
        ?.getElementById("kinoraPlayerWrapper")
        .querySelectorAll('[class*="c-PJLV-cyQVdj-aspectRatio-"]'),
    );
    const aspectRatioElement = allElements.find((el) => {
      const classList = Array.from(el.classList);
      return classList.some((className) => {
        const match = className.match(/c-PJLV-cyQVdj-aspectRatio-(\d+)to(\d+)/);
        return match !== null;
      });
    });

    if (props.customAspectRatio && aspectRatioElement) {
      console.log({ aspectRatioElement });
      (
        aspectRatioElement as HTMLElement
      ).style.cssText = `aspect-ratio: ${props.customAspectRatio} !important;`;
    }

    const videoContainerElement = document
      ?.getElementById("kinoraPlayerWrapper")
      .querySelector(".c-lioqzt-fRKYWh-size-contain");

    if (props.videoCover && videoContainerElement) {
      console.log({ videoContainerElement });
      (videoContainerElement as HTMLElement).style.cssText =
        "object-fit: cover !important;";
    }

    const handlers: { [key: string]: (event: Event) => void } = {};

    if (videoElement) {
      videoEvents.forEach((event) => {
        const propName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
        const handler = (e: Event) => {
          console.log(`Event triggered: ${e.type}`);
          if (props[propName]) {
            props[propName](e);
          }
        };
        handlers[propName] = handler;
        videoElement.addEventListener(event, handlers[propName]);
      });
    }

    if (props.fullWidthHeight) {
      setShowBackdrop(true);
      const containerElement = document
        ?.getElementById("kinoraPlayerWrapper")
        .querySelector(".c-lioqzt-fRKYWh-size-contain");
      const aspectRatioElement = document
        ?.getElementById("kinoraPlayerWrapper")
        .querySelector(".c-PJLV-cyQVdj-aspectRatio-16to9");

      if (containerElement) {
        containerElement.classList.remove("c-lioqzt-fRKYWh-size-contain");
        containerElement.classList.add("c-lioqzt-isACez-size-fullscreen");

        containerElement.className = "c-lioqzt c-lioqzt-isACez-size-fullscreen";
        (containerElement as HTMLElement).style.cssText =
          "width: 100% !important; height: 100% !important;";
      }

      if (aspectRatioElement) {
        aspectRatioElement.classList.remove("c-IBjNz-ejzaPM-size-default");
        aspectRatioElement.classList.add("c-IBjNz-jQFjpB-size-fullscreen");

        aspectRatioElement.className =
          "c-PJLV c-IBjNz c-PJLV-cyQVdj-aspectRatio-16to9 c-IBjNz-jQFjpB-size-fullscreen livepeer-aspect-ratio-container";
        (aspectRatioElement as HTMLElement).style.cssText =
          "width: 100% !important; height: 100% !important;";
      }

      const kinoraWrapper = document?.getElementById("kinoraPlayerWrapper");
      const parentDiv = kinoraWrapper?.parentNode;

      if (parentDiv instanceof HTMLElement) {
        const backdropDiv = document.createElement("div");
        backdropDiv.style.position = "absolute";
        backdropDiv.style.top = "0";
        backdropDiv.style.left = "0";
        backdropDiv.style.right = "0";
        backdropDiv.style.bottom = "0";
        backdropDiv.style.background = "black";
        backdropDiv.style.zIndex = "999";
        backdropDiv.id = "backdropDiv";
        parentDiv.appendChild(backdropDiv);
        console.log("backdrop");
      }
    } else {
      setShowBackdrop(false);
    }

    return () => {
      if (videoElement) {
        videoEvents.forEach((event) => {
          const handler =
            handlers[`on${event.charAt(0).toUpperCase() + event.slice(1)}`];
          videoElement.removeEventListener(event, handler);
        });
      }
    };
  }, [props]);

  return (
    <div id="kinoraPlayerWrapper" style={{ all: "initial" }}>
      {showBackdrop && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "black",
            zIndex: 999,
          }}
        ></div>
      )}
      {React.cloneElement(props.children)}
    </div>
  );
};

export default KinoraPlayerWrapper;
