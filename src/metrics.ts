/**
 * @class Metrics
 * @description A class that tracks various metrics related to video playback and user interactions.
 */
export class Metrics {
  private playCount: number = 0; // Number of times the video has been played.
  private totalDuration: number = 0; // Total duration for which the video has been watched.
  private lastUpdateTime: number = 0; // Last time the video's currentTime was updated.
  private totalInteractions: number = 0; // Total number of interactions with the video player.
  private videoStarted: boolean = false; // Flag to check if video started playing.
  private isActive: boolean = false; // Flag to check if video is actively being played.
  private isSeeking: boolean = false; // Flag to check if video is in seeking state.
  private engagementData: Map<number, number> = new Map(); // Map to store engagement data based on video's current time.

  // Event handler for play event, updating activity status and last update time.
  public onPlay = (videoElement: HTMLVideoElement) => {
    this.isActive = true;
    if (videoElement.currentTime < 0.5) {
      this.videoStarted = true;
    }
    this.lastUpdateTime = videoElement.currentTime;
  };

  // Event handler for end event, updating play count, total duration, and resetting flags.
  public onEnd = (videoElement: HTMLVideoElement) => {
    if (this.videoStarted) {
      this.playCount++;
      this.totalDuration += Math.max(
        0,
        videoElement.currentTime - this.lastUpdateTime,
      );
    }
    this.isActive = false;
    this.videoStarted = false;
    this.lastUpdateTime = 0;
  };

  // Event handler for time update event, capturing engagement data.
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
      (this.engagementData.get(currentTime * 1000) || 0) + 1,
    );
  };

  // Event handler for pause event, increments total interactions and updates activity status.
  public onPause = () => {
    this.totalInteractions++;
    this.isActive = false;
  };

  // Event handler for seeking event, sets seeking status and increments interactions.
  public onSeeking = () => {
    if (this.isActive) {
      this.isSeeking = true;
    }
    this.videoStarted = false;
    this.totalInteractions++;
  };

  // Event handler for volume change, increments total interactions.
  public onVolumeChange = () => {
    this.totalInteractions++;
  };

  // Event handler for mute toggle, increments total interactions.
  public onMuteToggle = () => {
    this.totalInteractions++;
  };

  // Event handler for quality change, increments total interactions.
  public onQualityChange = () => {
    this.totalInteractions++;
  };

  // Event handler for fullscreen toggle, increments total interactions.
  public onFullscreenToggle = () => {
    this.totalInteractions++;
  };

  // Event handler for seeked event, updates interactions, seeking status, and last update time.
  public onSeeked = (videoElement: HTMLVideoElement) => {
    this.totalInteractions++;
    this.videoStarted = false;
    this.isSeeking = false;
    this.lastUpdateTime = videoElement.currentTime;
  };

  // Event handler for click event, increments total interactions.
  public onClick = () => {
    this.totalInteractions++;
  };

  // Returns the engagement data map.
  public getMostReplayedArea(): Map<number, number> {
    return this.engagementData;
  }

  // Calculates and returns the average view duration (AVD).
  public getAVD = (): number => {
    if (this.playCount === 0) {
      return 0;
    }
    return this.totalDuration / this.playCount;
  };

  // Returns the play count.
  public getPlayCount = (): number => {
    return this.playCount;
  };

  // Returns the total duration of video watched.
  public getTotalDuration = (): number => {
    return this.totalDuration;
  };

  // Returns the total number of interactions with the video player.
  public getTotalInteractions = (): number => {
    return this.totalInteractions;
  };

  // Resets all metrics to initial values.
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
