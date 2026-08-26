"use client";

import { useState, useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateBranding, type AdminActionState } from "@/actions/admin";
import {
  COLOR_SCHEMES,
  FONT_PAIRINGS,
  type ColorSchemeId,
  type FontPairingId,
} from "@/lib/appearance";

const TEXT_FIELDS = [
  { key: "site_name", label: "Site Name", placeholder: "Sanctum", description: "Displayed in the navigation, footer, emails, and browser tab." },
  { key: "site_tagline", label: "Tagline", placeholder: "A private community for growth", description: "Shown below the site name on the landing page and used as the meta description." },
  { key: "logo_initial", label: "Logo Letter", placeholder: "S", description: "Single character displayed in the logo badge." },
  { key: "landing_heading", label: "Landing Heading", placeholder: "A space built for real growth", description: "Main headline on the landing page. Leave blank for default." },
  { key: "landing_subtext", label: "Landing Subtext", placeholder: "Join a community of people...", description: "Supporting paragraph on the landing page. Leave blank for default." },
  { key: "signup_heading", label: "Signup Heading", placeholder: "Join {name}", description: "Heading on the signup page. Use {name} to insert the site name." },
] as const;

const LEGAL_FIELDS = [
  { key: "legal_entity_name", label: "Entity Name", placeholder: "Acme Inc" },
  { key: "legal_email", label: "Contact Email", placeholder: "hello@example.com" },
  { key: "legal_address", label: "Address", placeholder: "123 Main St, City, State" },
  { key: "legal_jurisdiction", label: "Governing Law", placeholder: "State of California" },
  { key: "legal_courts", label: "Court Jurisdiction", placeholder: "San Francisco County" },
] as const;

function FontLink({ href }: { href: string }) {
  useEffect(() => {
    if (!href) return;
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save branding"}
    </button>
  );
}

export function BrandingForm({ values }: { values: Record<string, string> }) {
  const [state, formAction, isPending] = useActionState<AdminActionState, FormData>(
    updateBranding,
    {},
  );
  const router = useRouter();
  const prevPending = useRef(true);

  const [selectedScheme, setSelectedScheme] = useState<ColorSchemeId>(
    (values.color_scheme as ColorSchemeId) || "forest",
  );
  const [selectedFont, setSelectedFont] = useState<FontPairingId>(
    (values.font_pairing as FontPairingId) || "modern",
  );

  const googleFontsLink = FONT_PAIRINGS.find((p) => p.id === selectedFont)?.googleLink ?? "";

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) {
      router.refresh();
    }
    prevPending.current = isPending;
  }, [isPending, state, router]);

  return (
    <form action={formAction} className="space-y-8">
      {googleFontsLink && <FontLink href={googleFontsLink} />}
      {FONT_PAIRINGS.filter((p) => p.id !== selectedFont && p.googleLink).map((p) => (
        <FontLink key={p.id} href={p.googleLink} />
      ))}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Color Scheme</h2>
        <p className="text-xs text-stone-400">
          Sets the accent color used for buttons, links, badges, and highlights across the entire site.
        </p>
        <div className="grid grid-cols-5 gap-3">
          {COLOR_SCHEMES.map((scheme) => (
            <label
              key={scheme.id}
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                selectedScheme === scheme.id
                  ? "border-[var(--primary)] bg-[var(--primary-light)]"
                  : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              <input
                type="radio"
                name="color_scheme"
                value={scheme.id}
                checked={selectedScheme === scheme.id}
                onChange={() => setSelectedScheme(scheme.id)}
                className="sr-only"
              />
              <div
                className="h-10 w-10 rounded-full shadow-inner"
                style={{ backgroundColor: scheme.color }}
              />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {scheme.label}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-stone-500">
                {scheme.description}
              </span>
              {selectedScheme === scheme.id && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Font Pairing</h2>
        <p className="text-xs text-stone-400">
          Controls the typography across the site. Headings use the heading font; body text uses the body font.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FONT_PAIRINGS.map((pairing) => (
            <label
              key={pairing.id}
              className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-5 transition ${
                selectedFont === pairing.id
                  ? "border-[var(--primary)] bg-[var(--primary-light)]"
                  : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              <input
                type="radio"
                name="font_pairing"
                value={pairing.id}
                checked={selectedFont === pairing.id}
                onChange={() => setSelectedFont(pairing.id)}
                className="sr-only"
              />
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                  {pairing.label}
                </span>
                {selectedFont === pairing.id && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mb-3 text-xs text-stone-400 dark:text-stone-500">{pairing.description}</p>

              <div className="space-y-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3">
                <p
                  className="text-lg font-bold leading-tight text-stone-800 dark:text-stone-100"
                  style={{ fontFamily: getPreviewFontFamily(pairing.id, "heading") }}
                >
                  The quick brown fox
                </p>
                <p
                  className="text-sm leading-snug text-stone-600 dark:text-stone-300"
                  style={{ fontFamily: getPreviewFontFamily(pairing.id, "body") }}
                >
                  jumps over the lazy dog. Beautiful typography makes every word count.
                </p>
              </div>

              <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
                <span style={{ fontFamily: getPreviewFontFamily(pairing.id, "heading") }}>
                  {pairing.heading}
                </span>
                {" + "}
                <span style={{ fontFamily: getPreviewFontFamily(pairing.id, "body") }}>
                  {pairing.body}
                </span>
              </p>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <div
              key={f.key}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm"
            >
              <label className="mb-1 block text-sm font-semibold">{f.label}</label>
              <p className="mb-3 text-xs text-stone-400">{f.description}</p>
              <input
                type="text"
                name={f.key}
                defaultValue={values[f.key] ?? ""}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Legal Placeholders</h2>
        <p className="text-xs text-stone-400">
          These values replace the placeholder text in your Terms of Service and Privacy Policy pages.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {LEGAL_FIELDS.map((f) => (
            <div
              key={f.key}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm"
            >
              <label className="mb-1 block text-sm font-semibold">{f.label}</label>
              <input
                type="text"
                name={f.key}
                defaultValue={values[f.key] ?? ""}
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function getPreviewFontFamily(pairingId: string, role: "heading" | "body"): string {
  const map: Record<string, Record<string, string>> = {
    soft: { heading: "Nunito, sans-serif", body: "Inter, sans-serif" },
    modern: { heading: "var(--font-geist-sans), sans-serif", body: "var(--font-geist-mono), monospace" },
    bold: { heading: "Space Grotesk, sans-serif", body: "DM Sans, sans-serif" },
    classic: { heading: "Playfair Display, serif", body: "Source Sans 3, sans-serif" },
    creative: { heading: "Fraunces, serif", body: "Outfit, sans-serif" },
  };
  return map[pairingId]?.[role] ?? "sans-serif";
}
