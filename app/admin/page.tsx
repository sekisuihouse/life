import { adminOverrideAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const [{ data: active }, { data: returned }, { data: override }] = await Promise.all([
    supabase.from("rentals").select("*").is("returned_at", null).order("borrowed_at", { ascending: false }),
    supabase.from("rentals").select("*").not("returned_at", "is", null).order("returned_at", { ascending: false }).limit(50),
    supabase.from("admin_overrides").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  return (
    <main className="page">
      <section className="arc-heading">
        <p className="eyebrow">Admin</p>
        <h1>教員用 管理画面</h1>
      </section>

      <section className="panel">
        <h2>手動安全判定</h2>
        <form className="form" action={adminOverrideAction}>
          <label className="field">
            <span>
              <input type="checkbox" name="force_ng" defaultChecked={Boolean(override?.force_ng)} /> 強制的にNGにする
            </span>
          </label>
          <label className="field">
            表示メッセージ
            <textarea name="message" defaultValue={override?.message || ""} />
          </label>
          <button className="km-button">保存</button>
        </form>
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
          <span>{rental.item_count}着 / {rental.size}</span>
          {rental.memo && <span>メモ: {rental.memo}</span>}
          {rental.returned_at && <span>返却: {new Date(rental.returned_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>}
          {rental.return_comment && <span>返却コメント: {rental.return_comment}</span>}
          {showPhoto && rental.return_photo_url && <img src={rental.return_photo_url} alt="返却写真" />}
        </article>
      ))}
    </div>
  );
}
