export class Metrics {
  private totalDuration: number = 0;
  private numberOfImpressions: number = 0;
  private numberOfClicks: number = 0;
  private totalIdleTime: number = 0;
  private numberOfRecordings: number = 0;
  private numberOfFailedTasks: number = 0;
  private numberOfMultistreams: number = 0;
  private numberOfAssets: number = 0;
  private numberOfUpdates: number = 0;
  private startTime: number = 0;

  updateAVD = (duration: number) => {
    this.totalDuration += duration;
  };

  updateStartTime = () => {
    this.startTime = new Date().getTime();
  };

  updateNumberOfRecordings = () => {
    this.numberOfRecordings++;
  };

  updateNumberofMultistreams = () => {
    this.numberOfMultistreams++;
  };

  updateNumberOfFailedTasks = () => {
    this.numberOfFailedTasks++;
  };

  updateImpressions() {
    this.numberOfImpressions++;
  }

  updateNumberOfUpdates = () => {
    this.numberOfUpdates++;
  };

  updateNumberOfAssets = () => {
    this.numberOfAssets++;
  };

  updateNumberOfClicks = () => {
    this.numberOfClicks++;
  };

  updateIdleTime = () => {
    const currentTime = new Date().getTime();
    this.totalIdleTime += currentTime - this.startTime;
  };

  getAVD = () => {
    return this.totalDuration / this.numberOfImpressions;
  };

  getCTR = () => {
    return (this.numberOfClicks / this.numberOfImpressions) * 100;
  };

  getRecordingPerSession = () => {
    return this.numberOfRecordings;
  };

  getTaskFailureRate = () => {
    return (
      this.numberOfFailedTasks /
      (this.numberOfFailedTasks + this.numberOfUpdates)
    );
  };

  getMultistreamUsageRate = () => {
    return this.numberOfMultistreams / this.numberOfImpressions;
  };

  getAssetEngagement = () => {
    return this.numberOfAssets / this.numberOfUpdates;
  };

  getUserEngagementRatio = () => {
    return this.totalDuration / (this.totalDuration + this.totalIdleTime);
  };

  getNumberOfClicks = () => {
    return this.numberOfClicks;
  };

  getNumberOfAssets = () => {
    return this.numberOfAssets;
  };

  getNumberOfImpressions = () => {
    return this.numberOfImpressions;
  };

  getTotalIdleTime = () => {
    return this.totalIdleTime;
  };

  getNumberOfUpdates = () => {
    return this.numberOfUpdates;
  };

  getNumberOfMultistreams = () => {
    return this.numberOfMultistreams;
  };

  getNumberofFailedTasks = () => {
    return this.numberOfFailedTasks;
  };

  getTotalDuration = () => {
    return this.totalDuration;
  };

  getNumberOfRecordings = () => {
    return this.numberOfRecordings;
  };
}
