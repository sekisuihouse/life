import { returnAction } from "@/app/actions";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReturnPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const supabase = createSupabaseAdminClient();
  const { data: rentals } = await supabase
    .from("rentals")
    .select("id, borrowed_at, item_count, size, memo")
    .eq("user_id", user.id)
    .is("returned_at", null)
    .order("borrowed_at", { ascending: false });

  return (
    <main className="page page-narrow">
      <section className="arc-heading">
        <p className="eyebrow">Return</p>
        <h1>返却写真を投稿</h1>
      </section>
      {params.created === "1" && <p className="notice">貸出を記録しました。返却時は写真を投稿してください。</p>}
      {params.returned === "1" && <p className="notice">返却を記録しました。</p>}
      {params.error === "photo" && <p className="notice danger">返却写真は必須です。</p>}
      {params.error === "upload" && <p className="notice danger">写真アップロードに失敗しました。</p>}

      {!rentals || rentals.length === 0 ? (
        <p className="panel">未返却の貸出はありません。</p>
      ) : (
        <div className="list">
          {rentals.map((rental) => (
            <form className="form panel" action={returnAction} key={rental.id}>
              <input type="hidden" name="rental_id" value={rental.id} />
              <p>
                {new Date(rental.borrowed_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} / {rental.item_count}着 / {rental.size}
              </p>
              {rental.memo && <p>{rental.memo}</p>}
              <label className="field">
                返却写真
                <input name="photo" type="file" accept="image/*" required />
              </label>
              <label className="field">
                返却コメント
                <textarea name="return_comment" />
              </label>
              <button className="km-button">返却する</button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
}
