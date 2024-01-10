/**
 * @class Metrics
 * @description A class that tracks various metrics related to video playback and user interactions.
 */
export class Metrics {
  private playCount: number = 0;
  private totalDuration: number = 0;
  private lastUpdateTime: number = 0;
  private totalInteractions: number = 0;
  private videoStarted: boolean = false;
  private isActive: boolean = false;
  private isSeeking: boolean = false;
  private engagementData: Map<number, number> = new Map();

  public onPlay = (videoElement: HTMLVideoElement) => {
    this.isActive = true;
    if (videoElement.currentTime < 0.5) {
      this.videoStarted = true;
    }
    this.lastUpdateTime = videoElement.currentTime;
  };

  public onEnd = (videoElement: HTMLVideoElement) => {
    if (this.videoStarted) {
      this.playCount++;
      this.totalDuration += Math.max(
        0,
        videoElement.currentTime - this.lastUpdateTime
      );
    }
    this.isActive = false;
    this.videoStarted = false;
    this.lastUpdateTime = 0;
  };

  public onTimeUpdate = (videoElement: HTMLVideoElement) => {
    const currentTime = videoElement.currentTime;
    if (this.isActive && this.lastUpdateTime > 0 && !this.isSeeking) {
      const timeWatched = currentTime - this.lastUpdateTime;
      if (timeWatched > 0) {
        this.totalDuration += Math.max(0, timeWatched);
      }
    }
    this.lastUpdateTime = currentTime;
    this.engagementData.set(
      currentTime * 1000,
      (this.engagementData.get(currentTime * 1000) || 0) + 1
    );
  };

  public onPause = () => {
    this.totalInteractions++;
    this.isActive = false;
  };

  public onSeeking = () => {
    if (this.isActive) {
      this.isSeeking = true;
    }
    this.videoStarted = false;
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
    this.isSeeking = false;
    this.lastUpdateTime = videoElement.currentTime;
  };

  public onClick = () => {
    this.totalInteractions++;
  };

  public getMostReplayedArea(): Map<number, number> {
    return this.engagementData;
  }

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
    this.isActive = false;
    this.totalInteractions = 0;
    this.videoStarted = false;
    this.totalDuration = 0;
    this.lastUpdateTime = 0;
    this.isSeeking = false;
    this.engagementData = new Map();
  };
}
