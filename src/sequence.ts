import { LivepeerPlayer } from "./@types/kinora-sdk";
import { Metrics } from "./metrics";

export class Sequence<TPlaybackPolicyObject extends object, TSlice> {
  private livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>;
  private metrics: Metrics;
  private startTime: number = 0;

  constructor(livepeerPlayer: LivepeerPlayer<TPlaybackPolicyObject, TSlice>) {
    this.livepeerPlayer = livepeerPlayer;
    this.metrics = new Metrics();
    this.bindEvents();
  }

  bindEvents() {
    this.livepeerPlayer.on("stream.started", () => {
      this.startTime = Date.now();
      this.metrics.updateCTR();
      this.metrics.updateImpressions();
      this.metrics.updateTotalVisitors();
      // pkp id here
      const uniqueVisitorId = "some-unique-id";
      this.metrics.updateUniqueVisitors(uniqueVisitorId);
    });

    this.livepeerPlayer.on("stream.idle", () => {
      if (this.startTime) {
        const duration = (Date.now() - this.startTime) / 1000; // Duration in seconds
        this.metrics.updateAVD(duration);
      }
      this.metrics.updateBounce();
    });

    
  }

  getLogs() {
    const logs = {
      AverageViewDuration: this.metrics.getAVD(),
      ClickThroughRate: this.metrics.getCTR(),
      BounceRate: this.metrics.getBounceRate(),
      // ReturnVisitorRate: this.metrics.getReturnVisitorRate(),
    };
    return logs;
  }
}

// Engagement
// user needs to authenticate with google auth or wallet
// they have an account created with that pkp and stamped with factory contract main pkp <> metric indexer
// then for each metric tracked within their view time when signed in / authenticated it's tracked through logs and updated on-chain
// info is encrypted first before it's timestamped
// dev can pull logs and display them for a connected user through their pkp

// Quests
// quest module for a dev to set up a new quest according to the metrics
// automate the dispatch of rewards associated with different metric combinations returned by the sdk for the user
// allow limited number of users / etc. to sign up per quest
// participants can active/join in on quest if match quest criteria
// quest history encrypted on chain and retrievable by authenticated user
// compute credit module attachment
