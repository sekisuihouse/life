export type SafetyStatus = "OK" | "NG" | "UNKNOWN";

export type SourceState = "ok" | "error" | "stale" | "disabled";
export type HistoryState = "ok" | "insufficient";

export type SafetyMetrics = {
  waterLevelM: number | null;
  waterLevelStation: string | null;
  rainfall10mMm: number | null;
  rainfall1hMm: number | null;
  rainfall3hMm: number | null;
  rainfall24hMm: number | null;
  rainfall48hMm: number | null;
  upstreamRainfall24hMm: number | null;
  upstreamRainfall48hMm: number | null;
  thunderWarning: boolean | null;
  heavyRainWarning: boolean | null;
  floodWarning: boolean | null;
  dataAgeMinutes: number | null;
  waterLevelRisingFast: boolean | null;
};

export type SourceHealth = {
  tokushimaGeojson: "ok" | "error" | "stale";
  jma: "ok" | "error" | "disabled";
  databaseHistory: HistoryState;
};

export type SafetyResponse = {
  status: SafetyStatus;
  updatedAt: string;
  reasons: string[];
  metrics: SafetyMetrics;
  sourceHealth: SourceHealth;
};

export type SafetyInput = {
  now: Date;
  metrics: SafetyMetrics;
  sourceHealth: SourceHealth;
  forceNg?: boolean;
  overrideMessage?: string | null;
};

export type NormalizedObservation = {
  source: string;
  stationName: string;
  stationType: "rain" | "water_level" | "weather";
  riverName: string | null;
  observedAt: string;
  value: number | null;
  unit: string;
  raw: unknown;
};
