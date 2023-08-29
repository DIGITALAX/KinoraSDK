export class Metrics {
  private totalDuration: number = 0;
  private numberOfViews: number = 0;
  private numberOfClicks: number = 0;
  private numberOfImpressions: number = 0;
  private numberOfReturnVisits: number = 0;
  private numberOfUniqueVisitors: number = new Set<string>().size;
  private numberOfBounces: number = 0;
  private numberOfTotalVisitors: number = 0;

  constructor() {}

  updateAVD(newDuration: number) {
    this.totalDuration += newDuration;
    this.numberOfViews++;
  }

  getAVD() {
    return this.numberOfViews ? this.totalDuration / this.numberOfViews : 0;
  }

  updateCTR() {
    this.numberOfClicks++;
  }

  getCTR() {
    return this.numberOfImpressions ? (this.numberOfClicks / this.numberOfImpressions) * 100 : 0;
  }

  updateImpressions() {
    this.numberOfImpressions++;
  }

  updateReturnVisitor() {
    this.numberOfReturnVisits++;
  }

  updateUniqueVisitors(visitorId: string) {
    this.numberOfUniqueVisitors++;
  }

  updateBounce() {
    this.numberOfBounces++;
  }

  getBounceRate() {
    return this.numberOfTotalVisitors ? (this.numberOfBounces / this.numberOfTotalVisitors) * 100 : 0;
  }

  updateTotalVisitors() {
    this.numberOfTotalVisitors++;
  }
}