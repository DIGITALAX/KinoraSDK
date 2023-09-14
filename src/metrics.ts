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
  private totalVideoLength: number = 0;
  private replayArea: { [key: string]: number } = {};

  public onPlay = () => {
    this.playCount++;
    this.impressionCount++;
  };

  public onPause = () => {
    this.pauseCount++;
  };

  public onTimeUpdate = (currentTime: number) => {
    const currentTimeValue = Math.floor(currentTime);
    const lastTime = Math.floor(this.lastTimeUpdate);

    this.totalDuration += currentTime;

    if (currentTimeValue < lastTime) {
      const segment = `${currentTimeValue}-${lastTime}`;
      this.replayArea[segment] = (this.replayArea[segment] || 0) + 1;
    }

    this.lastTimeUpdate = currentTimeValue;
  };

  public onClick = () => {
    this.clickCount++;
  };

  public onSkip = () => {
    this.skipCount++;
  };

  public onBounce = () => {
    this.bounceCount++;
  };

  public onVolumeChange = () => {
    this.volumeChangeCount++;
  };

  public onFullScreen = () => {
    this.fullScreenCount++;
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

  public getEngagementRate = (): number => {
    return (
      (this.totalDuration / (this.playCount * this.totalVideoLength)) * 100
    );
  };

  public getBufferDuration = (): number => {
    return this.bufferDuration / 1000;
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
    this.totalVideoLength = 0;
    this.replayArea = {};
  };
}
