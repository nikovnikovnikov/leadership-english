import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/queries";
import { BarChart } from "@/components/admin/bar-chart";

export const metadata = { title: "Analytics — Admin" };

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Community health metrics for the last 30 days.
      </p>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">Total members</p>
          <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {analytics.totalMembers}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">Active this week</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">
            {analytics.activeThisWeek}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">Weekly retention</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">
            {analytics.retentionRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">
            New members (30d)
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {analytics.newMembers.reduce((sum, d) => sum + d.count, 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          data={analytics.dau}
          maxValue={Math.max(...analytics.dau.map((d) => d.count), 1)}
          color="bg-[var(--primary)]"
          label="Daily active users"
        />
        <BarChart
          data={analytics.engagement}
          maxValue={Math.max(...analytics.engagement.map((d) => d.count), 1)}
          color="bg-amber-500"
          label="Content created (posts + threads + replies)"
        />
        <BarChart
          data={analytics.newMembers}
          maxValue={Math.max(...analytics.newMembers.map((d) => d.count), 1)}
          color="bg-blue-500"
          label="New members"
        />
      </div>

      {/* Category activity */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-400">
          Category activity
        </h3>
        {analytics.categoryActivity.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-400">No threads yet.</p>
        ) : (
          <div className="space-y-2">
            {analytics.categoryActivity.map((cat) => {
              const total = cat.thread_count + cat.reply_count;
              const maxTotal = analytics.categoryActivity[0]
                ? analytics.categoryActivity[0].thread_count +
                  analytics.categoryActivity[0].reply_count
                : 1;
              const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm font-medium capitalize">
                    {cat.category.replace("-", " ")}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-stone-100 dark:bg-white/5">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-[var(--primary)]/80"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-stone-500 dark:text-stone-400">
                    {cat.thread_count}T / {cat.reply_count}R
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
