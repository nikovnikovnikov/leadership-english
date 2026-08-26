import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Privacy Policy" };
export const revalidate = 60;

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const name = settings.site_name || SITE_NAME;
  const entity = settings.legal_entity_name || "[YOUR NAME OR ENTITY]";
  const email = settings.legal_email || "[YOUR EMAIL]";
  const address = settings.legal_address || "[YOUR ADDRESS]";

  return (
    <article className="prose prose-stone prose-headings:font-semibold prose-a:text-[var(--primary)] max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-stone-500">
        Last updated: August 18, 2026 &middot; Effective date: August 18, 2026
      </p>

      <h2>1. Who we are</h2>
      <p>
        {name} is a private community platform operated by its owner
        (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). This Privacy
        Policy explains how we collect, use, and protect personal information
        when you use our platform (the &quot;Service&quot;).
      </p>
      <p>
        <strong>Data Controller:</strong>{" "}
        {entity} &middot; {address} &middot; {email}
      </p>

      <h2>2. What data we collect</h2>
      <h3>2.1 Account data</h3>
      <ul>
        <li>Email address (used for authentication and account notifications)</li>
        <li>Username and display name (shown publicly within the community)</li>
        <li>Avatar image (if uploaded)</li>
      </ul>

      <h3>2.2 Content you create</h3>
      <ul>
        <li>Feed posts, comments, thread titles, and thread replies</li>
        <li>Likes and reactions</li>
        <li>Course completion records and point history</li>
      </ul>

      <h3>2.3 Payment data</h3>
      <p>
        If subscriptions are enabled, payment is processed by Stripe, Inc. We do
        not store credit card numbers, bank details, or full billing addresses
        on our servers. Stripe processes payment data under their own privacy
        policy. We receive your Stripe customer ID, subscription status, and
        billing email.
      </p>

      <h3>2.4 Technical data</h3>
      <ul>
        <li>IP address (collected by our hosting provider for security)</li>
        <li>Browser type and device information (server logs)</li>
        <li>Login timestamps and session activity</li>
      </ul>

      <h3>2.5 Consent records</h3>
      <p>
        When you accept our Terms of Service or Privacy Policy, we record the
        date, time, and version of the policy you accepted, along with your IP
        address.
      </p>

      <h2>3. How we use your data</h2>
      <p>We use personal data for the following purposes:</p>
      <ul>
        <li>
          <strong>Providing the Service</strong> — authentication, displaying
          your content, tracking progress, and processing payments.
        </li>
        <li>
          <strong>Community safety</strong> — moderation, content reporting,
          enforcing community guidelines, and preventing abuse.
        </li>
        <li>
          <strong>Communication</strong> — sending account-related emails
          (password resets, confirmations, subscription updates). We do not send
          marketing emails.
        </li>
        <li>
          <strong>Legal compliance</strong> — maintaining records required by
          GDPR, CCPA, and other applicable laws.
        </li>
      </ul>

      <h2>4. Legal basis for processing (GDPR)</h2>
      <p>
        Under the EU General Data Protection Regulation, we process your data on
        the following legal bases:
      </p>
      <ul>
        <li>
          <strong>Contract</strong> (Art. 6(1)(b)) — processing necessary to
          provide the Service you signed up for.
        </li>
        <li>
          <strong>Legitimate interest</strong> (Art. 6(1)(f)) — keeping the
          community safe, preventing abuse, and improving the Service.
        </li>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a)) — for any non-essential
          cookies or tracking we may add in the future (you will be asked before
          any tracking is enabled).
        </li>
        <li>
          <strong>Legal obligation</strong> (Art. 6(1)(c)) — retaining records
          required by law (e.g., transaction records for tax purposes).
        </li>
      </ul>

      <h2>5. Data sharing and processors</h2>
      <p>
        We do not sell your personal data. We share data only with the following
        service providers who process data on our behalf:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (database and authentication) — data is
          stored in their infrastructure. Supabase supports EU-region hosting.
         {" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase Privacy Policy
          </a>
        </li>
        <li>
          <strong>Vercel</strong> (hosting and serverless functions) — request
          logs may include IP addresses. Vercel supports EU regions.{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel Privacy Policy
          </a>
        </li>
        <li>
          <strong>Stripe</strong> (payment processing, if enabled) — payment
          data is processed entirely by Stripe and never touches our servers.{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stripe Privacy Policy
          </a>
        </li>
      </ul>
      <p>
        We may disclose information if required by law, court order, or
        government request.
      </p>

      <h2>6. International data transfers</h2>
      <p>
        Our infrastructure may involve transferring data outside the European
        Economic Area (EEA). Where this occurs, we rely on the following
        safeguards:
      </p>
      <ul>
        <li>
          Standard Contractual Clauses (SCCs) approved by the European
          Commission
        </li>
        <li>
          The EU-U.S. Data Privacy Framework (for US-based processors that have
          self-certified)
        </li>
        <li>
          Contractual commitments from our processors to protect data to EU
          standards
        </li>
      </ul>
      <p>
        Where possible, we configure our infrastructure to use EU-region
        deployments.
      </p>

      <h2>7. Data retention</h2>
      <ul>
        <li>
          <strong>Account data</strong> — retained for as long as your account
          exists. Deleted within 30 days of account deletion.
        </li>
        <li>
          <strong>Content</strong> — feed posts, comments, threads, and replies
          are deleted when your account is deleted.
        </li>
        <li>
          <strong>Payment records</strong> — Stripe retains transaction records
          as required by law (typically 7 years for tax/accounting). We retain
          only your subscription status.
        </li>
        <li>
          <strong>Server logs</strong> — automatically rotated and deleted
          within 30 days.
        </li>
        <li>
          <strong>Consent records</strong> — retained for 3 years after
          acceptance to demonstrate compliance.
        </li>
      </ul>

      <h2>8. Your rights</h2>
      <h3>8.1 GDPR rights (EU/EEA/UK residents)</h3>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — request a copy of all personal data we hold
          about you.
        </li>
        <li>
          <strong>Rectification</strong> — correct inaccurate or incomplete
          data.
        </li>
        <li>
          <strong>Erasure</strong> — request deletion of your personal data
          (&quot;right to be forgotten&quot;).
        </li>
        <li>
          <strong>Portability</strong> — receive your data in a structured,
          machine-readable format.
        </li>
        <li>
          <strong>Restrict processing</strong> — limit how we use your data.
        </li>
        <li>
          <strong>Object</strong> — object to processing based on legitimate
          interest.
        </li>
        <li>
          <strong>Withdraw consent</strong> — withdraw consent at any time
          (where processing is based on consent).
        </li>
      </ul>

      <h3>8.2 CCPA rights (California residents)</h3>
      <p>Under the California Consumer Privacy Act, you have the right to:</p>
      <ul>
        <li>
          <strong>Know</strong> — what personal information we collect, use,
          and disclose.
        </li>
        <li>
          <strong>Delete</strong> — request deletion of personal information.
        </li>
        <li>
          <strong>Opt out</strong> — opt out of the sale of personal information
          (we do not sell personal data).
        </li>
        <li>
          <strong>Non-discrimination</strong> — we will not discriminate against
          you for exercising your rights.
        </li>
      </ul>

      <h3>8.3 How to exercise your rights</h3>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href={`mailto:${email}`}>{email}</a>. We will respond within
        30 days (or within the legally required timeframe for your
        jurisdiction). We may ask you to verify your identity before processing
        your request.
      </p>

      <h2>9. Account deletion</h2>
      <p>
        You may delete your account at any time from your{" "}
        <Link href="/account">account settings</Link>. Account deletion is
        permanent and includes:
      </p>
      <ul>
        <li>Removal of your profile, posts, comments, threads, and replies</li>
        <li>Deletion of your authentication credentials</li>
        <li>Cancellation of any active subscription (Stripe handles refunds per
          their policy)</li>
      </ul>
      <p>
        Some data may be retained in anonymized form (e.g., thread structures
        with author removed) to preserve community content integrity, or as
        required by law.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use only strictly necessary cookies required for the Service to
        function:
      </p>
      <ul>
        <li>
          <strong>Session cookie</strong> — Supabase authentication token
          (httpOnly, Secure, SameSite=Lax). Required to keep you logged in.
        </li>
      </ul>
      <p>
        We do not currently use analytics, advertising, or tracking cookies. If
        we add any non-essential cookies in the future, we will ask for your
        consent before setting them.
      </p>

      <h2>11. Children&apos;s privacy</h2>
      <p>
        The Service is not directed at children under 16. We do not knowingly
        collect personal data from children under 16. If you believe a child
        under 16 has provided us with personal data, contact us and we will
        delete it.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make
        material changes, we will notify you by email or by posting a prominent
        notice on the Service before the changes take effect. Your continued use
        of the Service after the effective date constitutes acceptance of the
        updated policy.
      </p>

      <h2>13. Contact us</h2>
      <p>
        If you have questions about this Privacy Policy or wish to exercise your
        data rights, contact:
      </p>
      <p>
        {entity} <br />
        {email} <br />
        {address}
      </p>
      <p>
        If you are in the EU and we have not resolved your concern, you have the
        right to lodge a complaint with your local data protection authority.
      </p>

      <div className="mt-12 border-t border-stone-200 pt-4">
        <Link
          href="/legal/terms"
          className="text-sm text-stone-500 hover:text-[var(--primary)]"
        >
          Terms of Service &rarr;
        </Link>
      </div>
    </article>
  );
}
