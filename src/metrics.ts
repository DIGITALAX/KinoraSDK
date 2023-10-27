/**
 * @class Metrics
 * @description A class that tracks various metrics related to video playback and user interactions.
 */
export class Metrics {
  private playCount: number = 0; // Number of times the video has been played
  private pauseCount: number = 0; // Number of times the video has been paused
  private skipCount: number = 0; // Number of times the video has been skipped
  private totalDuration: number = 0; // Total duration of video playback in seconds
  private clickCount: number = 0; // Number of clicks on the video
  private impressionCount: number = 0; // Number of impressions (views)
  private lastTimeUpdate: number = 0; // Last time the video time was updated
  private bounceCount: number = 0; // Number of bounces (when users leave quickly)
  private volumeChangeCount: number = 0; // Number of times the volume was changed
  private fullScreenCount: number = 0; // Number of times the video entered fullscreen mode
  private bufferCount: number = 0; // Number of times buffering started
  private bufferDuration: number = 0; // Total duration of buffering in seconds
  private totalInteractions: number = 0; // Total number of user interactions
  private preferredTimeToWatch: { [key: string]: number } = {}; // Preferred time to watch the video
  private segmentViewCount: { [key: string]: number } = {}; // Count of segment views
  private replayArea: { [key: string]: number } = {}; // Count of replayed segments

  /**
   * @function onPlay
   * @description Increment play-related metrics and trigger interaction and watch time tracking.
   */
  public onPlay = () => {
    this.playCount++;
    this.impressionCount++;
    this.onInteraction();
    this.onWatchTime();
  };

  /**
   * @function onPause
   * @description Increment pause-related metrics and trigger interaction tracking.
   */
  public onPause = () => {
    this.pauseCount++;
    this.onInteraction();
  };

  /**
   * @function onSegmentView
   * @description Record a segment view and update the count.
   * @param {string} segment - The segment identifier.
   */
  public onSegmentView = (segment: string) => {
    this.segmentViewCount[segment] = (this.segmentViewCount[segment] || 0) + 1;
  };

  /**
   * @function onTimeUpdate
   * @description Handle time updates in the video and update metrics accordingly.
   * @param {number} currentTime - Current playback time in seconds.
   */
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

  /**
   * @function onClick
   * @description Increment the click count and register a user interaction.
   */
  public onClick = () => {
    this.clickCount++;
    this.onInteraction();
  };

  /**
   * @function onSkip
   * @description Increment the skip count and register a user interaction.
   */
  public onSkip = () => {
    this.skipCount++;
    this.onInteraction();
  };

  /**
   * @function onBounce
   * @description Increment the bounce count.
   */
  public onBounce = () => {
    this.bounceCount++;
  };

  /**
   * @function onInteraction
   * @description Increment the total interactions count.
   */
  public onInteraction = () => {
    this.totalInteractions++;
  };

  /**
   * @function onVolumeChange
   * @description Increment the volume change count and register a user interaction.
   */
  public onVolumeChange = () => {
    this.volumeChangeCount++;
    this.onInteraction();
  };

  /**
   * @function onFullScreen
   * @description Increment the fullscreen count and register a user interaction.
   */
  public onFullScreen = () => {
    this.fullScreenCount++;
    this.onInteraction();
  };

  /**
   * @function onWatchTime
   * @description Update the preferred time to watch metric based on the current time.
   */
  public onWatchTime = () => {
    const time = new Date().getHours().toString();
    this.preferredTimeToWatch[time] =
      (this.preferredTimeToWatch[time] || 0) + 1;
  };

  /**
   * @function onBufferStart
   * @description Increment the buffer count and start tracking the buffer duration.
   */
  public onBufferStart = () => {
    this.bufferCount++;
    this.bufferDuration -= new Date().getTime();
  };

  /**
   * @function onBufferEnd
   * @description Stop tracking the buffer duration.
   */
  public onBufferEnd = () => {
    this.bufferDuration += new Date().getTime();
  };

  /**
   * @function getBounceRate
   * @description Calculates and retrieves the bounce rate as a percentage.
   * @returns {number} The bounce rate percentage.
   */
  public getBounceRate = (): number => {
    return (this.bounceCount / this.impressionCount) * 100;
  };

  /**
   * @function getEngagementRate
   * @description Calculates and retrieves the engagement rate based on video length.
   * @param {number} videoLength - The length of the video.
   * @returns {number} The engagement rate percentage.
   */
  public getEngagementRate = (videoLength: number): number => {
    return (this.totalDuration / (this.playCount * videoLength)) * 100;
  };

  /**
   * @function getInteractionRate
   * @description Calculates and retrieves the interaction rate as a percentage.
   * @returns {number} The interaction rate percentage.
   */
  public getInteractionRate = (): number => {
    return (this.totalInteractions / this.impressionCount) * 100;
  };

  /**
   * @function getBufferDuration
   * @description Retrieves the total buffer duration in seconds.
   * @returns {number} The total buffer duration in seconds.
   */
  public getBufferDuration = (): number => {
    return this.bufferDuration / 1000;
  };

  /**
   * @function getMostViewedSegment
   * @description Determines and retrieves the most viewed video segment.
   * @returns {string} The most viewed segment.
   */
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

  /**
   * @function getCTR
   * @description Calculates and retrieves the Click-Through Rate (CTR) as a percentage.
   * @returns {number} The CTR percentage.
   */
  public getCTR = (): number => {
    return (this.clickCount / this.impressionCount) * 100;
  };

  /**
   * @function getAVD
   * @description Calculates and retrieves the Average View Duration (AVD).
   * @returns {number} The AVD.
   */
  public getAVD = (): number => {
    return this.totalDuration / this.playCount;
  };

  /**
   * @function getMostReplayedArea
   * @description Determines and retrieves the most replayed video area.
   * @returns {string} The most replayed area.
   */
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

  /**
   * @function getMostPreferredTimeToWatch
   * @description Determines and retrieves the most preferred time to watch.
   * @returns {string} The most preferred time to watch.
   */
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

  /**
   * @function getPlayPauseRatio
   * @description Calculates and returns the ratio of play events to pause events.
   * @returns {number} The play-pause ratio.
   */
  public getPlayPauseRatio = (): number => {
    return this.playCount / this.pauseCount;
  };

  /**
   * @function getPlayCount
   * @description Retrieves the total count of play events.
   * @returns {number} Total count of play events.
   */
  public getPlayCount = (): number => {
    return this.playCount;
  };

  /**
   * @function getPauseCount
   * @description Retrieves the total count of pause events.
   * @returns {number} Total count of pause events.
   */
  public getPauseCount = (): number => {
    return this.pauseCount;
  };

  /**
   * @function getTotalDuration
   * @description Retrieves the total duration of video playback.
   * @returns {number} Total duration of video playback.
   */
  public getTotalDuration = (): number => {
    return this.totalDuration;
  };

  /**
   * @function getSkipCount
   * @description Retrieves the total count of skip events.
   * @returns {number} Total count of skip events.
   */
  public getSkipCount = (): number => {
    return this.skipCount;
  };

  /**
   * @function getClickCount
   * @description Retrieves the total count of click events.
   * @returns {number} Total count of click events.
   */
  public getClickCount = (): number => {
    return this.clickCount;
  };

  /**
   * @function getImpressionCount
   * @description Retrieves the total count of impressions.
   * @returns {number} Total count of impressions.
   */
  public getImpressionCount = (): number => {
    return this.impressionCount;
  };

  /**
   * @function getVolumeChangeCount
   * @description Retrieves the total count of volume change events.
   * @returns {number} Total count of volume change events.
   */
  public getVolumeChangeCount = (): number => {
    return this.volumeChangeCount;
  };

  /**
   * @function getFullScreenCount
   * @description Retrieves the total count of fullscreen events.
   * @returns {number} Total count of fullscreen events.
   */
  public getFullScreenCount = (): number => {
    return this.fullScreenCount;
  };

  /**
   * @function getBounceCount
   * @description Retrieves the total count of bounce events.
   * @returns {number} Total count of bounce events.
   */
  public getBounceCount = (): number => {
    return this.bounceCount;
  };

  /**
   * @function getBufferCount
   * @description Get the total count of buffer events.
   * @returns {number} Total count of buffer events.
   */
  public getBufferCount = (): number => {
    return this.bufferCount;
  };

  /**
   * @function reset
   * @description Reset all metrics to their initial values.
   */
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
