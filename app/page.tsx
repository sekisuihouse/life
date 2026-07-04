import { requireUser } from "@/lib/auth/guards";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BORROW_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfjFMYhbDtq6u87dQI1pW8uB4JxvFP0-Tk_qbKsFGPW9d5fDg/viewform?embedded=true";
const RETURN_FORM_URL =
  "https://docs.google.com/forms/d/1izCPWa-GCklsOO7SCyIe8pt8CeJDXtfC8YualdeUwi8/viewform?embedded=true";

export default async function HomePage() {
  const user = await requireUser();
  if (user.isAdmin) return <TeacherDashboard />;

  const snapshot = await buildSafetySnapshot();
  const canBorrow = snapshot.status === "OK";

  return (
    <main className="page">
      <section className="arc-heading">
        <p className="eyebrow">Ayukui River Common</p>
        <h1>今日の判定</h1>
      </section>

      <section className="status-panel" aria-labelledby="status-title">
        <h2 id="status-title">今日の判定</h2>
        <div className={`status ${snapshot.status}`}>{snapshot.status}</div>
        <p>最終更新: {new Date(snapshot.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>
        <ul>
          {snapshot.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <div className="grid">
        <section className="panel" aria-label="観測値">
          <h2>観測値</h2>
          <ul className="metrics">
            <Metric label="水位" value={format(snapshot.metrics.waterLevelM, "m")} />
            <Metric label="観測所" value={snapshot.metrics.waterLevelStation || "不明"} />
            <Metric label="1時間雨量" value={format(snapshot.metrics.rainfall1hMm, "mm")} />
            <Metric label="24時間雨量" value={format(snapshot.metrics.rainfall24hMm, "mm")} />
            <Metric label="48時間雨量" value={format(snapshot.metrics.rainfall48hMm, "mm")} />
            <Metric label="データ経過" value={format(snapshot.metrics.dataAgeMinutes, "分")} />
          </ul>
        </section>

        <section className="panel" aria-label="返却申請フォーム">
          <h2>返却申請フォーム</h2>
          <GoogleForm title="返却申請フォーム" src={RETURN_FORM_URL} height={732} />
        </section>
      </div>

      <section className="panel form-panel" aria-label="貸し出し申請フォーム">
        <h2>貸し出し申請フォーム</h2>
        {canBorrow ? (
          <GoogleForm title="貸し出し申請フォーム" src={BORROW_FORM_URL} height={732} />
        ) : (
          <p className="notice danger">現在の判定がOKではないため、貸し出し申請フォームは表示しません。</p>
        )}
      </section>
    </main>
  );
}

async function TeacherDashboard() {
  const supabase = createSupabaseAdminClient();
  const [{ data: active }, { data: returned }] = await Promise.all([
    supabase.from("rentals").select("*").is("returned_at", null).order("borrowed_at", { ascending: false }),
    supabase.from("rentals").select("*").not("returned_at", "is", null).order("returned_at", { ascending: false }).limit(100)
  ]);

  return (
    <main className="page">
      <section className="arc-heading">
        <p className="eyebrow">Teacher</p>
        <h1>貸出状況</h1>
      </section>
      <section className="grid">
        <div>
          <h2>貸出中</h2>
          <RentalList rentals={active || []} />
        </div>
        <div>
          <h2>返却済み</h2>
          <RentalList rentals={returned || []} showPhoto />
        </div>
      </section>
    </main>
  );
}

function RentalList({ rentals, showPhoto = false }: { rentals: any[]; showPhoto?: boolean }) {
  if (rentals.length === 0) return <p className="panel">該当する記録はありません。</p>;
  return (
    <div className="list">
      {rentals.map((rental) => (
        <article className="list-row" key={rental.id}>
          <strong>{rental.borrower_name || rental.email}</strong>
          <span>{rental.email}</span>
          <span>貸出: {new Date(rental.borrowed_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>
          <span>{rental.item_count}着</span>
          {rental.returned_at && <span>返却: {new Date(rental.returned_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>}
          {showPhoto && rental.return_photo_url && <img src={rental.return_photo_url} alt="返却写真" />}
        </article>
      ))}
    </div>
  );
}

function GoogleForm({ title, src, height }: { title: string; src: string; height: number }) {
  return (
    <iframe
      className="google-form"
      src={src}
      title={title}
      width="640"
      height={height}
      frameBorder="0"
      marginHeight={0}
      marginWidth={0}
    >
      読み込んでいます…
    </iframe>
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
