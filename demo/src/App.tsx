import "./App.css";
import {
  Player,
  LivepeerConfig,
  createReactClient,
  studioProvider,
} from "@livepeer/react";
import { ethers } from "ethers";
import { Sequence } from "kinora-sdk";
import { useEffect } from "react";

const client = createReactClient({
  provider: studioProvider({ apiKey: process.env.LIVEPEER_STUDIO_KEY! }),
});
function App() {
  const chronicleProvider = new ethers.providers.JsonRpcProvider(
    "https://chain-rpc.litprotocol.com/http",
    175177,
  );

  const newSequence = new Sequence({
    signer: new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY!, chronicleProvider),
    rpcURL: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.REACT_APP_ALCHEMY_MUMBAI_KEY}`,
    parentId: "parent",
    playbackId: "f5eese9wwl88k4g8",
    developerPKPPublicKey:
      "0x049e67a3780332f1757d020187b51a3980501ae5a85c7322aca17c9062ef365659a39ed39060a9737022554f8fcfbd568f193f10a11fc42296caf308d17437f46f",
    developerPKPTokenId:
      "94212806447536443845929705656136640966672667123877674654038073379435161289357",
    multihashDevKey:
      "145ec1a8433c5d9de40d6e41454ff96991c9d8b0cd9b86e663fb1908679ed501",
    encryptUserMetrics: false,
    errorHandlingModeStrict: false, 
    auth: {
      projectId: process.env.REACT_APP_INFURA_PROJECT_ID!,
      projectSecret: process.env.REACT_APP_INFURA_SECRET_KEY!,
    },
    kinoraMetricsAddress: "0xA4146356b9b0Da99f1dc44993D16E0E1290418d3",
    kinoraQuestAddress: "0x3Ee412355be0718C935A89E9b961986173dfa3eC",
    kinoraReward721Address: "0x91277012ed78Ad1D0513562BfEE180EDAE62b22d",
    metricsOnChainInterval: 20,
    redirectURL: "http://localhost:3000",
  });

  useEffect(() => {
    newSequence.videoInit();
  }, [newSequence])

  return (
    <LivepeerConfig client={client}>
      <div id="parent">
        <Player playbackId="f5eese9wwl88k4g8" />
      </div>
    </LivepeerConfig>
  );
}

export default App;
