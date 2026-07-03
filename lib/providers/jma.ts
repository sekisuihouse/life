export type JmaWarnings = {
  thunderWarning: boolean | null;
  heavyRainWarning: boolean | null;
  floodWarning: boolean | null;
  ok: boolean;
};

export async function fetchJmaWarnings(): Promise<JmaWarnings> {
  if (process.env.JMA_PROVIDER_ENABLED !== "true") {
    return { thunderWarning: null, heavyRainWarning: null, floodWarning: null, ok: false };
  }

  try {
    const response = await fetch("https://www.jma.go.jp/bosai/warning/data/warning/360000.json", {
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error(`JMA warnings failed: ${response.status}`);
    const data = await response.json();
    const text = JSON.stringify(data);
    return {
      thunderWarning: text.includes("雷"),
      heavyRainWarning: text.includes("大雨"),
      floodWarning: text.includes("洪水"),
      ok: true
    };
  } catch {
    return { thunderWarning: null, heavyRainWarning: null, floodWarning: null, ok: false };
  }
}
