"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BORROW_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfjFMYhbDtq6u87dQI1pW8uB4JxvFP0-Tk_qbKsFGPW9d5fDg/viewform?usp=dialog";
const RETURN_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdd_g2F6DuK9GBptzLY7tI3f7spTkGZ8ya3XckkeLOXJ9Gwrw/viewform?usp=dialog";

export async function borrowAction(formData: FormData) {
  const user = await requireUser();
  const snapshot = await buildSafetySnapshot();
  if (snapshot.status !== "OK") redirect("/?error=safety");

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("rentals")
    .select("id")
    .eq("user_id", user.id)
    .is("returned_at", null)
    .maybeSingle();
  if (existing) redirect("/");

  await supabase.from("rentals").insert({
    user_id: user.id,
    email: user.email,
    borrower_name: user.name,
    item_count: 1,
    size: "free",
    memo: ""
  });

  revalidatePath("/");
  redirect(BORROW_FORM_URL);
}

export async function returnAction(formData: FormData) {
  const user = await requireUser();
  const rentalId = String(formData.get("rental_id") || "");

  const supabase = createSupabaseAdminClient();
  const { data: rental } = await supabase
    .from("rentals")
    .select("id,user_id")
    .eq("id", rentalId)
    .eq("user_id", user.id)
    .is("returned_at", null)
    .maybeSingle();
  if (!rental) redirect("/");

  await supabase
    .from("rentals")
    .update({
      returned_at: new Date().toISOString(),
      return_comment: ""
    })
    .eq("id", rentalId);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(RETURN_FORM_URL);
}

export async function adminOverrideAction(formData: FormData) {
  const user = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase.from("admin_overrides").insert({
    force_ng: formData.get("force_ng") === "on",
    message: String(formData.get("message") || ""),
    updated_by: user.id
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}
