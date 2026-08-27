"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendWaitlistInvite } from "@/lib/email";
import { safeDbError } from "@/lib/sanitize";

export type WaitlistActionState = { error?: string; ok?: boolean; position?: number };

export async function joinWaitlist(
  _prev: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("waitlist")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status === "admitted") {
      return { error: "This email has already been invited. Check your inbox or try logging in." };
    }
    if (existing.status === "declined") {
      return { error: "This email is not eligible to join the waitlist." };
    }
    return { error: "You're already on the waitlist!" };
  }

  const { data, error } = await supabase
    .from("waitlist")
    .insert({ email })
    .select("position")
    .single();

  if (error) return { error: safeDbError(error) };

  return { ok: true, position: data.position };
}

export async function getWaitlistCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getWaitlistStats(): Promise<{
  total: number;
  pending: number;
  admitted: number;
  declined: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("waitlist")
    .select("status");

  const rows = data ?? [];
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    admitted: rows.filter((r) => r.status === "admitted").length,
    declined: rows.filter((r) => r.status === "declined").length,
  };
}

export async function admitWaitlistUser(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/feed");

  const { data: entry } = await supabase
    .from("waitlist")
    .select("email, status")
    .eq("id", id)
    .single();

  if (!entry || entry.status !== "pending") {
    revalidatePath("/admin/waitlist");
    return;
  }

  await supabase
    .from("waitlist")
    .update({ status: "admitted", admitted_at: new Date().toISOString() })
    .eq("id", id);

  await sendWaitlistInvite({ email: entry.email, waitlistId: id });

  revalidatePath("/admin/waitlist");
}

export async function declineWaitlistUser(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/feed");

  await supabase
    .from("waitlist")
    .update({ status: "declined" })
    .eq("id", id);

  revalidatePath("/admin/waitlist");
}

export async function admitNextBatch(count: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/feed");

  const { data: batch } = await supabase
    .from("waitlist")
    .select("id, email")
    .eq("status", "pending")
    .order("position", { ascending: true })
    .limit(count);

  if (!batch?.length) {
    revalidatePath("/admin/waitlist");
    return;
  }

  const now = new Date().toISOString();
  for (const entry of batch) {
    await supabase
      .from("waitlist")
      .update({ status: "admitted", admitted_at: now })
      .eq("id", entry.id);

    await sendWaitlistInvite({ email: entry.email, waitlistId: entry.id });
  }

  revalidatePath("/admin/waitlist");
}
