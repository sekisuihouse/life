"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginButton() {
  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    const hdHint = process.env.NEXT_PUBLIC_GOOGLE_HD_HINT;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: hdHint ? { hd: hdHint } : undefined
      }
    });
  }

  return (
    <button className="km-button" onClick={signIn}>
      Googleでログイン
    </button>
  );
}
