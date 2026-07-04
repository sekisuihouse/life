import type { NormalizedObservation } from "@/lib/safety/types";
import { fetchKasenHironoObservations } from "./kasenTokushima";

type GeoJsonFeature = {
  properties?: Record<string, unknown>;
  geometry?: unknown;
};

const DEFAULTS = {
  rain: "http://tk.ecitizen.jp/Data/Rain/Rainfall.geojson",
  water: "http://tk.ecitizen.jp/Data/River/RiverLevel.geojson",
  weather: "http://tk.ecitizen.jp/Data/Road/RoadWeather.geojson"
};

export async function fetchTokushimaObservations() {
  const [rain, water, weather] = await Promise.allSettled([
    fetchGeojson(process.env.TOKUSHIMA_RAIN_URL || DEFAULTS.rain, "rain"),
    fetchGeojson(process.env.TOKUSHIMA_WATER_URL || DEFAULTS.water, "water_level"),
    fetchGeojson(process.env.TOKUSHIMA_WEATHER_URL || DEFAULTS.weather, "weather")
  ]);

  const observations = [rain, water, weather].flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  if (rain.status !== "fulfilled" || water.status !== "fulfilled" || observations.length === 0) {
    return fetchKasenHironoObservations();
  }
  return {
    observations,
    ok: rain.status === "fulfilled" && water.status === "fulfilled"
  };
}

async function fetchGeojson(url: string, stationType: NormalizedObservation["stationType"]) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Tokushima GeoJSON failed: ${response.status}`);
  const json = await response.json();
  const features = Array.isArray(json.features) ? (json.features as GeoJsonFeature[]) : [];
  return features.map((feature) => normalizeFeature(feature, stationType)).filter(Boolean) as NormalizedObservation[];
}

function normalizeFeature(feature: GeoJsonFeature, stationType: NormalizedObservation["stationType"]) {
  const props = feature.properties || {};
  const stationName = pickString(props, ["局名", "観測局名", "観測所名", "station_name", "name", "Name"]);
  if (!stationName) return null;
  const riverName = pickString(props, ["河川名", "river_name", "RiverName"]);
  const observedAt = pickDate(props) || new Date().toISOString();
  const value = pickNumber(props, stationType === "water_level" ? ["水位", "value", "Value", "WL"] : ["雨量", "時間雨量", "value", "Value"]);
  return {
    source: "tokushima_geojson",
    stationName,
    stationType,
    riverName,
    observedAt,
    value,
    unit: stationType === "water_level" ? "m" : stationType === "rain" ? "mm" : "",
    raw: { properties: props, geometry: feature.geometry }
  };
}

export function selectHirono(observations: NormalizedObservation[]) {
  const rain = observations
    .filter((observation) => observation.stationType === "rain")
    .sort(scoreObservation)[0] || null;
  const waterLevel = observations
    .filter((observation) => observation.stationType === "water_level")
    .sort(scoreObservation)[0] || null;
  return { rain, waterLevel };
}

function scoreObservation(a: NormalizedObservation, b: NormalizedObservation) {
  const scoreDiff = score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime();
}

function score(observation: NormalizedObservation) {
  let value = 0;
  if (observation.stationName.includes("広野")) value += 10;
  if (observation.stationName.includes("神山")) value += 4;
  if (observation.riverName?.includes("鮎喰川")) value += 8;
  return value;
}

function pickString(props: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(props: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = props[key];
    const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function pickDate(props: Record<string, unknown>) {
  const value = pickString(props, ["観測時刻", "日時", "observed_at", "date", "DateTime"]);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
