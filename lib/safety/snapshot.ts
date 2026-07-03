import { calculateSafety } from "./calculateSafety";
import type { NormalizedObservation, SafetyMetrics, SafetyResponse, SourceHealth } from "./types";
import { fetchJmaWarnings } from "@/lib/providers/jma";
import { fetchTokushimaObservations, selectHirono } from "@/lib/providers/tokushima";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function buildSafetySnapshot(): Promise<SafetyResponse> {
  const now = new Date();
  const [tokushima, jma] = await Promise.all([safeTokushima(), fetchJmaWarnings()]);
  const selected = selectHirono(tokushima.observations);
  const db = await persistAndReadHistory(tokushima.observations);
  const override = await readOverride();
  const latestObservedAt = latestDate([selected.rain?.observedAt, selected.waterLevel?.observedAt]);
  const dataAgeMinutes = latestObservedAt ? Math.round((now.getTime() - latestObservedAt.getTime()) / 60000) : null;

  const metrics: SafetyMetrics = {
    waterLevelM: selected.waterLevel?.value ?? null,
    waterLevelStation: selected.waterLevel ? `${selected.waterLevel.riverName || ""} ${selected.waterLevel.stationName}`.trim() : null,
    rainfall10mMm: selected.rain?.value ?? null,
    rainfall1hMm: selected.rain?.value ?? null,
    rainfall3hMm: db.rainfall3hMm,
    rainfall24hMm: db.rainfall24hMm,
    rainfall48hMm: db.rainfall48hMm,
    upstreamRainfall24hMm: db.upstreamRainfall24hMm,
    upstreamRainfall48hMm: db.upstreamRainfall48hMm,
    thunderWarning: jma.thunderWarning,
    heavyRainWarning: jma.heavyRainWarning,
    floodWarning: jma.floodWarning,
    dataAgeMinutes,
    waterLevelRisingFast: db.waterLevelRisingFast
  };

  const sourceHealth: SourceHealth = {
    tokushimaGeojson: tokushima.ok ? (dataAgeMinutes !== null && dataAgeMinutes <= 20 ? "ok" : "stale") : "error",
    jma: process.env.JMA_PROVIDER_ENABLED === "true" ? (jma.ok ? "ok" : "error") : "disabled",
    databaseHistory: db.historyOk ? "ok" : "insufficient"
  };

  const snapshot = calculateSafety({
    now,
    metrics,
    sourceHealth,
    forceNg: override.forceNg,
    overrideMessage: override.message
  });

  await saveSnapshot(snapshot);
  return snapshot;
}

async function safeTokushima() {
  try {
    return await fetchTokushimaObservations();
  } catch {
    return { observations: [] as NormalizedObservation[], ok: false };
  }
}

async function persistAndReadHistory(observations: NormalizedObservation[]) {
  try {
    const supabase = createSupabaseAdminClient();
    if (observations.length > 0) {
      await supabase.from("observations").insert(
        observations.map((observation) => ({
          source: observation.source,
          station_name: observation.stationName,
          station_type: observation.stationType,
          river_name: observation.riverName,
          observed_at: observation.observedAt,
          value: observation.value,
          unit: observation.unit,
          raw_json: observation.raw
        }))
      );
    }

    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("observations")
      .select("station_name, station_type, river_name, observed_at, value")
      .gte("observed_at", since48h)
      .order("observed_at", { ascending: true });

    const rows = data || [];
    const rainRows = rows.filter((row) => row.station_type === "rain" && typeof row.value === "number");
    const waterRows = rows.filter((row) => row.station_type === "water_level" && typeof row.value === "number");

    return {
      rainfall3hMm: sumRain(rainRows, 3),
      rainfall24hMm: sumRain(rainRows, 24),
      rainfall48hMm: sumRain(rainRows, 48),
      upstreamRainfall24hMm: sumRain(rainRows, 24),
      upstreamRainfall48hMm: sumRain(rainRows, 48),
      waterLevelRisingFast: detectRisingFast(waterRows),
      historyOk: rainRows.length >= 2 && waterRows.length >= 2
    };
  } catch {
    return {
      rainfall3hMm: null,
      rainfall24hMm: null,
      rainfall48hMm: null,
      upstreamRainfall24hMm: null,
      upstreamRainfall48hMm: null,
      waterLevelRisingFast: null,
      historyOk: false
    };
  }
}

function sumRain(rows: Array<{ observed_at: string; value: number | null }>, hours: number) {
  const since = Date.now() - hours * 60 * 60 * 1000;
  const values = rows.filter((row) => new Date(row.observed_at).getTime() >= since);
  if (values.length === 0) return null;
  return Number(values.reduce((sum, row) => sum + (row.value || 0), 0).toFixed(1));
}

function detectRisingFast(rows: Array<{ observed_at: string; value: number | null }>) {
  const values = rows
    .filter((row) => typeof row.value === "number")
    .slice(-4);
  if (values.length < 2) return null;
  const first = values[0].value || 0;
  const last = values[values.length - 1].value || 0;
  return last - first >= 0.3;
}

async function readOverride() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("admin_overrides")
      .select("force_ng, message")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { forceNg: Boolean(data?.force_ng), message: data?.message || null };
  } catch {
    return { forceNg: false, message: null };
  }
}

async function saveSnapshot(snapshot: SafetyResponse) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("safety_snapshots").insert({
      status: snapshot.status,
      reasons: snapshot.reasons,
      metrics: snapshot.metrics,
      source_health: snapshot.sourceHealth,
      calculated_at: snapshot.updatedAt
    });
  } catch {
    // Safety response must still be returned if persistence is unavailable.
  }
}

function latestDate(values: Array<string | undefined>) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] || null;
}
