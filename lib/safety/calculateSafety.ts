import type { SafetyInput, SafetyResponse } from "./types";

const LIMITS = {
  maxAgeMinutes: 20,
  standbyWaterLevelM: 2.6,
  floodWatchWaterLevelM: 3.9,
  rainfall1hMm: 10,
  rainfall3hMm: 20,
  rainfall24hMm: 30,
  rainfall48hMm: 50,
  upstream24hMm: 30,
  upstream48hMm: 50
};

export function calculateSafety(input: SafetyInput): SafetyResponse {
  const reasons: string[] = [];
  const unknown: string[] = [];
  const { metrics } = input;

  if (input.forceNg) {
    reasons.push(input.overrideMessage || "管理者が手動で利用停止にしています。");
  }

  if (input.sourceHealth.tokushimaGeojson !== "ok") {
    unknown.push("徳島県オープンデータの取得または鮮度確認に問題があります。");
  }

  if (input.sourceHealth.databaseHistory !== "ok") {
    unknown.push("24時間/48時間雨量を判断するための履歴が不足しています。");
  }

  if (metrics.waterLevelStation === null) {
    unknown.push("鮎喰川・広野観測所を特定できません。");
  }

  if (metrics.waterLevelM === null) {
    reasons.push("現在水位を確認できません。");
  } else {
    if (metrics.waterLevelM >= LIMITS.floodWatchWaterLevelM) {
      reasons.push(`広野観測所の水位が氾濫注意水位 ${LIMITS.floodWatchWaterLevelM}m 以上です。`);
    } else if (metrics.waterLevelM >= LIMITS.standbyWaterLevelM) {
      reasons.push(`広野観測所の水位が水防団待機水位 ${LIMITS.standbyWaterLevelM}m 以上です。`);
    }
  }

  if (metrics.dataAgeMinutes === null) {
    reasons.push("観測データの更新時刻を確認できません。");
  } else if (metrics.dataAgeMinutes > LIMITS.maxAgeMinutes) {
    reasons.push(`観測データが ${LIMITS.maxAgeMinutes} 分以上古いです。`);
  }

  if (metrics.waterLevelRisingFast === true) {
    reasons.push("水位が急上昇しています。");
  } else if (metrics.waterLevelRisingFast === null) {
    unknown.push("水位変化の傾向を確認できません。");
  }

  addRainReason(reasons, unknown, metrics.rainfall1hMm, LIMITS.rainfall1hMm, "直近1時間雨量");
  addRainReason(reasons, unknown, metrics.rainfall3hMm, LIMITS.rainfall3hMm, "直近3時間雨量");
  addRainReason(reasons, unknown, metrics.rainfall24hMm, LIMITS.rainfall24hMm, "直近24時間雨量");
  addRainReason(reasons, unknown, metrics.rainfall48hMm, LIMITS.rainfall48hMm, "直近48時間雨量");
  addRainReason(reasons, unknown, metrics.upstreamRainfall24hMm, LIMITS.upstream24hMm, "上流・近隣24時間雨量");
  addRainReason(reasons, unknown, metrics.upstreamRainfall48hMm, LIMITS.upstream48hMm, "上流・近隣48時間雨量");

  if (metrics.heavyRainWarning === true) reasons.push("大雨警報・注意報が出ています。");
  if (metrics.floodWarning === true) reasons.push("洪水警報・注意報が出ています。");
  if (metrics.thunderWarning === true) reasons.push("雷注意報が出ています。");
  if (metrics.heavyRainWarning === null || metrics.floodWarning === null || metrics.thunderWarning === null) {
    unknown.push("気象庁の警報・注意報を確認できません。");
  }

  const status = reasons.length > 0 ? "NG" : unknown.length > 0 ? "UNKNOWN" : "OK";

  return {
    status,
    updatedAt: input.now.toISOString(),
    reasons: status === "OK" ? ["条件上は利用可です。ただし安全を保証するものではありません。"] : [...reasons, ...unknown],
    metrics,
    sourceHealth: input.sourceHealth
  };
}

function addRainReason(
  reasons: string[],
  unknown: string[],
  value: number | null,
  limit: number,
  label: string
) {
  if (value === null) {
    unknown.push(`${label}を確認できません。`);
    return;
  }
  if (value >= limit) {
    reasons.push(`${label}が ${limit}mm 以上です。`);
  }
}
