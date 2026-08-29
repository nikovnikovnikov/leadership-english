import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Terms of Service" };
export const revalidate = 60;

export default async function TermsOfServicePage() {
  const settings = await getSettings();
  const name = SITE_NAME;
  const entity = settings.legal_entity_name || "[YOUR NAME OR ENTITY]";
  const email = settings.legal_email || "[YOUR EMAIL]";
  const address = settings.legal_address || "[YOUR ADDRESS, optional]";
  const jurisdiction = settings.legal_jurisdiction || "[YOUR STATE/COUNTRY]";
  const courts = settings.legal_courts || "[YOUR JURISDICTION]";

  return (
    <article className="prose prose-stone prose-headings:font-semibold prose-a:text-[var(--primary)] max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-sm text-stone-500">
        Last updated: August 18, 2026 &middot; Effective date: August 18, 2026
      </p>

      <h2>1. Acceptance of terms</h2>
      <p>
        By accessing or using {name} (the &quot;Service&quot;), you agree
        to be bound by these Terms of Service (&quot;Terms&quot;). If you do not
        agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 16 years old to use the Service. By using the
        Service, you represent that you meet this age requirement and have the
        legal capacity to enter into these Terms.
      </p>

      <h2>3. Account registration</h2>
      <ul>
        <li>
          You must provide accurate information when creating an account.
        </li>
        <li>
          You are responsible for maintaining the confidentiality of your
          password and account credentials.
        </li>
        <li>
          You must notify us immediately if you become aware of unauthorized use
          of your account.
        </li>
        <li>
          One person may not maintain more than one account.
        </li>
      </ul>

      <h2>4. User content</h2>
      <h3>4.1 Ownership</h3>
      <p>
        You retain full ownership of all content you create on the Service
        (posts, comments, threads, replies, and any other user-generated
        content).
      </p>

      <h3>4.2 License to us</h3>
      <p>
        By posting content on the Service, you grant us a limited,
        non-exclusive, royalty-free license to display, store, and moderate your
        content within the Service. This license ends when you delete your
        content or your account.
      </p>

      <h3>4.3 No obligation to monitor</h3>
      <p>
        We are not obligated to review, screen, or moderate user content, but we
        reserve the right to do so at our discretion.
      </p>

      <h2>5. Community guidelines</h2>
      <p>
        You agree to follow these community guidelines when using the Service:
      </p>
      <ul>
        <li>
          <strong>Be respectful.</strong> Engage in good faith. Disagree with
          ideas, not people.
        </li>
        <li>
          <strong>No harassment.</strong> Do not harass, bully, intimidate, or
          threaten other members. This includes personal attacks, hate speech,
          doxxing, or unwanted contact.
        </li>
        <li>
          <strong>No illegal content.</strong> Do not post content that violates
          applicable law, including but not limited to content that is
          defamatory, infringing, or promotes illegal activity.
        </li>
        <li>
          <strong>No spam.</strong> Do not post unsolicited advertisements,
          chain messages, or deceptive content.
        </li>
        <li>
          <strong>No impersonation.</strong> Do not impersonate another person,
          entity, or misrepresent your affiliation.
        </li>
        <li>
          <strong>No exploitation.</strong> Do not exploit minors or post
          content that sexualizes or harms children in any way.
        </li>
        <li>
          <strong>Respect privacy.</strong> Do not share others&apos; personal
          information without their consent.
        </li>
      </ul>
      <p>
        These guidelines are not exhaustive. We reserve the right to determine,
        at our sole discretion, what constitutes a violation.
      </p>

      <h2>6. Content moderation</h2>
      <ul>
        <li>
          We may remove content, issue warnings, or suspend or terminate accounts
          that violate these Terms or community guidelines, at our sole
          discretion and without prior notice.
        </li>
        <li>
          You may report content using the report feature. Reports are reviewed
          by moderators and acted upon at their discretion.
        </li>
        <li>
          We are not liable for any content posted by users. We act in good
          faith to maintain a safe community but cannot guarantee that all
          objectionable content will be removed promptly.
        </li>
      </ul>

      <h2>7. Subscriptions and payments</h2>
      <p>
        If subscriptions are enabled on the Service:
      </p>
      <ul>
        <li>
          Payments are processed entirely by Stripe, Inc. We do not store your
          credit card or payment details.
        </li>
        <li>
          Subscription fees are billed in advance on a recurring basis. You may
          cancel your subscription at any time from your account settings.
        </li>
        <li>
          Refunds are handled in accordance with Stripe&apos;s refund policy and
          applicable law. We do not guarantee refunds for partial billing
          periods.
        </li>
        <li>
          We reserve the right to change subscription pricing with reasonable
          advance notice (at least 30 days).
        </li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>
        The Service itself (design, code, branding, and non-user content) is
        owned by us or our licensors and protected by intellectual property laws.
        You may not copy, modify, distribute, or reverse-engineer any part of
        the Service without our written permission.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
        BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
      </p>
      <p>
        We do not warrant that the Service will be uninterrupted, error-free,
        secure, or free of viruses or other harmful components. We are not
        responsible for the accuracy, completeness, or reliability of any user
        content.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
        ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, INCLUDING BUT NOT
        LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR BUSINESS INTERRUPTION,
        REGARDLESS OF THE THEORY OF LIABILITY.
      </p>
      <p>
        OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE
        SERVICE SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID TO US IN THE TWELVE
        (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold us harmless from any claims, losses,
        damages, liabilities, and expenses (including reasonable legal fees)
        arising out of or related to your use of the Service, your violation of
        these Terms, or your violation of any rights of a third party.
      </p>

      <h2>12. Termination</h2>
      <ul>
        <li>
          You may delete your account at any time from your{" "}
          <Link href="/account">account settings</Link>.
        </li>
        <li>
          We may suspend or terminate your account at any time, with or without
          cause, with or without notice.
        </li>
        <li>
          Upon termination, your right to use the Service ceases. We will make
          your data available for deletion or export in accordance with our
          <Link href="/legal/privacy"> Privacy Policy</Link>.
        </li>
      </ul>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of{" "}
        {jurisdiction}, without regard to its conflict of law principles.
        Any disputes arising from or relating to these Terms or the Service shall
        be resolved in the courts of {courts}.
      </p>

      <h2>14. Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. If we make material
        changes, we will notify you by email or by posting a prominent notice on
        the Service at least 30 days before the changes take effect. Your
        continued use of the Service after the effective date constitutes
        acceptance of the updated Terms.
      </p>

      <h2>15. Severability</h2>
      <p>
        If any provision of these Terms is found to be unenforceable or
        invalid, that provision will be limited or eliminated to the minimum
        extent necessary, and the remaining provisions will remain in full force
        and effect.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms should be directed to:
      </p>
      <p>
        {entity} <br />
        {email} <br />
        {address}
      </p>

      <div className="mt-12 border-t border-stone-200 pt-4">
        <Link
          href="/legal/privacy"
          className="text-sm text-stone-500 hover:text-[var(--primary)]"
        >
          Privacy Policy &rarr;
        </Link>
      </div>
    </article>
  );
}
