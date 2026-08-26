import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getUserTagIds, hasTagAccess, getAllTags } from "@/lib/queries";

export const metadata = { title: "Board" };

async function getNewActivityByCategory() {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: newThreads } = await supabase
    .from("threads")
    .select("category")
    .gte("created_at", yesterday);

  const { data: newReplies } = await supabase
    .from("thread_replies")
    .select("thread_id, threads!inner(category)")
    .gte("created_at", yesterday);

  const threadsByCategory = new Map<string, number>();
  for (const t of newThreads ?? []) {
    threadsByCategory.set(t.category, (threadsByCategory.get(t.category) ?? 0) + 1);
  }

  const repliesByCategory = new Map<string, number>();
  for (const r of newReplies ?? []) {
    const cat = (r as unknown as { threads: { category: string } }).threads?.category;
    if (cat) {
      repliesByCategory.set(cat, (repliesByCategory.get(cat) ?? 0) + 1);
    }
  }

  return { threadsByCategory, repliesByCategory };
}

export default async function BoardPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [categories, userTagIds] = await Promise.all([
    getCategories(),
    getUserTagIds(profile.id),
  ]);

  // Fetch tag names for locked boards
  const requiredTagIds = [...new Set(categories.map((c) => c.required_tag_id).filter(Boolean))] as string[];

  const [allTags, threadsResult, activity] = await Promise.all([
    requiredTagIds.length ? getAllTags() : Promise.resolve([]),
    supabase.from("threads").select("id, category"),
    getNewActivityByCategory(),
  ]);

  const tagMap = new Map(allTags.map((t) => [t.id, t.name]));
  const threads = threadsResult.data;

  const counts = new Map<string, number>();
  for (const t of threads ?? []) {
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  }

  const { threadsByCategory, repliesByCategory } = activity;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">The board</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Message-board style discussions, sorted by latest activity.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => {
          const locked = !hasTagAccess(cat.required_tag_id, userTagIds);
          const newThreads = threadsByCategory.get(cat.id) ?? 0;
          const newReplies = repliesByCategory.get(cat.id) ?? 0;
          const hasNew = newThreads > 0 || newReplies > 0;

          return (
            <Link
              key={cat.id}
              href={locked ? "#" : `/board/${cat.id}`}
                className={`group rounded-2xl border p-4 shadow-sm transition ${
                locked
                  ? "border-stone-200 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900/50"
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 hover:border-[var(--primary)] hover:shadow"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className={`font-semibold ${locked ? "text-stone-400 dark:text-stone-500" : "text-stone-800 dark:text-stone-100 group-hover:text-[var(--primary)] dark:group-hover:brightness-110"}`}>
                    {cat.label}
                  </h2>
                  {locked && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-stone-400 dark:text-stone-500">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasNew && !locked && (
                    <span className="rounded-full bg-[var(--primary-light)] dark:bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                      {newThreads > 0 && `${newThreads} new`}
                      {newThreads > 0 && newReplies > 0 && ", "}
                      {newReplies > 0 && `${newReplies} repl${newReplies === 1 ? "y" : "ies"}`}
                    </span>
                  )}
                  <span className="rounded-full bg-stone-100 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    {counts.get(cat.id) ?? 0}
                  </span>
                </div>
              </div>
              {cat.description && (
                <p className={`mt-1 text-sm ${locked ? "text-stone-400 dark:text-stone-500" : "text-stone-500 dark:text-stone-400"}`}>
                  {cat.description}
                </p>
              )}
              {locked && cat.required_tag_id && (
                <p className="mt-2 text-xs font-medium text-stone-400 dark:text-stone-500">
                  Requires: {tagMap.get(cat.required_tag_id) ?? "restricted"} tag
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-400">
        Hi {profile.display_name ?? profile.username} — threads bump to the top
        when someone replies.
      </p>
    </div>
  );
}
