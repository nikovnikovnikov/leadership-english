import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMembers, getTotalPointsBatch } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const profile = await requireUser();
  const members = await getMembers();

  const pointsMap = await getTotalPointsBatch(members.map((m) => m.id));
  const withPoints = members
    .map((m) => ({ ...m, points: pointsMap.get(m.id) ?? 0 }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {members.length} member{members.length === 1 ? "" : "s"} · ranked by
          points earned
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
        {withPoints.map((m, i) => (
          <Link
            key={m.id}
            href={`/member/${m.username}`}
            className={`flex items-center gap-3 p-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 ${
              i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""
            }`}
          >
            <span
              className={`w-6 text-center text-sm font-semibold ${
                i === 0
                  ? "text-amber-500"
                  : i === 1
                    ? "text-stone-400"
                    : i === 2
                      ? "text-orange-400"
                      : "text-stone-300 dark:text-stone-300"
              }`}
            >
              {i + 1}
            </span>
            <UserAvatar profile={m} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {m.display_name ?? m.username}
                {m.role === "admin" && (
                  <span className="rounded-full bg-[var(--primary-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                    ADMIN
                  </span>
                )}
                {m.role === "moderator" && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    MOD
                  </span>
                )}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-400">
                @{m.username} · joined {formatRelative(m.created_at)}
              </p>
            </div>
            <span className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
              {m.points} pts
            </span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-400">
        You&apos;re {profile.username} — keep showing up.
      </p>
    </div>
  );
}
