import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { searchAll } from "@/lib/search";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import { SearchForm } from "@/components/search-form";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireUser();
  const { q } = await searchParams;
  const query = q ?? "";
  const results = query ? await searchAll(query, profile.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Find posts, threads, members, and courses.
        </p>
      </div>

      <SearchForm initialQuery={query} />

      {query && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <Link
              key={`${r.type}-${r.id}`}
              href={
                r.type === "post" ? "/feed" :
                r.type === "thread" ? `/thread/${r.id}` :
                r.type === "member" ? `/member/${r.username}` :
                `/course/${r.id}`
              }
              className="block rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm transition hover:border-stone-300 dark:hover:border-stone-700"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-stone-100 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-stone-600 dark:text-stone-300 capitalize">
                  {r.type}
                </span>
                {r.category && (
                  <span className="text-xs text-stone-400 dark:text-stone-400">
                    {r.category}
                  </span>
                )}
                <span className="ml-auto text-xs text-stone-400 dark:text-stone-400">
                  {formatRelative(r.created_at)}
                </span>
              </div>
              {r.title && (
                <h3 className="mt-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {r.title}
                </h3>
              )}
              <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">
                {r.body}
              </p>
              {r.username && (
                <div className="mt-2 flex items-center gap-2">
                  <UserAvatar
                    profile={{ id: r.id, username: r.username, display_name: r.display_name ?? null, avatar_url: r.avatar_url ?? null }}
                    size={20}
                  />
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    @{r.username}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
