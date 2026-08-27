"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeUrl, safeDbError } from "@/lib/sanitize";

export type ProfileState = {
  error?: string;
  ok?: boolean;
};

export async function updateProfileLinks(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const instagramUrl = sanitizeUrl(String(formData.get("instagram_url") ?? "").trim());
  const substackUrl = sanitizeUrl(String(formData.get("substack_url") ?? "").trim());
  const xUrl = sanitizeUrl(String(formData.get("x_url") ?? "").trim());
  const youtubeUrl = sanitizeUrl(String(formData.get("youtube_url") ?? "").trim());
  const customLinkUrl = sanitizeUrl(String(formData.get("custom_link_url") ?? "").trim());
  const customLinkLabel = String(formData.get("custom_link_label") ?? "").trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      instagram_url: instagramUrl,
      substack_url: substackUrl,
      x_url: xUrl,
      youtube_url: youtubeUrl,
      custom_link_url: customLinkUrl,
      custom_link_label: customLinkLabel,
    })
    .eq("id", user.id);

  if (error) return { error: safeDbError(error) };
  return { ok: true };
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
}
