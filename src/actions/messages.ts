"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendDmNotification } from "@/lib/email";

export type MessageState = { error?: string };

export async function startConversation(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const otherUserId = String(formData.get("user_id") ?? "");
  if (!otherUserId) return { error: "Invalid user." };

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other_user: otherUserId,
  });
  if (error) return { error: error.message };

  redirect(`/messages/${data}`);
}

export async function createGroupConversation(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const memberIdsRaw = formData.getAll("members");

  if (!name) return { error: "Group name is required." };
  if (name.length > 60) return { error: "Group name must be 60 characters or fewer." };

  const memberIds = memberIdsRaw
    .map((v) => String(v))
    .filter((v) => v && v !== user.id);

  if (memberIds.length === 0) return { error: "Add at least one other member." };
  if (memberIds.length > 49) return { error: "Group chats support up to 50 members." };

  // Check for blocks between creator and each member
  for (const memberId of memberIds) {
    const { data: blockCheck } = await supabase
      .from("user_blocks")
      .select("blocker_id")
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${memberId}),and(blocker_id.eq.${memberId},blocked_id.eq.${user.id})`)
      .maybeSingle();
    if (blockCheck) {
      return { error: "You cannot add a user you've blocked (or who blocked you)." };
    }
  }

  const { data, error } = await supabase.rpc("create_group_conversation", {
    p_name: name,
    p_member_ids: memberIds,
  });

  if (error) return { error: error.message };

  revalidatePath("/messages");
  redirect(`/messages/${data}`);
}

export async function sendMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId) return { error: "Missing conversation." };
  if (!body) return { error: "Message cannot be empty." };
  if (body.length > 5000) return { error: "Message is too long (max 5000 characters)." };

  // Verify the user is a participant via conversation_participants
  const { data: myPart } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myPart) return { error: "Conversation not found." };

  // Get conversation metadata
  const { data: conv } = await supabase
    .from("conversations")
    .select("is_group")
    .eq("id", conversationId)
    .single();

  // For 1:1 chats, check blocks against the other person
  if (conv && !conv.is_group) {
    const { data: otherPart } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .limit(1)
      .single();

    if (otherPart) {
      const { data: blockCheck } = await supabase
        .from("user_blocks")
        .select("blocker_id")
        .or(`and(blocker_id.eq.${otherPart.user_id},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${otherPart.user_id})`)
        .maybeSingle();
      if (blockCheck) return { error: "You cannot message this user." };
    }
  }

  // Check if this is the first message in the conversation (for email notification)
  const { count: existingCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  const isFirstMessage = (existingCount ?? 0) === 0;

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (insertError) return { error: insertError.message };

  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Mark as read for the sender
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  // Send email notification on first message to a 1:1 conversation (non-blocking)
  if (isFirstMessage && conv && !conv.is_group) {
    const { data: otherPart } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .limit(1)
      .single();

    if (otherPart) {
      const [{ data: recipientProfile }, { data: senderProfile }, { data: authUser }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", otherPart.user_id)
            .single(),
          supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", user.id)
            .single(),
          supabase.auth.admin.getUserById(otherPart.user_id),
        ]);

      if (recipientProfile && senderProfile && authUser?.user?.email) {
        sendDmNotification({
          recipientEmail: authUser.user.email,
          recipientName: recipientProfile.display_name ?? recipientProfile.username,
          senderName: senderProfile.display_name ?? senderProfile.username,
          conversationId,
        }).catch(() => {});
      }
    }
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}

export type ContactAdminState = { error?: string };

export async function contactAdmin(
  _prev: ContactAdminState,
  formData: FormData,
): Promise<ContactAdminState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Please describe your issue." };
  if (body.length > 5000) return { error: "Message is too long (max 5000 characters)." };

  // Find the first admin
  const { data: admin } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_admin", true)
    .limit(1)
    .single();

  if (!admin) return { error: "No admin available right now." };

  // If messaging yourself, skip
  if (admin.id === user.id) return { error: "You are the admin." };

  // Create or get existing 1:1 conversation with admin
  const { data: conversationId, error: convError } = await supabase.rpc(
    "get_or_create_conversation",
    { p_other_user: admin.id },
  );
  if (convError) return { error: convError.message };

  // Send the message
  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });
  if (insertError) return { error: insertError.message };

  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}
