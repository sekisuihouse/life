import { borrowAction, returnAction } from "@/app/actions";
import { requireUser } from "@/lib/auth/guards";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  if (user.isAdmin) return <TeacherDashboard />;

  const [snapshot, activeRental] = await Promise.all([buildSafetySnapshot(), getActiveRental(user.id)]);
  const statusLabel = activeRental ? "貸出中" : "返却済み";
  const canBorrow = snapshot.status === "OK" && !activeRental;
  const canReturn = Boolean(activeRental);

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

      <section className="panel action-panel" aria-label="自分のステータス">
        <h2>自分のステータス</h2>
        <div className="status-label">{statusLabel}</div>
        {activeRental && (
          <p>
            貸出開始: {new Date(activeRental.borrowed_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </p>
        )}
        <div className="button-row">
          <form action={borrowAction}>
            <button className="km-button" disabled={!canBorrow}>
              貸し出し申請フォームを開く
            </button>
          </form>
          <form action={returnAction}>
            {activeRental && <input type="hidden" name="rental_id" value={activeRental.id} />}
            <button className="km-button" disabled={!canReturn}>
              返却申請フォームを開く
            </button>
          </form>
        </div>
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
          <p>貸出中の時だけ返却申請フォームを開けます。</p>
        </section>
      </div>

      <section className="panel form-panel" aria-label="貸し出し申請フォーム">
        <h2>貸し出し申請フォーム</h2>
        <p>返却済み、かつ今日の判定がOKの時だけ貸し出し申請フォームを開けます。</p>
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

async function getActiveRental(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("rentals")
    .select("id, borrowed_at")
    .eq("user_id", userId)
    .is("returned_at", null)
    .maybeSingle();
  return data;
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
