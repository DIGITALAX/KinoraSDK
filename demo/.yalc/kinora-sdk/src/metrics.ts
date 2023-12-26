/**
 * @class Metrics
 * @description A class that tracks various metrics related to video playback and user interactions.
 */
export class Metrics {
  private playCount: number = 0; // Number of times the video has been played
  private pauseCount: number = 0; // Number of times the video has been paused
  private totalDuration: number = 0; // Total duration of video playback in seconds
  private clickCount: number = 0; // Number of clicks on the video
  private impressionCount: number = 0; // Number of impressions (views)
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
   * @function onClick
   * @description Increment the click count and register a user interaction.
   */
  public onClick = () => {
    this.clickCount++;
    this.onInteraction();
  };

  /**
   * @function onInteraction
   * @description Increment the total interactions count.
   */
  public onInteraction = () => {
    this.totalInteractions++;
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
   * @function reset
   * @description Reset all metrics to their initial values.
   */
  public reset = () => {
    this.playCount = 0;
    this.pauseCount = 0;
    this.totalDuration = 0;
    this.clickCount = 0;
    this.impressionCount = 0;
    this.totalInteractions = 0;
    this.preferredTimeToWatch = {};
    this.segmentViewCount = {};
    this.replayArea = {};
  };
}
