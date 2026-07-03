import Link from "next/link";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await buildSafetySnapshot();
  const canBorrow = snapshot.status === "OK";

  return (
    <main className="page">
      <section className="arc-heading">
        <p className="eyebrow">Ayukui River Common</p>
        <h1>今日、鮎喰川コモン前で泳いでよいか</h1>
      </section>

      <p className="lead">
        この表示は安全を保証しません。最終判断は現地の大人/管理者が行い、ライフジャケットを必ず着用してください。
      </p>

      <section className="status-panel" aria-labelledby="status-title">
        <h2 id="status-title">今日の判定</h2>
        <div className={`status ${snapshot.status}`}>{snapshot.status}</div>
        <p>最終更新: {new Date(snapshot.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
        <ul>
          {snapshot.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        {canBorrow ? (
          <Link className="km-button" href="/borrow">今から借ります</Link>
        ) : (
          <span className="km-button" aria-disabled="true">今は貸出できません</span>
        )}
      </section>

      <section className="grid" aria-label="観測値">
        <div className="panel">
          <h2>観測値</h2>
          <ul className="metrics">
            <Metric label="水位" value={format(snapshot.metrics.waterLevelM, "m")} />
            <Metric label="観測所" value={snapshot.metrics.waterLevelStation || "不明"} />
            <Metric label="1時間雨量" value={format(snapshot.metrics.rainfall1hMm, "mm")} />
            <Metric label="24時間雨量" value={format(snapshot.metrics.rainfall24hMm, "mm")} />
            <Metric label="48時間雨量" value={format(snapshot.metrics.rainfall48hMm, "mm")} />
            <Metric label="データ経過" value={format(snapshot.metrics.dataAgeMinutes, "分")} />
          </ul>
        </div>
        <div className="panel">
          <h2>安全ルール</h2>
          <p>
            警報・雷・増水・濁り・流れが速い場合は入らない。データ取得失敗、データ欠損、古いデータの場合は「泳がない」または「判断不可」とします。
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <strong>{label}</strong>
      <br />
      {value}
    </li>
  );
}

function format(value: number | null, unit: string) {
  return value === null ? "不明" : `${value}${unit}`;
}
