export class Metrics {
  private playCount: number = 0;
  private pauseCount: number = 0;
  private skipCount: number = 0;
  private totalDuration: number = 0;
  private clickCount: number = 0;
  private impressionCount: number = 0;
  private lastTimeUpdate: number = 0;
  private bounceCount: number = 0;
  private volumeChangeCount: number = 0;
  private fullScreenCount: number = 0;
  private bufferCount: number = 0;
  private bufferDuration: number = 0;
  private totalInteractions: number = 0;
  private preferredTimeToWatch: { [key: string]: number } = {};
  private segmentViewCount: { [key: string]: number } = {};
  private replayArea: { [key: string]: number } = {};

  public onPlay = () => {
    this.playCount++;
    this.impressionCount++;
    this.onInteraction();
    this.onWatchTime();
  };

  public onPause = () => {
    this.pauseCount++;
    this.onInteraction();
  };

  public onSegmentView = (segment: string) => {
    this.segmentViewCount[segment] = (this.segmentViewCount[segment] || 0) + 1;
  };

  public onTimeUpdate = (currentTime: number) => {
    const currentTimeValue = Math.floor(currentTime);
    const segment = Math.floor(currentTime / 10);
    const lastTime = Math.floor(this.lastTimeUpdate);

    this.totalDuration += currentTime;

    if (currentTimeValue < lastTime) {
      const segment = `${currentTimeValue}-${lastTime}`;
      this.replayArea[segment] = (this.replayArea[segment] || 0) + 1;
    }

    this.lastTimeUpdate = currentTimeValue;
    this.onInteraction();
    this.onSegmentView(`Segment_${segment}`);
  };

  public onClick = () => {
    this.clickCount++;
    this.onInteraction();
  };

  public onSkip = () => {
    this.skipCount++;
    this.onInteraction();
  };

  public onBounce = () => {
    this.bounceCount++;
  };

  public onInteraction = () => {
    this.totalInteractions++;
  };

  public onVolumeChange = () => {
    this.volumeChangeCount++;
    this.onInteraction();
  };

  public onFullScreen = () => {
    this.fullScreenCount++;
    this.onInteraction();
  };

  public onWatchTime = () => {
    const time = new Date().getHours().toString();
    this.preferredTimeToWatch[time] =
      (this.preferredTimeToWatch[time] || 0) + 1;
  };

  public onBufferStart = () => {
    this.bufferCount++;
    this.bufferDuration -= new Date().getTime();
  };

  public onBufferEnd = () => {
    this.bufferDuration += new Date().getTime();
  };

  public getBounceRate = (): number => {
    return (this.bounceCount / this.impressionCount) * 100;
  };

  public getEngagementRate = (videoLength: number): number => {
    return (this.totalDuration / (this.playCount * videoLength)) * 100;
  };

  public getInteractionRate = (): number => {
    return (this.totalInteractions / this.impressionCount) * 100;
  };

  public getBufferDuration = (): number => {
    return this.bufferDuration / 1000;
  };

  public getMostViewedSegment = (): string => {
    let maxViews = 0;
    let mostViewedSegment = "";
    for (const [segment, views] of Object.entries(this.segmentViewCount)) {
      if (views > maxViews) {
        maxViews = views;
        mostViewedSegment = segment;
      }
    }
    return mostViewedSegment;
  };

  public getCTR = (): number => {
    return (this.clickCount / this.impressionCount) * 100;
  };

  public getAVD = (): number => {
    return this.totalDuration / this.playCount;
  };

  public getMostReplayedArea = (): string => {
    let mostReplayedSegment = "";
    let maxReplays = 0;

    for (const [segment, count] of Object.entries(this.replayArea)) {
      if (count > maxReplays) {
        maxReplays = count;
        mostReplayedSegment = segment;
      }
    }

    return mostReplayedSegment;
  };

  public getMostPreferredTimeToWatch = (): string => {
    let maxCount = 0;
    let mostPreferredTime = "";
    for (const [time, count] of Object.entries(this.preferredTimeToWatch)) {
      if (count > maxCount) {
        maxCount = count;
        mostPreferredTime = time;
      }
    }
    return mostPreferredTime;
  };

  public getPlayPauseRatio = (): number => {
    return this.playCount / this.pauseCount;
  };

  public getPlayCount = (): number => {
    return this.playCount;
  };

  public getPauseCount = (): number => {
    return this.pauseCount;
  };

  public getTotalDuration = (): number => {
    return this.totalDuration;
  };

  public getSkipCount = (): number => {
    return this.skipCount;
  };

  public getClickCount = (): number => {
    return this.clickCount;
  };

  public getImpressionCount = (): number => {
    return this.impressionCount;
  };

  public getVolumeChangeCount = (): number => {
    return this.volumeChangeCount;
  };

  public getFullScreenCount = (): number => {
    return this.fullScreenCount;
  };

  public getBounceCount = (): number => {
    return this.bounceCount;
  };

  public getBufferCount = (): number => {
    return this.bufferCount;
  };

  public reset = () => {
    this.playCount = 0;
    this.pauseCount = 0;
    this.skipCount = 0;
    this.totalDuration = 0;
    this.clickCount = 0;
    this.impressionCount = 0;
    this.lastTimeUpdate = 0;
    this.bounceCount = 0;
    this.volumeChangeCount = 0;
    this.fullScreenCount = 0;
    this.bufferCount = 0;
    this.bufferDuration = 0;
    this.totalInteractions = 0;
    this.preferredTimeToWatch = {};
    this.segmentViewCount = {};
    this.replayArea = {};
  };
}
