"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getColorForScheme } from "@/lib/appearance";
import { sanitizeHexColor, sanitizeUrl, safeDbError } from "@/lib/sanitize";

async function requireAdminUser() {
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

  return supabase;
}

async function requireModeratorUser() {
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
  if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/feed");

  return supabase;
}

export type AdminActionState = { error?: string };

export async function setReportStatus(reportId: string, status: string) {
  const supabase = await requireModeratorUser();
  await supabase
    .from("reports")
    .update({ status: status === "dismissed" ? "dismissed" : "resolved" })
    .eq("id", reportId);
  revalidatePath("/admin/reports");
}

export async function createCourse(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const published = formData.get("published") === "on";

  if (!title) return { error: "Title is required." };

  const { data, error } = await supabase
    .from("courses")
    .insert({ title, description, published })
    .select("id")
    .single();
  if (error) return { error: safeDbError(error) };

  revalidatePath("/admin/courses");
  redirect(`/admin/course/${data.id}`);
}

export async function updateCourse(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const published = formData.get("published") === "on";

  if (!title) return { error: "Title is required." };

  const { error } = await supabase
    .from("courses")
    .update({ title, description, published })
    .eq("id", id);
  if (error) return { error: safeDbError(error) };

  revalidatePath("/admin/course/[id]");
  revalidatePath("/courses");
  revalidatePath("/learn");
  return {};
}

export async function deleteCourse(id: string) {
  const supabase = await requireAdminUser();
  await supabase.from("courses").delete().eq("id", id);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/learn");
  redirect("/admin/courses");
}

/** Swap a course with its neighbour in the admin-defined ordering. */
export async function moveCourse(id: string, direction: "up" | "down") {
  const supabase = await requireAdminUser();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!courses || courses.length < 2) return;

  const index = courses.findIndex((c) => c.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= courses.length) return;

  const current = courses[index];
  const neighbour = courses[swapIndex];
  await supabase
    .from("courses")
    .update({ sort_order: neighbour.sort_order })
    .eq("id", current.id);
  await supabase
    .from("courses")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbour.id);

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/learn");
}

/** Record that a member completed a course with a tutor (public credential). */
export async function addTutorCompletion(courseId: string, userId: string, note: string) {
  const supabase = await requireAdminUser();
  const trimmed = note.trim();
  if (trimmed.length > 280) return;

  const { error } = await supabase
    .from("course_tutor_completions")
    .insert({
      course_id: courseId,
      user_id: userId,
      note: trimmed || null,
      assigned_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    });
  if (error?.code === "23505") return;

  revalidatePath("/admin/courses");
  revalidatePath("/admin/course/[id]", "page");
  revalidatePath("/courses");
  revalidatePath("/member/[username]", "page");
}

/** Remove a "completed with a tutor" credential. */
export async function removeTutorCompletion(id: string) {
  const supabase = await requireAdminUser();
  await supabase.from("course_tutor_completions").delete().eq("id", id);
  revalidatePath("/admin/courses");
  revalidatePath("/admin/course/[id]", "page");
  revalidatePath("/courses");
  revalidatePath("/member/[username]", "page");
}

export async function createLesson(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const notionPageId = String(formData.get("notion_page_id") ?? "").trim() || null;
  const orderIndex = Number(formData.get("order_index") ?? 0) || 0;
  const published = formData.get("published") === "on";

  if (!title) return { error: "Title is required." };

  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    title,
    description,
    video_url: videoUrl,
    notion_page_id: notionPageId,
    order_index: orderIndex,
    published,
  });
  if (error) return { error: safeDbError(error) };

  revalidatePath(`/admin/course/${courseId}`);
  return {};
}

export async function updateLesson(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const notionPageId = String(formData.get("notion_page_id") ?? "").trim() || null;
  const orderIndex = Number(formData.get("order_index") ?? 0) || 0;
  const published = formData.get("published") === "on";

  if (!title) return { error: "Title is required." };

  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      description,
      video_url: videoUrl,
      notion_page_id: notionPageId,
      order_index: orderIndex,
      published,
    })
    .eq("id", id);
  if (error) return { error: safeDbError(error) };

  revalidatePath(`/admin/lesson/${id}`);
  revalidatePath(`/admin/course/${courseId}`);
  revalidatePath(`/lesson/${id}`);
  revalidatePath("/courses");
  revalidatePath("/learn");
  return {};
}

export async function deleteLesson(id: string, courseId: string) {
  const supabase = await requireAdminUser();
  await supabase.from("lessons").delete().eq("id", id);
  revalidatePath(`/admin/course/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/learn");
}

export async function updateSettings(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const keys = [
    "points_feed_post",
    "points_thread",
    "points_feed_comment",
    "points_thread_reply",
    "points_like_received",
    "points_daily_cap",
  ];

  for (const key of keys) {
    const raw = String(formData.get(key) ?? "").trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      return { error: `"${key}" must be a positive number.` };
    }
    await supabase
      .from("settings")
      .upsert({ key, value: String(Math.round(value)) }, { onConflict: "key" });
  }

  revalidatePath("/admin/settings");
  return {};
}

const ALLOWED_SETTING_KEYS = new Set([
  "points_feed_post", "points_thread", "points_feed_comment",
  "points_thread_reply", "points_like_received", "points_daily_cap",
  "community_start_here", "community_about", "community_rules",
  "announcements_enabled", "announcements_title", "announcements_body",
  "site_tagline", "landing_heading",
  "landing_subtext", "signup_heading", "legal_entity_name",
  "legal_email", "legal_address", "legal_jurisdiction", "legal_courts",
  "color_scheme", "font_pairing", "primary_color",
  "beta_mode", "beta_max_spots", "invites_enabled", "invites_per_member",
  "subscription_required", "stripe_price_monthly", "stripe_price_yearly",
  "yearly_enabled", "waitlist_enabled", "chat_enabled",
]);

const URL_SETTING_KEYS = new Set<string>();

export async function updateSetting(key: string, value: string) {
  const supabase = await requireAdminUser();
  if (!ALLOWED_SETTING_KEYS.has(key)) return;
  let safeValue = value;
  if (key === "primary_color") safeValue = sanitizeHexColor(value);
  if (URL_SETTING_KEYS.has(key) && value) {
    const sanitized = sanitizeUrl(value);
    if (sanitized === null) return;
    safeValue = sanitized;
  }
  await supabase
    .from("settings")
    .upsert({ key, value: safeValue }, { onConflict: "key" });
  revalidatePath("/admin/settings");
}

export async function toggleAdmin(userId: string, makeAdmin: boolean) {
  const supabase = await requireAdminUser();
  await supabase
    .from("profiles")
    .update({ is_admin: makeAdmin, role: makeAdmin ? "admin" : "user" })
    .eq("id", userId);
  revalidatePath("/admin/members");
}

export async function toggleModerator(userId: string, makeModerator: boolean) {
  const supabase = await requireAdminUser();
  const { data: current } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .single();

  if (makeModerator) {
    const newRole = current?.is_admin ? "admin" : "moderator";
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
  } else {
    const newRole = current?.is_admin ? "admin" : "user";
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
  }
  revalidatePath("/admin/members");
}

export async function updateCommunityInfo(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const keys = [
    "community_start_here",
    "community_about",
    "community_rules",
    "announcements_enabled",
    "announcements_title",
    "announcements_body",
  ];

  for (const key of keys) {
    const value = String(formData.get(key) ?? "").trim();
    await supabase
      .from("settings")
      .upsert({ key, value }, { onConflict: "key" });
  }

  revalidatePath("/admin/community");
  revalidatePath("/feed");
  return {};
}

export async function updateBranding(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await requireAdminUser();
  const keys = [
    "site_tagline",
    "landing_heading",
    "landing_subtext",
    "signup_heading",
    "legal_entity_name",
    "legal_email",
    "legal_address",
    "legal_jurisdiction",
    "legal_courts",
    "color_scheme",
    "font_pairing",
  ];

  const validSchemes = ["forest", "ocean", "sunset", "berry", "midnight"];
  const colorScheme = String(formData.get("color_scheme") ?? "").trim();
  if (colorScheme && !validSchemes.includes(colorScheme)) {
    return { error: "Invalid color scheme." };
  }

  const validFonts = ["soft", "modern", "bold", "classic", "creative"];
  const fontPairing = String(formData.get("font_pairing") ?? "").trim();
  if (fontPairing && !validFonts.includes(fontPairing)) {
    return { error: "Invalid font pairing." };
  }

  // When a color scheme is selected, derive primary_color from the preset
  if (colorScheme) {
    const schemeColor = getColorForScheme(colorScheme);
    const { error: colorErr } = await supabase
      .from("settings")
      .upsert({ key: "primary_color", value: schemeColor }, { onConflict: "key" });
    if (colorErr) return { error: `primary_color: ${colorErr.message}` };
  }

  for (const key of keys) {
    const value = String(formData.get(key) ?? "").trim();
    const { error: upsertErr } = await supabase
      .from("settings")
      .upsert({ key, value }, { onConflict: "key" });
    if (upsertErr) return { error: `${key}: ${upsertErr.message}` };
  }

  revalidatePath("/admin/branding");
  revalidatePath("/");
  revalidatePath("/signup");
  revalidatePath("/feed");
  revalidatePath("/legal/privacy");
  revalidatePath("/legal/terms");
  return {};
}
