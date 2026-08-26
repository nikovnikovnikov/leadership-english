"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { completeSetup, type AuthState } from "@/actions/auth";
import { AvatarUpload } from "@/components/avatar-upload";

export function SetupForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    completeSetup,
    {},
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}

      {/* Avatar — inline, optional */}
      <div className="flex justify-center">
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={avatarUrl}
          onUploaded={async (url) => {
            setAvatarUrl(url);
            const { updateAvatarUrl } = await import("@/actions/profile");
            await updateAvatarUrl(url);
            router.refresh();
          }}
        />
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          placeholder="e.g. quiet_learner"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          3–20 characters: letters, numbers, underscores.
        </p>
      </div>

      {/* Display name */}
      <div>
        <label htmlFor="display_name" className="mb-1 block text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          placeholder="Optional — defaults to your username"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {/* Social links — collapsible */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-stone-400 transition hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300">
          Add social links (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="instagram_url" className="mb-1 block text-sm font-medium">
              Instagram
            </label>
            <input
              id="instagram_url"
              name="instagram_url"
              type="url"
              placeholder="https://instagram.com/yourname"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label htmlFor="substack_url" className="mb-1 block text-sm font-medium">
              Substack
            </label>
            <input
              id="substack_url"
              name="substack_url"
              type="url"
              placeholder="https://yourname.substack.com"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label htmlFor="x_url" className="mb-1 block text-sm font-medium">
              X (Twitter)
            </label>
            <input
              id="x_url"
              name="x_url"
              type="url"
              placeholder="https://x.com/yourname"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label htmlFor="youtube_url" className="mb-1 block text-sm font-medium">
              YouTube
            </label>
            <input
              id="youtube_url"
              name="youtube_url"
              type="url"
              placeholder="https://youtube.com/@yourname"
              className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom_link_label" className="mb-1 block text-sm font-medium">
                Custom link label
              </label>
              <input
                id="custom_link_label"
                name="custom_link_label"
                placeholder="e.g. My Website"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label htmlFor="custom_link_url" className="mb-1 block text-sm font-medium">
                Custom link URL
              </label>
              <input
                id="custom_link_url"
                name="custom_link_url"
                type="url"
                placeholder="https://..."
                className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Setting up..." : "Complete setup"}
      </button>
    </form>
  );
}
