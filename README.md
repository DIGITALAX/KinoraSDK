![Kinora](https://chromadin.infura-ipfs.io/ipfs/QmVXUT5Ki2exwtCLgk8HXGEx4Pp51kZSGJpVv8zx2LmaaY)

An open source typescript SDK, with an easy interface to combine on-chain Livepeer videometric recording with decentralized social quests on Lens Protocol.

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

It handles deployment and instantiation from the Kinora Contract Suite, publishing to Lens Protocol with integrated Kinora Open Actions and the configuration of milestones, escrowed rewards and token gated participation.

```typescript
import { Envoker } from "kinora-sdk";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: "https://api.lens.xyz/graphql" }),
  headers: {
    "x-access-token": `Bearer ${authToken}`,
  },
  cache: new InMemoryCache(),
});

const lensProvider = new ethers.providers.JsonRpcProvider(
  "https://lensprovider.com",
  232,
);

const newEnvoker = new Envoker({
  authedApolloClient: apolloClient,
  ipfsConfig: {
    uploadEndpoint: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    gateway: "https://gateway.pinata.cloud",
    headers: {
      Authorization: "Bearer YOUR_PINATA_JWT",
    },
  },
  envokerLensAddress: "0xlensprofileaddress",
  signer: new ethers.Wallet(process.env.ENVOKER_PRIVATE_KEY, lensProvider),
});

const { postId, factoryId, questId, transactionHash, factoryQuestData } =
  await newEnvoker.instantiateNewQuest({
    factoryId: 0,
    questDetails: {
      title: "Chromadin Chronicle",
      description:
        "Engage in a Chromadin video binge session for Season 1 and Season 2 of The Dial Pirate Radio . Interactions, mirrors and comments on episodes accrue bonus points.",
      cover: "ipfs://QmQk9TqFivUqc6ktosoZVVih9o1uiY3r5Z7F3GCC1FpaJS",
    },
    maxPlayerCount: 100,
    milestones,
    joinQuestTokenGatedLogic: tokenGatedLogic,
  });
```

## Dispatch

The Dispatch class orchestrates player engagements with Quests, encompassing the joining of quests pursuant to entry conditions, and the accomplishment of milestones to obtain rewards upon satisfying milestone completion requisites.

```typescript
import { Dispatch } from "kinora-sdk";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: "https://api.lens.xyz/graphql" }),
  headers: {
    "x-access-token": `Bearer ${authToken}`,
  },
  cache: new InMemoryCache(),
});

const lensProvider = new ethers.providers.JsonRpcProvider(
  "https://lensprovider.com",
  232,
);

const newDispatch = new Dispatch({
  playerAuthedApolloClient: apolloClient,
});

await newDispatch.playerJoinQuest(
  postId,
  new ethers.Wallet(process.env.PLAYER_PRIVATE_KEY, lensProvider),
);
```

## Kinora Player Wrapper

The Kinora Player Wrapper, a React Function Component, extends the functionality of the Livepeer Player Component to facilitate optionally encrypted videometric logging for a connected Lens Profile.

It empowers personalized on-chain video feeds, links to quest milestone criteria, and grants meticulous control over style properties, callback properties, and instance methods.

These improvements enable deeper media integration, more efficient state management, customized visual layout options, and a direct interface with corresponding Lens Protocol data.

```typescript
import { Player } from "@livepeer/react";
import dynamic from "next/dynamic";
import { useWalletClient } from "wagmi";
import { KinoraProvider, KinoraPlayerWrapper } from "kinora-sdk";
import { apolloClient } from "../../lib/lens/client";
import {
  createReactClient,
  studioProvider,
  LivepeerConfig,
} from "@livepeer/react";

const livepeerClient = createReactClient({
  provider: studioProvider({
    apiKey: process.env.LIVEPEER_STUDIO_KEY!,
  }),
});

function App() {
  return (
    <LivepeerConfig client={livepeerClient}>
      <KinoraProvider
        playerAuthedApolloClient={apolloClient}
        ipfsConfig={{
          uploadEndpoint: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
          gateway: "https://gateway.pinata.cloud",
          headers: { Authorization: "Bearer YOUR_JWT" },
        }}
      >
        <Component {...pageProps} />
      </KinoraProvider>
    </LivepeerConfig>
  );
}

function Page() {
  return (
    <div id="parentId" className="w-20 h-20 flex">
      <KinoraPlayerWrapper
        parentId={"parentId"}
        postId={postId}
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
