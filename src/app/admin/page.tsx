import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: memberCount }, { count: openReports }, { count: courses }, { count: feedPosts }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("feed_posts").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Members", value: memberCount ?? 0, href: "/admin/members" },
    {
      label: "Open reports",
      value: openReports ?? 0,
      href: "/admin/reports",
      warn: (openReports ?? 0) > 0,
    },
    { label: "Courses", value: courses ?? 0, href: "/admin/courses" },
    { label: "Feed posts", value: feedPosts ?? 0, href: "/feed" },
  ];

  return (
    <div>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Everything you need to run the community.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm transition hover:border-[var(--primary)]"
          >
            <p className="text-xs font-medium text-stone-400 dark:text-stone-400">{s.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                s.warn ? "text-amber-600" : "text-stone-900 dark:text-stone-100"
              }`}
            >
              {s.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
