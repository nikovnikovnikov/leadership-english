"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ThreadCard } from "@/components/feed/thread-card";
import { FeedSort, type SortMode } from "@/components/feed/feed-sort";
import { WelcomeModal } from "@/components/welcome-modal";
import { OnboardingChecklist, type OnboardingProgress } from "@/components/onboarding-checklist";
import { loadMoreFeedThreads } from "@/actions/feed";
import type { FeedThread } from "@/lib/queries";
import { categoryLabel } from "@/lib/config";

type Category = { id: string; label: string };

export function FeedClient({
  threads: initialThreads,
  categories,
  showWelcome,
  hasPosts,
  hasAvatar,
  userPoints,
  commentCount,
  lessonsUnlocked,
  siteName,
  logoInitial,
}: {
  threads: FeedThread[];
  categories: Category[];
  showWelcome: boolean;
  hasPosts: boolean;
  hasAvatar: boolean;
  userPoints: number;
  commentCount: number;
  lessonsUnlocked: number;
  siteName: string;
  logoInitial: string;
}) {
  const [allThreads, setAllThreads] = useState<FeedThread[]>(initialThreads);
  const [sort, setSort] = useState<SortMode>("new");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialThreads.length === 20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => {
    const filtered = boardFilter === "all"
      ? allThreads
      : allThreads.filter((t) => t.category === boardFilter);

    return [...filtered].sort((a, b) => {
      if (sort === "popular") return b.like_count - a.like_count;
      if (sort === "discussed") return b.reply_count - a.reply_count;
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });
  }, [sort, boardFilter, allThreads]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const lastThread = allThreads[allThreads.length - 1];
    if (!lastThread) return;

    setLoadingMore(true);
    try {
      const result = await loadMoreFeedThreads(lastThread.last_activity_at);
      setAllThreads((prev) => [...prev, ...result.threads]);
      setHasMore(result.hasMore);
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [allThreads, loadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  const progress: OnboardingProgress = {
    hasAvatar,
    postCount: hasPosts ? 1 : 0,
    commentCount,
    points: userPoints,
    lessonsUnlocked,
  };

  const showPrompt = !showWelcome && !hasPosts && !dismissedPrompt;

  return (
    <>
      {showWelcome && <WelcomeModal siteName={siteName} logoInitial={logoInitial} />}

      <OnboardingChecklist progress={progress} />

      {showPrompt && (
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/40 bg-[var(--primary-light)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                Introduce yourself
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Tell the {siteName} community who you are. This is the best way to get started.
              </p>
            </div>
            <button
              onClick={() => setDismissedPrompt(true)}
              className="shrink-0 rounded-lg p-1 text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-300"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <Link
            href="#new-thread"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            Start a thread
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Community feed</h1>
        <FeedSort initial={sort} onChange={setSort} />
      </div>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Browse threads from all boards. Earn points that unlock lessons.
      </p>

      {/* Board filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setBoardFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            boardFilter === "all"
              ? "bg-[var(--primary)] text-white"
              : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          }`}
        >
          All boards
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setBoardFilter(cat.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              boardFilter === cat.id
                ? "bg-[var(--primary)] text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {boardFilter === "all"
              ? "No threads yet. Be the first to start a discussion."
              : `No threads in ${categoryLabel(boardFilter)} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}

          <div ref={sentinelRef} className="h-4" />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[var(--primary)]" />
            </div>
          )}

          {!hasMore && threads.length > 0 && (
            <p className="py-4 text-center text-xs text-stone-400 dark:text-stone-500">
              You&apos;ve reached the beginning. Nice.
            </p>
          )}
        </div>
      )}
    </>
  );
}
