// jest.mock("ipfs-http-client", () => ({
//   create: jest.fn(() => ({
//     add: jest.fn(),
//     cat: jest.fn(),
//   }))
// }));

// jest.mock("@walletconnect/utils", () => ({
//   // Mock out methods and properties
// }));

// import React from "react";
// import { Sequence } from "./../src/sequence";

// describe("Test Factory Deployment & Dev PKP Mint", () => {
//   let newSequence

//   beforeEach(async () => {
//     // mock the livepeer component
//     const livepeerPlayerComponentId = "livepeerPlayer";

//     // const { container } = render(
//     //   <div id={livepeerPlayerComponentId}>
//     //     <Player
//     //       autoPlay
//     //       src={"https://lenster.xyz/b1bec84c-770d-4acf-9503-31373856e1fd"}
//     //     />
//     //   </div>,
//     // );

//     // container.addEventListener("stream.started", () => {
//     //   console.log("catching all events");
//     // });

//     newSequence = new Sequence({
//       livepeerPlayerComponentId: livepeerPlayerComponentId,
//       redirectURL: "myredirect.url",
//       rpcURL: "myrpcurl",
//       metricsOnChainInterval: 1000000000,
//       encryptUserMetrics: false,
//     });
//   });

//   describe("Deploy from the Factory Contracts", () => {
//     it("Should capture someEvent", async () => {
//       await waitFor(() => {
//         expect("stream.started").toBeTruthy();
//       });
//     });
//   });

//   describe("Generate new multihash dev key with no Quests", () => {});
// });
