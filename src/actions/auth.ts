"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeUrl, safeDbError } from "@/lib/sanitize";

export type AuthState = { error?: string; ok?: boolean; message?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: safeDbError(error) };

  redirect("/feed");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const agreeTerms = formData.get("agree_terms") === "on";
  const inviteCode = String(formData.get("invite_code") ?? "").trim().toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (!agreeTerms)
    return { error: "You must agree to the Terms of Service and Privacy Policy." };

  // Validate invite code if provided
  let inviteId: string | null = null;
  if (inviteCode) {
    const { data: invite } = await supabase
      .from("invites")
      .select("id, code, used_by")
      .eq("code", inviteCode)
      .maybeSingle();

    if (!invite) return { error: "Invalid invite code." };
    if (invite.used_by) return { error: "This invite code has already been used." };
    inviteId = invite.id;
  }

  // Check onboarding mode settings
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "beta_mode", "beta_max_spots",
      "invites_enabled", "invites_per_member",
      "subscription_required",
    ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;

  // If invite code is provided, always allow signup (bypasses other gates)
  if (!inviteCode) {
    // Check beta mode
    if (settings.beta_mode === "true") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const maxSpots = Number(settings.beta_max_spots) || 10;
      if ((count ?? 0) >= maxSpots) {
        return { error: "Sorry, all beta spots are filled. Try again later or use an invite code." };
      }
    } else if (settings.invites_enabled === "true") {
      // Invites required, no code provided
      return { error: "This community requires an invite code to join." };
    } else if (settings.subscription_required === "true") {
      // Subscription required — will be handled after account creation
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        invite_id: inviteId,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error) return { error: safeDbError(error) };

  if (!data.session) {
    return {
      ok: true,
      message:
        "Check your email to confirm your account, then log in to finish setting up.",
    };
  }

  redirect("/setup");
}

export async function completeSetup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const instagramUrl = sanitizeUrl(String(formData.get("instagram_url") ?? "").trim());
  const substackUrl = sanitizeUrl(String(formData.get("substack_url") ?? "").trim());
  const xUrl = sanitizeUrl(String(formData.get("x_url") ?? "").trim());
  const youtubeUrl = sanitizeUrl(String(formData.get("youtube_url") ?? "").trim());
  const customLinkUrl = sanitizeUrl(String(formData.get("custom_link_url") ?? "").trim());
  const customLinkLabel = String(formData.get("custom_link_label") ?? "").trim() || null;

  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return {
      error: "Username must be 3-20 characters: letters, numbers, underscores.",
    };

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let isAdmin = adminIds.includes(user.id);
  if (!isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    isAdmin = (count ?? 0) === 0;
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: displayName || null,
    is_admin: isAdmin,
    role: isAdmin ? "admin" : "user",
    instagram_url: instagramUrl,
    substack_url: substackUrl,
    x_url: xUrl,
    youtube_url: youtubeUrl,
    custom_link_url: customLinkUrl,
    custom_link_label: customLinkLabel,
  });
  if (error) return { error: safeDbError(error) };

  // Record user access type
  try {
    const inviteId = user.user_metadata?.invite_id as string | null;
    let accessType: "beta" | "invite" | "subscription" | "open" = "open";
    if (inviteId) accessType = "invite";
    else {
      const { data: settings } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["beta_mode", "subscription_required"]);
      const map: Record<string, string> = {};
      for (const row of settings ?? []) map[row.key] = row.value;
      if (map.beta_mode === "true") accessType = "beta";
      else if (map.subscription_required === "true") accessType = "subscription";
    }

    await supabase.from("user_access").insert({
      user_id: user.id,
      access_type: accessType,
      invite_id: inviteId ?? null,
    });

    // Mark invite as used
    if (inviteId) {
      await supabase
        .from("invites")
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq("id", inviteId);
    }
  } catch { /* best effort */ }

  // Auto-tag assignment for Founder / Heritage batches
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "auto_tag_1_name", "auto_tag_1_threshold", "auto_tag_1_id",
        "auto_tag_2_name", "auto_tag_2_threshold", "auto_tag_2_id",
      ]);

    const settingsMap: Record<string, string> = {};
    for (const row of settings ?? []) settingsMap[row.key] = row.value;

    const { count: userCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const position = userCount ?? 1;

    // Auto-tag 1 (e.g. Founder)
    const tag1Threshold = Number(settingsMap.auto_tag_1_threshold);
    const tag1Id = settingsMap.auto_tag_1_id;
    if (tag1Id && tag1Threshold && position <= tag1Threshold) {
      await supabase.from("profile_tags").insert({
        profile_id: user.id,
        tag_id: tag1Id,
      });
    }

    // Auto-tag 2 (e.g. Heritage)
    const tag2Threshold = Number(settingsMap.auto_tag_2_threshold);
    const tag2Id = settingsMap.auto_tag_2_id;
    if (tag2Id && tag2Threshold && position <= tag2Threshold) {
      await supabase.from("profile_tags").insert({
        profile_id: user.id,
        tag_id: tag2Id,
      });
    }
  } catch { /* best effort */ }

  redirect("/feed");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
