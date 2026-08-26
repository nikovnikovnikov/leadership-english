import { Resend } from "resend";
import { getSettings } from "@/lib/queries";

const resendKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendDmNotification({
  recipientEmail,
  recipientName,
  senderName,
  conversationId,
}: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  conversationId: string;
}) {
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const settings = await getSettings();
  const name = settings.site_name || "Sanctum";
  const fromEmail = process.env.FROM_EMAIL || `Sanctum <notifications@sanctum.community>`;

  await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `${senderName} sent you a message`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <p style="font-size: 14px; color: #57534e; margin-bottom: 24px;">
          Hi ${recipientName},
        </p>
        <p style="font-size: 14px; color: #292524; margin-bottom: 24px;">
          <strong>${senderName}</strong> sent you a private message on ${name}.
        </p>
        <a href="${siteUrl}/messages/${conversationId}"
           style="display: inline-block; background-color: #059669; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Open conversation
        </a>
        <p style="font-size: 12px; color: #a8a29e; margin-top: 32px;">
          If you don't want these emails, you can mute this conversation from your message settings.
        </p>
      </div>
    `,
  });
}
