"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InviteActionState = { error?: string; ok?: boolean; code?: string };

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateInvite(): Promise<InviteActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["invites_enabled", "invites_per_member"]);

  const settingsMap: Record<string, string> = {};
  for (const row of settings ?? []) settingsMap[row.key] = row.value;

  if (settingsMap.invites_enabled !== "true") {
    return { error: "Invites are not enabled." };
  }

  const maxInvites = Number(settingsMap.invites_per_member) || 3;

  const { count } = await supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id);

  if ((count ?? 0) >= maxInvites) {
    return { error: `You can only create up to ${maxInvites} invite${maxInvites !== 1 ? "s" : ""}.` };
  }

  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { error } = await supabase
      .from("invites")
      .insert({ code, creator_id: user.id });
    if (!error) break;
    if (error.code === "23505") {
      code = generateCode();
      attempts++;
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/invites");
  return { ok: true, code };
}

export async function getMyInvites() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("invites")
    .select("id, code, used_by, used_at, created_at, usedBy:used_by(display_name, username)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function validateInviteCode(code: string): Promise<{ valid: boolean; error?: string }> {
  if (!code) return { valid: false, error: "No invite code provided." };

  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("id, code, used_by")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (!invite) return { valid: false, error: "Invalid invite code." };
  if (invite.used_by) return { valid: false, error: "This invite code has already been used." };

  return { valid: true };
}

export async function getInviteSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "beta_mode", "beta_max_spots",
      "invites_enabled", "invites_per_member",
      "subscription_required",
      "stripe_price_monthly", "stripe_price_yearly", "yearly_enabled",
    ]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

export async function getBetaSpotsRemaining(): Promise<number> {
  const settings = await getInviteSettings();
  if (settings.beta_mode !== "true") return -1;

  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const maxSpots = Number(settings.beta_max_spots) || 10;
  return Math.max(0, maxSpots - (count ?? 0));
}

export async function recordUserAccess(
  userId: string,
  accessType: "beta" | "invite" | "subscription" | "open",
  inviteId?: string,
) {
  const supabase = await createClient();
  await supabase.from("user_access").upsert(
    {
      user_id: userId,
      access_type: accessType,
      invite_id: inviteId ?? null,
    },
    { onConflict: "user_id" },
  );
}

export async function getUserAccessType(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_access")
    .select("access_type")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.access_type ?? "open";
}
