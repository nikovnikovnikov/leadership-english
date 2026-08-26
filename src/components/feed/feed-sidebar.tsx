import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import type { ProfileRef } from "@/lib/queries";

type TopContributor = ProfileRef & { points: number; rank: number };

export async function TopContributors({ since }: { since: string }) {
  const supabase = await createClient();

  const { data: recentActivity } = await supabase
    .from("activity")
    .select("user_id, points")
    .gte("created_at", since);

  if (!recentActivity?.length) return null;

  const pointsMap = new Map<string, number>();
  for (const a of recentActivity) {
    pointsMap.set(a.user_id, (pointsMap.get(a.user_id) ?? 0) + a.points);
  }

  const topIds = [...pointsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (!topIds.length) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", topIds);

  if (!profiles?.length) return null;

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const contributors: TopContributor[] = topIds
    .map((id, i) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return {
        ...p,
        points: pointsMap.get(id) ?? 0,
        rank: i + 1,
      } as TopContributor;
    })
    .filter(Boolean) as TopContributor[];

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-300">
        Top contributors this week
      </h3>
      <ul className="space-y-2">
        {contributors.map((c) => (
          <li key={c.id}>
            <Link
              href={`/member/${c.username}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
            >
              <span
                className={`w-5 text-center text-xs font-bold ${
                  c.rank === 1
                    ? "text-amber-500"
                    : c.rank === 2
                      ? "text-stone-400"
                      : c.rank === 3
                        ? "text-orange-400"
                        : "text-stone-300 dark:text-stone-400"
                }`}
              >
                {c.rank}
              </span>
              <UserAvatar profile={c} size={24} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {c.display_name ?? c.username}
              </span>
              <span className="text-xs font-semibold text-[var(--primary)]">
                {c.points}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/members"
        className="mt-3 block text-center text-xs font-medium text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        View all members →
      </Link>
    </div>
  );
}

export async function TrendingThreads({ since }: { since: string }) {
  const supabase = await createClient();

  const { data: threads } = await supabase
    .from("threads")
    .select("id, title, category, reply_count, last_activity_at")
    .gte("last_activity_at", since)
    .order("reply_count", { ascending: false })
    .limit(5);

  if (!threads?.length) return null;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-300">
        Trending threads
      </h3>
      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              href={`/thread/${t.id}`}
              className="block rounded-lg px-2 py-1.5 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
            >
              <p className="text-sm font-medium leading-snug line-clamp-2">
                {t.title}
              </p>
              <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-400">
                {t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"} ·{" "}
                {t.category}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
