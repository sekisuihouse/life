"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginButton() {
  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "kamiyama.ac.jp"
        }
      }
    });
  }

  return (
    <button className="km-button" onClick={signIn}>
      Googleでログイン
    </button>
  );
}
