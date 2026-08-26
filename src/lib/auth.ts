import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  role: string;
  instagram_url: string | null;
  substack_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  custom_link_url: string | null;
  custom_link_label: string | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_admin, role, instagram_url, substack_url, x_url, youtube_url, custom_link_url, custom_link_label")
    .eq("id", user.id)
    .single();

  return (profile as CurrentProfile) ?? null;
}

/** The currently signed-in auth user, or null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** For pages that require being signed in. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_admin, role, instagram_url, substack_url, x_url, youtube_url, custom_link_url, custom_link_label")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/setup");
  return profile as CurrentProfile;
}

/** For pages that require admin. */
export async function requireAdmin() {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/feed");
  return profile;
}

/** For pages that require admin or moderator. */
export async function requireModerator() {
  const profile = await requireUser();
  if (profile.role !== "admin" && profile.role !== "moderator") redirect("/feed");
  return profile;
}

/** Check if profile is admin or moderator. */
export function isModeratorOrAdmin(profile: { role?: string; is_admin?: boolean }): boolean {
  return profile.role === "admin" || profile.role === "moderator";
}

/** Check if profile is strictly admin. */
export function isAdminOnly(profile: { role?: string; is_admin?: boolean }): boolean {
  return profile.role === "admin";
}
