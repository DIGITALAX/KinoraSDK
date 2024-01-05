/**
 * @class Metrics
 * @description A class that tracks various metrics related to video playback and user interactions.
 */
export class Metrics {
  private playCount: number = 0;
  private totalDuration: number = 0;
  private segmentWatchTimes: { [key: string]: number } = {};
  private lastUpdateTime: number = 0;
  private totalInteractions: number = 0;
  private videoStarted: boolean = false;

  public onPlay = (videoElement: HTMLVideoElement) => {
    if (videoElement.currentTime < 0.5) {
      this.videoStarted = true;
    }
    this.lastUpdateTime = videoElement.currentTime;
  };

  public onEnd = (videoElement: HTMLVideoElement) => {
    if (this.videoStarted) {
      this.playCount++;
      this.totalDuration += videoElement.currentTime - this.lastUpdateTime;
    }
    this.videoStarted = false;
    this.lastUpdateTime = 0;
  };

  public onTimeUpdate = (videoElement: HTMLVideoElement) => {
    const currentTime = videoElement.currentTime;
    if (this.lastUpdateTime > 0) {
      const timeWatched = currentTime - this.lastUpdateTime;
      this.totalDuration += timeWatched;
      const segmentKey = this.identifySegment(currentTime);
      if (!this.segmentWatchTimes[segmentKey]) {
        this.segmentWatchTimes[segmentKey] = 0;
      }
      this.segmentWatchTimes[segmentKey] += timeWatched;
    }
    this.lastUpdateTime = currentTime;
  };

  public onPause = () => {
    this.totalInteractions++;
  };

  public onVolumeChange = () => {
    this.totalInteractions++;
  };

  public onMuteToggle = () => {
    this.totalInteractions++;
  };

  public onQualityChange = () => {
    this.totalInteractions++;
  };

  public onFullscreenToggle = () => {
    this.totalInteractions++;
  };

  public onSeeked = (videoElement: HTMLVideoElement) => {
    this.totalInteractions++;
    this.videoStarted = false;
    this.lastUpdateTime = videoElement.currentTime;
  };

  public onClick = () => {
    this.totalInteractions++;
  };

  private identifySegment = (currentTime: number): string => {
    const segmentDuration = 10;
    const segmentStart =
      Math.floor(currentTime / segmentDuration) * segmentDuration;
    const segmentEnd = segmentStart + segmentDuration;
    const segmentKey = `${this.formatTime(
      segmentStart,
      currentTime % 1,
    )}-${this.formatTime(segmentEnd, currentTime % 1)}`;
    return segmentKey;
  };

  private formatTime = (
    timeInSeconds: number,
    fractionalSeconds: number,
  ): string => {
    let totalSeconds = Math.floor(timeInSeconds);
    let ms = Math.floor(fractionalSeconds * 1000);
    let date = new Date(totalSeconds * 1000);
    let hours = date.getUTCHours();
    let minutes = date.getUTCMinutes();
    let seconds = date.getUTCSeconds();
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${ms
      .toString()
      .padStart(3, "0")}`;
  };

  public getMostReplayedArea = (): string => {
    let mostReplayedSegmentKey = "";
    let maxWatchTime = 0;

    for (const [segmentKey, time] of Object.entries(this.segmentWatchTimes)) {
      if (time > maxWatchTime) {
        maxWatchTime = time;
        mostReplayedSegmentKey = segmentKey;
      }
    }

    return mostReplayedSegmentKey || "No replays";
  };

  public getAVD = (): number => {
    if (this.playCount === 0) {
      return 0;
    }
    return this.totalDuration / this.playCount;
  };

  public getPlayCount = (): number => {
    return this.playCount;
  };

  public getTotalDuration = (): number => {
    return this.totalDuration;
  };

  public getTotalInteractions = (): number => {
    return this.totalInteractions;
  };

  public reset = () => {
    this.playCount = 0;
    this.totalInteractions = 0;
    this.videoStarted = false;
    this.totalDuration = 0;
    this.lastUpdateTime = 0;
    this.segmentWatchTimes = {};
  };
}
