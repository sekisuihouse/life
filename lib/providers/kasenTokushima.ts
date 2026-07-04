import type { NormalizedObservation } from "@/lib/safety/types";

const BASE = "https://www.kasen.pref.tokushima.lg.jp/sp/status";
const WATER_10M_URL = `${BASE}/river_log_0_21.html`;
const WATER_60M_URL = `${BASE}/river_log_1_21.html`;
const RAIN_10M_URL = `${BASE}/rain_log_0_37.html`;
const RAIN_60M_URL = `${BASE}/rain_log_1_37.html`;

type ParsedRow = {
  observedAt: string;
  value: number;
};

export async function fetchKasenHironoObservations() {
  const [water10m, water60m, rain10m, rain60m] = await Promise.all([
    fetchHtml(WATER_10M_URL),
    fetchHtml(WATER_60M_URL),
    fetchHtml(RAIN_10M_URL),
    fetchHtml(RAIN_60M_URL)
  ]);

  const observations: NormalizedObservation[] = [
    ...parseWaterRows(water10m),
    ...parseWaterRows(water60m),
    ...parseRainRows(rain10m),
    ...parseRainRows(rain60m)
  ];

  return {
    observations: dedupeObservations(observations),
    ok: observations.length > 0
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Tokushima kasen page failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return new TextDecoder("shift_jis").decode(buffer);
}

function parseWaterRows(html: string): NormalizedObservation[] {
  return parseTableRows(html, "last")
    .map((row) => ({
      source: "tokushima_kasen_html",
      stationName: "広野",
      stationType: "water_level" as const,
      riverName: "鮎喰川",
      observedAt: row.observedAt,
      value: row.value,
      unit: "m",
      raw: { sourceUrl: WATER_10M_URL }
    }));
}

function parseRainRows(html: string): NormalizedObservation[] {
  return parseTableRows(html, "second")
    .map((row) => ({
      source: "tokushima_kasen_html",
      stationName: "広野",
      stationType: "rain" as const,
      riverName: null,
      observedAt: row.observedAt,
      value: row.value,
      unit: "mm",
      raw: { sourceUrl: RAIN_10M_URL }
    }));
}

function parseTableRows(html: string, valueColumn: "second" | "last"): ParsedRow[] {
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
  return rows.flatMap((row) => {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) =>
      normalizeCell(stripTags(match[1]))
    );
    if (cells.length < 2) return [];
    const text = cells.join(" ");
    const time = text.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (!time) return [];
    const valueCell = valueColumn === "second" ? cells[1] : cells[cells.length - 1];
    const value = Number(valueCell.match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
    if (value === undefined || !Number.isFinite(value)) return [];
    return [{ observedAt: toIsoString(time), value }];
  });
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
}

function normalizeCell(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoString(match: RegExpMatchArray) {
  const now = new Date();
  const year = now.getFullYear();
  const month = Number(match[1]);
  const day = Number(match[2]);
  let hour = Number(match[3]);
  const minute = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day, hour === 24 ? 0 : hour, minute));
  if (hour === 24) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(date.getUTCHours() - 9);
  return date.toISOString();
}

function dedupeObservations(observations: NormalizedObservation[]) {
  const map = new Map<string, NormalizedObservation>();
  for (const observation of observations) {
    map.set(`${observation.stationType}:${observation.observedAt}:${observation.value}`, observation);
  }
  return [...map.values()].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}
