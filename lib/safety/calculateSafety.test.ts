import { describe, expect, it } from "vitest";
import { calculateSafety } from "./calculateSafety";
import type { SafetyInput } from "./types";

const base: SafetyInput = {
  now: new Date("2026-07-04T00:00:00.000Z"),
  sourceHealth: { tokushimaGeojson: "ok", jma: "ok", databaseHistory: "ok" },
  metrics: {
    waterLevelM: 1.1,
    waterLevelStation: "鮎喰川 広野",
    rainfall10mMm: 0,
    rainfall1hMm: 0,
    rainfall3hMm: 0,
    rainfall24hMm: 0,
    rainfall48hMm: 0,
    upstreamRainfall24hMm: 0,
    upstreamRainfall48hMm: 0,
    thunderWarning: false,
    heavyRainWarning: false,
    floodWarning: false,
    dataAgeMinutes: 5,
    waterLevelRisingFast: false
  }
};

describe("calculateSafety", () => {
  it("returns OK only when every required signal is safe", () => {
    expect(calculateSafety(base).status).toBe("OK");
  });

  it("returns NG when the water level reaches standby level", () => {
    const result = calculateSafety({
      ...base,
      metrics: { ...base.metrics, waterLevelM: 2.6 }
    });
    expect(result.status).toBe("NG");
  });

  it("returns UNKNOWN when history is insufficient", () => {
    const result = calculateSafety({
      ...base,
      sourceHealth: { ...base.sourceHealth, databaseHistory: "insufficient" }
    });
    expect(result.status).toBe("UNKNOWN");
  });
});
