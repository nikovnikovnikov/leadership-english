"use client";

import { useActionState } from "react";
import { updateProfileLinks, type ProfileState } from "@/actions/profile";

export function ProfileLinksForm({
  instagram_url,
  substack_url,
  x_url,
  youtube_url,
  custom_link_url,
  custom_link_label,
}: {
  instagram_url: string | null;
  substack_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  custom_link_url: string | null;
  custom_link_label: string | null;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfileLinks,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-[var(--primary-light)] dark:bg-[var(--primary-light)] px-3 py-2 text-sm text-[var(--primary)] dark:text-[var(--primary)]">
          Links updated.
        </p>
      )}

      <div>
        <label htmlFor="ig" className="mb-1 block text-sm font-medium">
          Instagram
        </label>
        <input
          id="ig"
          name="instagram_url"
          type="url"
          defaultValue={instagram_url ?? ""}
          placeholder="https://instagram.com/yourname"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label htmlFor="sub" className="mb-1 block text-sm font-medium">
          Substack
        </label>
        <input
          id="sub"
          name="substack_url"
          type="url"
          defaultValue={substack_url ?? ""}
          placeholder="https://yourname.substack.com"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label htmlFor="xt" className="mb-1 block text-sm font-medium">
          X (Twitter)
        </label>
        <input
          id="xt"
          name="x_url"
          type="url"
          defaultValue={x_url ?? ""}
          placeholder="https://x.com/yourname"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label htmlFor="yt" className="mb-1 block text-sm font-medium">
          YouTube
        </label>
        <input
          id="yt"
          name="youtube_url"
          type="url"
          defaultValue={youtube_url ?? ""}
          placeholder="https://youtube.com/@yourname"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cl" className="mb-1 block text-sm font-medium">
            Custom link label
          </label>
          <input
            id="cl"
            name="custom_link_label"
            defaultValue={custom_link_label ?? ""}
            placeholder="e.g. My Website"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div>
          <label htmlFor="cu" className="mb-1 block text-sm font-medium">
            Custom link URL
          </label>
          <input
            id="cu"
            name="custom_link_url"
            type="url"
            defaultValue={custom_link_url ?? ""}
            placeholder="https://..."
            className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save links"}
      </button>
    </form>
  );
}
