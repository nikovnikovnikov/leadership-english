"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml, safeDbError } from "@/lib/sanitize";

export type TagActionState = { error?: string; ok?: boolean };

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

export async function createTag(
  _prev: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  const supabase = await requireAdminUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Tag name is required." };
  if (name.length > 50) return { error: "Tag name must be 50 characters or fewer." };

  const { error } = await supabase.from("tags").insert({ name });
  if (error) {
    if (error.code === "23505") return { error: "A tag with that name already exists." };
    return { error: safeDbError(error) };
  }

  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function deleteTag(tagId: string) {
  const supabase = await requireAdminUser();
  await supabase.from("tags").delete().eq("id", tagId);
  revalidatePath("/admin/tags");
}

export async function updateTagVisibility(tagId: string, visibility: string) {
  const supabase = await requireAdminUser();
  const safe = visibility === "public" ? "public" : "admin";
  await supabase.from("tags").update({ visibility: safe }).eq("id", tagId);
  revalidatePath("/admin/tags");
}

export async function saveAutoTagConfig(formData: FormData): Promise<TagActionState> {
  const supabase = await requireAdminUser();
  const slot = String(formData.get("slot") ?? "1");
  const prefix = `auto_tag_${slot}`;
  const name = String(formData.get("name") ?? "").trim();
  const threshold = String(formData.get("threshold") ?? "").trim();
  const tagId = String(formData.get("tag_id") ?? "").trim();

  if (threshold && (isNaN(Number(threshold)) || Number(threshold) < 1)) {
    return { error: "Threshold must be a positive number." };
  }

  await supabase.from("settings").upsert({ key: `${prefix}_name`, value: name }, { onConflict: "key" });
  await supabase.from("settings").upsert({ key: `${prefix}_threshold`, value: threshold }, { onConflict: "key" });
  await supabase.from("settings").upsert({ key: `${prefix}_id`, value: tagId }, { onConflict: "key" });
  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function addTagToProfile(tagId: string, profileId: string) {
  const supabase = await requireAdminUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("profile_tags")
    .upsert(
      { profile_id: profileId, tag_id: tagId, assigned_by: user!.id },
      { onConflict: "profile_id,tag_id" },
    );

  revalidatePath("/admin/members");
  revalidatePath("/admin/tags");
}

export async function removeTagFromProfile(tagId: string, profileId: string) {
  const supabase = await requireAdminUser();
  await supabase
    .from("profile_tags")
    .delete()
    .eq("profile_id", profileId)
    .eq("tag_id", tagId);

  revalidatePath("/admin/members");
  revalidatePath("/admin/tags");
}

export async function massEmailTag(
  _prev: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  const supabase = await requireAdminUser();
  const tagId = String(formData.get("tag_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!tagId) return { error: "Missing tag." };
  if (!subject) return { error: "Subject is required." };
  if (!body) return { error: "Email body is required." };

  const { data: profileTags } = await supabase
    .from("profile_tags")
    .select("profile_id")
    .eq("tag_id", tagId);

  if (!profileTags?.length) return { error: "No members have this tag." };

  const profileIds = profileTags.map((pt) => pt.profile_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", profileIds);

  if (!profiles?.length) return { error: "No matching profiles found." };

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authMap = new Map(authUsers.users.map((u) => [u.id, u.email]));

  const { Resend } = await import("resend");
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { error: "Resend API key not configured." };

  const resend = new Resend(resendKey);
  const settings = (await import("@/lib/queries")).getSettings;
  const s = await settings();
  const siteName = s.site_name || "Sanctum";
  const fromEmail = process.env.FROM_EMAIL || `Sanctum <notifications@sanctum.community>`;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const p of profiles) {
    const email = authMap.get(p.id);
    if (!email) continue;

    await resend.emails
      .send({
        from: fromEmail,
        to: email,
        subject,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <p style="font-size: 14px; color: #292524; margin-bottom: 16px;">
              Hi ${escapeHtml(p.display_name ?? p.username)},
            </p>
            <div style="font-size: 14px; color: #292524; line-height: 1.6; margin-bottom: 24px;">
              ${escapeHtml(body).replace(/\n/g, "<br/>")}
            </div>
            <a href="${siteUrl}/feed"
               style="display: inline-block; background-color: ${s.primary_color || "#059669"}; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Go to ${siteName}
            </a>
            <p style="font-size: 12px; color: #a8a29e; margin-top: 32px;">
              You received this because you are a member of ${siteName}.
            </p>
          </div>
        `,
      })
      .catch(() => {});
  }

  revalidatePath("/admin/tags");
  return { ok: true };
}

export async function messageTag(
  _prev: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  const supabase = await requireAdminUser();
  const tagId = String(formData.get("tag_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const groupName = String(formData.get("group_name") ?? "").trim();

  if (!tagId) return { error: "Missing tag." };
  if (!body) return { error: "Message is required." };
  if (!groupName) return { error: "Group name is required." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileTags } = await supabase
    .from("profile_tags")
    .select("profile_id")
    .eq("tag_id", tagId);

  if (!profileTags?.length) return { error: "No members have this tag." };

  const memberIds = profileTags.map((pt) => pt.profile_id).filter((id) => id !== user!.id);
  if (memberIds.length === 0) return { error: "No other members to message." };

  const { data: convId, error: convError } = await supabase.rpc(
    "create_group_conversation",
    { p_name: groupName, p_member_ids: memberIds },
  );
  if (convError) return { error: convError.message };

  await supabase.from("messages").insert({
    conversation_id: convId,
    sender_id: user!.id,
    body,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", convId);

  revalidatePath("/messages");
  revalidatePath("/admin/tags");
  redirect(`/messages/${convId}`);
}
