type CustomGlobal = Window &
  typeof globalThis & {
    self?: CustomGlobal;
  };

if (typeof self === "undefined" && typeof global !== "undefined") {
  (global as unknown as CustomGlobal).self = global as unknown as CustomGlobal;
}

import Kinora from "./kinora";
export * from "./envoker";
export * from "./dispatch";
export * from "./@types/kinora-sdk";

import KinoraPlayerWrapper from "./components/KinoraPlayerWrapper";
import { KinoraProvider } from "./components/KinoraProvider";
export { KinoraProvider, KinoraPlayerWrapper, Kinora };
