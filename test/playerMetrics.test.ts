import { expect } from "chai";
import { Sequence } from "./../src";
import { Metrics } from "src/metrics";
import { describe } from "mocha";

describe("Metrics Tracking", () => {
  beforeEach(() => {
    metrics = new Metrics();

    sequence = new Sequence(mockPlayer);
  });

  it("should update CTR", () => {
    metrics.updateCTR();
    expect(metrics.getCTR()).toBe(0); // Replace 0 with expected value
  });

  it("should update AVD", () => {
    metrics.updateAVD(5);
    expect(metrics.getAVD()).toBe(5);
  });
});

describe("Sequence Class", () => {});
