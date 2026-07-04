"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildSafetySnapshot } from "@/lib/safety/snapshot";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

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
  redirect("/?borrowed=1");
}

export async function returnAction(formData: FormData) {
  const user = await requireUser();
  const rentalId = String(formData.get("rental_id") || "");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) redirect("/?error=photo");

  const supabase = createSupabaseAdminClient();
  const { data: rental } = await supabase
    .from("rentals")
    .select("id,user_id")
    .eq("id", rentalId)
    .eq("user_id", user.id)
    .is("returned_at", null)
    .maybeSingle();
  if (!rental) redirect("/");

  const extension = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${rentalId}-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("return-photos").upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false
  });
  if (uploadError) redirect("/?error=upload");

  const { data } = supabase.storage.from("return-photos").getPublicUrl(path);
  await supabase
    .from("rentals")
    .update({
      returned_at: new Date().toISOString(),
      return_photo_url: data.publicUrl,
      return_comment: ""
    })
    .eq("id", rentalId);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/?returned=1");
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
