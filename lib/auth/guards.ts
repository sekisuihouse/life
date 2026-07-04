import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export async function requireUser(): Promise<AppUser> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const appUser = validateUser(data.user);
  if (!appUser) redirect("/login?error=not_allowed");
  await upsertProfile(appUser);
  return appUser;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/?error=admin_required");
  return user;
}

export function validateUser(user: User): AppUser | null {
  const email = user.email || "";
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "利用者");
  const hd = readHostedDomain(user);
  const allowedHd = process.env.ALLOWED_GOOGLE_HD || "kamiyama.ac.jp";
  const userRegex = new RegExp(process.env.ALLOWED_EMAIL_REGEX || "^[a-zA-Z0-9._%+-]+@kamiyama\\.ac\\.jp$");
  const adminRegex = new RegExp(process.env.ADMIN_EMAIL_REGEX || "^[a-zA-Z0-9._%+-]+@kamiyama-marugoto\\.com$");
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminRegex.test(email) || adminEmails.includes(email.toLowerCase());
  const isAllowedUser = userRegex.test(email) || email.endsWith("@kamiyama.ac.jp");
  const hasAllowedHostedDomain = hd === allowedHd || email.endsWith(`@${allowedHd}`);

  if (!isAdmin && !isAllowedUser) return null;
  if (!isAdmin && !hasAllowedHostedDomain) return null;

  return { id: user.id, email, name, isAdmin };
}

function readHostedDomain(user: User) {
  const identities = user.identities || [];
  const identityHd = identities
    .map((identity) => identity.identity_data?.hd)
    .find((value): value is string => typeof value === "string");
  return identityHd || (typeof user.app_metadata?.hd === "string" ? user.app_metadata.hd : null);
}

async function upsertProfile(user: AppUser) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.isAdmin ? "admin" : "user"
  });
}
