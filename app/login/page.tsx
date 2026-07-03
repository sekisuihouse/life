import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = params.error;
  return (
    <main className="page page-narrow">
      <section className="arc-heading">
        <p className="eyebrow">Login</p>
        <h1>Googleアカウントでログイン</h1>
      </section>
      {error === "not_allowed" && (
        <p className="notice danger">
          このアカウントでは利用できません。学生は許可された学校アカウント、教員は管理者に登録されたアカウントでログインしてください。
        </p>
      )}
      <LoginButton />
    </main>
  );
}
