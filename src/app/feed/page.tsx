import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getFeedThreads, getSettings, getCategories } from "@/lib/queries";
import { FeedComposer } from "@/components/feed/post-composer";
import { FeedClient } from "@/components/feed/feed-client";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/utils";
import { TopContributors, TrendingThreads } from "@/components/feed/feed-sidebar";
import { MarkdownContent } from "@/components/markdown-content";

export const metadata = { title: "Feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const profile = await requireUser();
  const [threads, settings, categories] = await Promise.all([
    getFeedThreads(profile.id, 20),
    getSettings(),
    getCategories(),
  ]);

  const supabase = await createClient();

  const { count: activityCount } = await supabase
    .from("activity")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);
  const isNew = (activityCount ?? 0) === 0;

  const [threadCountRes, replyCountRes, pointsRes, lessonsRes] = await Promise.all([
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id),
    supabase
      .from("thread_replies")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id),
    supabase
      .from("activity")
      .select("points", { count: "exact" })
      .eq("user_id", profile.id),
    supabase
      .from("course_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("completed", true),
  ]);

  const userPoints = (pointsRes.data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);

  const weekAgo = daysAgo(7);

  const announcementsEnabled = settings.announcements_enabled === "true";
  const announcementTitle = settings.announcements_title || "What's New";
  const announcementBody = settings.announcements_body || "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1 space-y-6">
          {announcementsEnabled && announcementBody && (
            <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-5">
              <h2 className="mb-2 text-sm font-bold tracking-wide uppercase text-[var(--primary)]">
                {announcementTitle}
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-stone-700 dark:text-stone-300">
                <MarkdownContent content={announcementBody} />
              </div>
            </div>
          )}

          <FeedComposer categories={categories} />

          <FeedClient
            threads={threads}
            categories={categories}
            showWelcome={isNew}
            hasPosts={(threadCountRes.count ?? 0) > 0}
            hasAvatar={!!profile.avatar_url}
            userPoints={userPoints}
            commentCount={replyCountRes.count ?? 0}
            lessonsUnlocked={lessonsRes.count ?? 0}
            siteName={settings.site_name || "Sanctum"}
            logoInitial={settings.logo_initial || "S"}
          />
        </div>

        <aside className="hidden w-48 shrink-0 space-y-4 lg:block">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />}>
            <TopContributors since={weekAgo} />
          </Suspense>
          <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-900" />}>
            <TrendingThreads since={weekAgo} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
