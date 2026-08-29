import { Resend } from "resend";
import { SITE_NAME } from "@/lib/config";
import { escapeHtml } from "@/lib/sanitize";

const resendKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  `Leadership English Community <notifications@leadershipenglish.community>`;

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
  const name = SITE_NAME;
  const fromEmail = FROM_EMAIL;

  await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `${senderName} sent you a message`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <p style="font-size: 14px; color: #57534e; margin-bottom: 24px;">
          Hi ${escapeHtml(recipientName)},
        </p>
        <p style="font-size: 14px; color: #292524; margin-bottom: 24px;">
          <strong>${escapeHtml(senderName)}</strong> sent you a private message on ${escapeHtml(name)}.
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

export async function sendWaitlistInvite({
  email,
  waitlistId,
}: {
  email: string;
  waitlistId: string;
}) {
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const name = SITE_NAME;
  const fromEmail = FROM_EMAIL;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `You're in! Join ${name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <p style="font-size: 14px; color: #292524; margin-bottom: 24px;">
          Great news — we've reserved your spot on <strong>${escapeHtml(name)}</strong>.
        </p>
        <p style="font-size: 14px; color: #292524; margin-bottom: 24px;">
          Click below to create your account and join the community.
        </p>
        <a href="${siteUrl}/signup?waitlist_token=${waitlistId}"
           style="display: inline-block; background-color: #059669; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Create my account
        </a>
        <p style="font-size: 12px; color: #a8a29e; margin-top: 32px;">
          This link will expire after use. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}
