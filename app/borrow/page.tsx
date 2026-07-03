import { borrowAction } from "@/app/actions";
import { requireUser } from "@/lib/auth/guards";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";

export const dynamic = "force-dynamic";

export default async function BorrowPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, snapshot, params] = await Promise.all([requireUser(), buildSafetySnapshot(), searchParams]);
  const disabled = snapshot.status !== "OK";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="page page-narrow">
      <section className="arc-heading">
        <p className="eyebrow">Borrow</p>
        <h1>今から借ります</h1>
      </section>
      {disabled && <p className="notice danger">現在の判定がOKではないため、貸出は受け付けません。</p>}
      {error === "active" && <p className="notice danger">未返却の貸出があるため、新しく借りられません。</p>}
      {error === "safety" && <p className="notice danger">送信時点の安全判定がOKではありませんでした。</p>}
      <form className="form panel" action={borrowAction}>
        <label className="field">
          借りる人
          <input name="borrower_name" defaultValue={user.name} required />
        </label>
        <label className="field">
          借りる数
          <input name="item_count" type="number" min="1" max="20" defaultValue="1" required />
        </label>
        <label className="field">
          サイズ
          <select name="size" required defaultValue="">
            <option value="" disabled>選択してください</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="mixed">複数サイズ</option>
          </select>
        </label>
        <label className="field">
          メモ
          <textarea name="memo" placeholder="利用人数、場所、連絡事項など" />
        </label>
        <button className="km-button" disabled={disabled}>今から借ります</button>
      </form>
    </main>
  );
}
