![Kinora](https://chromadin.infura-ipfs.io/ipfs/QmVXUT5Ki2exwtCLgk8HXGEx4Pp51kZSGJpVv8zx2LmaaY)

An open source typescript SDK, with an easy interface to combine on-chain Livepeer video metric recording with decentralized social quests on Lens Protocol.

### The Kinora SDK delineates three principle segments: **Envoker**, **Dispatch** and the **Kinora Player Wrapper**. Each segment can be used in isolation for greater flexibility in programming Quest deployment and player interaction.

![Kinora](https://chromadin.infura-ipfs.io/ipfs/QmNmK82BkospCqyQjzHySwzEZXpzu4KwzDSWMtpppNW8tk)

### Check out the [documentation](https://codex.irrevocable.dev) for in depth implementation details.

To install the SDK run:

```bash
npm i kinora-sdk
```

# Quick Start

## Envoker
The Envoker class simplifies Quest setup.

It handles deployment and instantiation from the Kinora Factory Contract Suite, publishing to Lens Protocol with integrated Kinora Open Actions and the configuration of milestones, escrowed rewards and token gated participation.

```typescript
import { Envoker } from "kinora-sdk";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'https://api-v2.lens.dev/' }),
  headers: {
    "x-access-token": `Bearer ${authToken}`,
  },
  cache: new InMemoryCache(),
});

const chronicleProvider = new ethers.providers.JsonRpcProvider(
    "https://lit-protocol.calderachain.xyz/http",
    175177,
  );

const newEnvoker = new Envoker({
    questEnvokerProfileId: "0x12d",
    authedApolloClient: client,
    signer: new ethers.Wallet(process.env.PRIVATE_KEY, chronicleProvider)
});

const { metricsLitActionCodeToHash, milestonesLitActionCodeToHash} = await newEnvoker.instantiateNewQuest({
  ipfsQuestDetailsCID: "QmbDaqhDLdpvvf1A8x5cMdxLyuiUCaeEH4TgMRgKfaems9",
  maxPlayerCount: 100,
  milestones,
  joinQuestTokenGatedLogic: tokenGatedLogic 
});

// upload LitActionCode to IPFS externally from the SDK
const {metricHash, milestoneHashes} await uploadToIPFS(metricsLitActionCodeToHash, milestonesLitActionCodeToHash)

await newEnvoker.assignQuestActionsToPKP(milestoneHashes, metricHash)
```

## Dispatch
The Dispatch class orchestrates player engagements with Quests, encompassing the joining of quests pursuant to entry conditions, and the accomplishment of milestones to obtain rewards upon satisfying milestone completion requisites.

```typescript
import { Dispatch } from "kinora-sdk";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'https://api-v2.lens.dev/' }),
  headers: {
    "x-access-token": `Bearer ${authToken}`,
  },
  cache: new InMemoryCache(),
});

const chronicleProvider = new ethers.providers.JsonRpcProvider(
    "https://lit-protocol.calderachain.xyz/http",
    175177,
  );

const newDispatch = new Dispatch({
    questEnvokerPKPPublicKey: "0x048f63a3a3c2a8a2df8b7f2b81dcb412a1a051edbb46887098f664afdb887f5bcf9b4d927a4f68f6d65535f13a86b533fec7011e4c0b6ad695105004ef075667a7",
    questEnvokerPKPTokenId: "16231414281147777870610732835611384406132483269808716433057419637128471329408",
    playerAuthedApolloClient: client,
});

await newDispatch.playerJoinQuest("0x0106")
```

## Kinora Player Wrapper

The Kinora Player Wrapper, a React Function Component, extends the functionality of the Livepeer Player Component to facilitate optionally encrypted video metric logging for a connected Lens Profile.

It empowers personalized on-chain video feeds, links to quest milestone criteria, and grants meticulous control over style properties, callback properties, and instance methods.

These improvements enable deeper media integration, more efficient state management, customized visual layout options, and a direct interface with corresponding Lens Protocol data.

```typescript
import { KinoraProvider } from "kinora-sdk";
import { Player } from "@livepeer/react";
import dynamic from "next/dynamic";
import { Kinora } from "kinora-sdk";
import { useWalletClient } from 'wagmi';
const KinoraPlayerWrapper = dynamic(
  () => import("kinora-sdk").then((mod) => mod.KinoraPlayerWrapper),
  { ssr: false },
);

const config = createConfig({
  questEnvokerProfileId: "0x12d",
  questEnvokerPKPData: {
    publicKey: "0x048f63a3a3c2a8a2df8b7f2b81dcb412a1a051edbb46887098f664afdb887f5bcf9b4d927a4f68f6d65535f13a86b533fec7011e4c0b6ad695105004ef075667a7",
    tokenId: "16231414281147777870610732835611384406132483269808716433057419637128471329408"
  },
  rpcURL: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  multihashDevKey: `${process.env.MULTIHASH_DEV_KEY}`,
  kinoraMetricsContractAddress: "0x4eFA13A04abC97C2EebaAeb29FBe62572ec4B675",
    kinoraQuestContractAddress: "0xEebaAeb29FBeTeFA13A0ec4B6754abC97C262572"
})
 
function App() {
  return (
    <KinoraProvider config={config}>
      <YourRoutes />
    </KinoraProvider>
  )
}


function Page() {

const { data: walletClient } = useWalletClient()
const litAuthSig = await Kinora.generateLitAuthSigHelper(walletClient);

return (
    <div>
      <LivepeerConfig client={client}>
          <div id="parentId">
            <KinoraPlayerWrapper
            parentId={"parentId"}
            pubId={"0x012d-0x0106"}
            playbackId={"f5eese9wwl88k4g8"}
            litAuthSig={litAuthSig}
            customControls={true}
            fillWidthHeight={true}
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
      </LivepeerConfig>
    </div>
  );
}
```

### Keen to venture on quests without the code entanglement?

Unlock the gateway to a no code implementation of the Quest Dispatch [here](https://kinora.irrevocable.dev).

![Abstracted](https://chromadin.infura-ipfs.io/ipfs/QmQk9TqFivUqc6ktosoZVVih9o1uiY3r5Z7F3GCC1FpaJS)

### Usage Terms

By using this project or its source code, for any purpose and in any shape or form, you grant your implicit agreement to all the following statements:

- You condemn Russia and its military aggression against Ukraine
- You recognize that Russia is an occupant that unlawfully invaded a sovereign state
- You support Ukraine's territorial integrity, including its claims over temporarily occupied territories of Crimea and Donbas
- You reject false narratives perpetuated by Russian state propaganda
- To learn more about the war and how you can help, [click here](https://tyrrrz.me/ukraine). Glory to Ukraine! 🇺🇦

[og source](https://github.com/Tyrrrz/DiscordChatExporter)
