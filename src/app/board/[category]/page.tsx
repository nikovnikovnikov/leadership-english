import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getThreads, getCategories, getUserTagIds, hasTagAccess, getAllTags } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";
import { ThreadComposer } from "@/components/board/thread-composer";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Board" };

export default async function CategoryPage({
  params,
}: PageProps<"/board/[category]">) {
  const { category } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.id === category);
  if (!cat) notFound();

  const profile = await requireUser();
  const userTagIds = await getUserTagIds(profile.id);

  if (!hasTagAccess(cat.required_tag_id, userTagIds)) {
    let tagName = "restricted";
    if (cat.required_tag_id) {
      const allTags = await getAllTags();
      tagName = allTags.find((t) => t.id === cat.required_tag_id)?.name ?? tagName;
    }
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/board"
            className="text-xs font-medium text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            ← All categories
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-400 dark:text-stone-500">
            {cat.label}
          </h1>
          {cat.description && (
            <p className="mt-0.5 text-sm text-stone-400 dark:text-stone-500">
              {cat.description}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-600">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
          </svg>
          <p className="mt-3 text-sm font-medium text-stone-500 dark:text-stone-400">
            This board is restricted
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            You need the <span className="font-semibold">{tagName}</span> tag to access it.
            Contact an admin to get access.
          </p>
        </div>
      </div>
    );
  }

  const threads = await getThreads(cat.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/board"
            className="text-xs font-medium text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            ← All categories
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight dark:text-stone-100">
            {cat.label}
          </h1>
          {cat.description && (
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              {cat.description}
            </p>
          )}
        </div>
        <span className="rounded-full bg-stone-100 dark:bg-white/10 px-3 py-1 text-xs font-medium text-stone-500 dark:text-stone-400">
          {threads.length} thread{threads.length === 1 ? "" : "s"}
        </span>
      </div>

      <ThreadComposer category={cat.id} />

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No threads yet in {cat.label}. Start one.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          {threads.map((t, i) => (
            <Link
              key={t.id}
              href={`/thread/${t.id}`}
              className={`block p-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 ${
                i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {t.pinned && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Pinned
                  </span>
                )}
                <h2 className="truncate font-semibold text-stone-800 dark:text-stone-100 hover:text-[var(--primary)] dark:hover:brightness-110">
                  {t.title}
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <UserAvatar profile={t.author} size={20} />
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  {t.author?.display_name ?? t.author?.username}
                </span>
                <span>· {formatRelative(t.last_activity_at)}</span>
                <span className="ml-auto">
                  {t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-stone-400 dark:text-stone-400">
        {cat.label} — replies bump the thread. Hello,{" "}
        {profile.username}.
      </p>
    </div>
  );
}
