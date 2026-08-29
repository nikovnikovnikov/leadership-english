"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { safeDbError } from "@/lib/sanitize";

export type ChatActionState = { error?: string };

const MAX_BODY = 2000;
const MAX_NAME = 60;

export async function sendChatMessage(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const profile = await requireUser();

  const roomId = String(formData.get("room_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!roomId) return { error: "Missing chat room." };
  if (!body) return { error: "Message cannot be empty." };
  if (body.length > MAX_BODY) return { error: `Message too long (max ${MAX_BODY} characters).` };

  const supabase = await createClient();

  // Make sure the room still exists
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { error: "This chat room no longer exists." };

  const { error } = await supabase.from("chat_room_messages").insert({
    room_id: roomId,
    user_id: profile.id,
    body,
  });
  if (error) return { error: safeDbError(error) };

  // No revalidatePath here — the client's realtime subscription delivers the
  // new message instantly, including to the sender.
  return {};
}

export async function createChatRoom(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const profile = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "Room name is required." };
  if (name.length > MAX_NAME) return { error: `Room name too long (max ${MAX_NAME} characters).` };

  const supabase = await createClient();
  const { error } = await supabase.from("chat_rooms").insert({
    name,
    description,
    created_by: profile.id,
  });
  if (error) return { error: safeDbError(error) };

  revalidatePath("/chat");
  revalidatePath("/admin/chat");
  return {};
}

export async function updateChatRoom(
  _prev: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!id) return { error: "Missing room." };
  if (!name) return { error: "Room name is required." };
  if (name.length > MAX_NAME) return { error: `Room name too long (max ${MAX_NAME} characters).` };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_rooms")
    .update({ name, description })
    .eq("id", id);
  if (error) return { error: safeDbError(error) };

  revalidatePath("/chat");
  revalidatePath(`/chat/${id}`);
  revalidatePath("/admin/chat");
  return {};
}

export async function deleteChatRoom(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("chat_rooms").delete().eq("id", id);
  if (error) return { error: safeDbError(error) };
  revalidatePath("/chat");
  revalidatePath("/admin/chat");
  return {};
}

export async function deleteChatMessage(messageId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_room_messages")
    .delete()
    .eq("id", messageId);
  if (error) return { error: safeDbError(error) };
  revalidatePath("/admin/chat");
  return {};
}