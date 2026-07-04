export type TsukumijimaForecast = {
  todayRainChancePercent: number | null;
  ok: boolean;
};

export async function fetchTodayRainChance(): Promise<TsukumijimaForecast> {
  const cityCode = process.env.TSUKUMIJIMA_CITY_CODE || "360010";
  try {
    const response = await fetch(`https://weather.tsukumijima.net/api/forecast/city/${cityCode}`, {
      next: { revalidate: 600 }
    });
    if (!response.ok) throw new Error(`weather.tsukumijima.net failed: ${response.status}`);
    const data = await response.json();
    const today = Array.isArray(data.forecasts) ? data.forecasts[0] : null;
    const chance = today?.chanceOfRain ? maxChance(today.chanceOfRain) : null;
    return { todayRainChancePercent: chance, ok: chance !== null };
  } catch {
    return { todayRainChancePercent: null, ok: false };
  }
}

function maxChance(chanceOfRain: Record<string, unknown>) {
  const values = Object.values(chanceOfRain)
    .map((value) => (typeof value === "string" ? Number(value.replace("%", "")) : NaN))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : null;
}
