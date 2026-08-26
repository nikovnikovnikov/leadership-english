import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getMessages,
  getConversationPartner,
  getConversationMeta,
  getConversationParticipants,
  isConversationParticipant,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: PageProps<"/messages/[conversationId]">) {
  const { conversationId } = await params;
  const profile = await requireUser();

  // Check participation
  const isParticipant = await isConversationParticipant(conversationId, profile.id);
  if (!isParticipant) notFound();

  const [messages, partner, meta, participants] = await Promise.all([
    getMessages(conversationId),
    getConversationPartner(conversationId, profile.id),
    getConversationMeta(conversationId),
    getConversationParticipants(conversationId),
  ]);

  // Mark as read
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <MessageThread
        conversationId={conversationId}
        messages={messages}
        partner={partner}
        participants={participants}
        isGroup={meta?.is_group ?? false}
        groupName={meta?.name ?? null}
        currentUserId={profile.id}
      />
    </div>
  );
}
