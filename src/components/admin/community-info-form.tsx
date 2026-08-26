"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { updateCommunityInfo, type AdminActionState } from "@/actions/admin";

const DEFAULTS: Record<string, string> = {
  community_start_here: `Welcome to **Sanctum**! This is a space for thoughtful conversation and learning. Here's how to get started:

1. **Introduce yourself** — Post in the General category and tell us who you are.
2. **Explore the courses** — Unlock lessons by earning points through participation.
3. **Join the conversation** — Comment on posts, reply in threads, and engage with others.

Earn points by posting, commenting, and receiving likes. These points unlock access to gated course lessons.`,
  community_about: `Sanctum is a private community for people who want to go deeper. No algorithms, no ads, no noise — just real conversation between real people.`,
  community_rules: `## Community Guidelines

**Be respectful.** Treat everyone with dignity. Disagreement is welcome; personal attacks are not.

**Stay on topic.** Post in the right category. Keep conversations constructive.

**No spam or self-promotion.** Share value, not links to your latest launch.

**Protect privacy.** What's shared here stays here. Don't screenshot or redistribute members' posts.

**No medical or legal advice.** Share experiences, not prescriptions. Always consult a professional.`,
};

const FIELDS = [
  {
    key: "community_start_here",
    label: "Start Here",
    description: "Shown to new members at the top of the feed. Guide them on what to do first.",
  },
  {
    key: "community_about",
    label: "About This Community",
    description: "A short pitch that describes what this community is about.",
  },
  {
    key: "community_rules",
    label: "Community Rules",
    description: "Guidelines and expectations. Supports markdown.",
  },
] as const;

export function CommunityInfoForm({
  values,
}: {
  values: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    updateCommunityInfo,
    {},
  );
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function resetField(key: string) {
    const textarea = refs.current[key];
    if (textarea) {
      textarea.value = DEFAULTS[key] ?? "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {FIELDS.map((f) => (
        <div
          key={f.key}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm"
        >
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold">{f.label}</label>
            <button
              type="button"
              onClick={() => resetField(f.key)}
              className="text-xs font-medium text-stone-400 transition hover:text-[var(--primary)] dark:hover:text-[var(--primary)]"
            >
              Reset to default
            </button>
          </div>
          <p className="mb-3 text-xs text-stone-400 dark:text-stone-400">{f.description}</p>
          <textarea
            ref={(el) => { refs.current[f.key] = el; }}
            name={f.key}
            rows={8}
            defaultValue={values[f.key] ?? ""}
            className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      ))}

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save community info"}
      </button>
    </form>
  );
}
