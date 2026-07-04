import type { Metadata } from "next";
import { validateUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "鮎喰川ライフジャケット貸出",
  description: "神山町の鮎喰川コモン前でのライフジャケット貸出受付"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();

  return (
    <html lang="ja">
      <body>
        {user && (
          <header className="site-header">
            <div className="brand-text">ライフジャケット貸出</div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}

async function getOptionalUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? validateUser(data.user) : null;
  } catch {
    return null;
  }
}
