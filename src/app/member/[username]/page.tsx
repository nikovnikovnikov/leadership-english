import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getTotalPoints,
  getActivity,
  getPublicTagsForUser,
  getTutorCompletionCourses,
  getUserFeedPosts,
  getUserThreads,
  getActivityHeatmap,
} from "@/lib/queries";
import { formatRelative, canEdit, getEditableCommentIds } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { MessageButton } from "@/components/messages/message-button";
import { SocialLinks } from "@/components/social-links";
import { BlockButton } from "@/components/block-button";
import { OnlineDot } from "@/components/online-dot";
import { PostCard } from "@/components/feed/post-card";
import { ThreadListItem } from "@/components/board/thread-list-item";
import { ActivityHeatMap } from "@/components/activity-heat-map";

const KIND_LABELS: Record<string, string> = {
  feed_post: "Posted to the feed",
  feed_comment: "Commented on a post",
  thread: "Started a thread",
  thread_reply: "Replied in a thread",
  like_received: "Received a like",
};

export const metadata = { title: "Member" };

export default async function MemberPage({
  params,
}: PageProps<"/member/[username]">) {
  const { username } = await params;
  const currentProfile = await requireUser();

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, is_admin, role, created_at, last_seen_at, instagram_url, substack_url, x_url, youtube_url, custom_link_url, custom_link_label",
    )
    .eq("username", username)
    .single();

  if (!member) notFound();

  const [points, activity, blockData, publicTags, tutorCourses, feedPosts, threads, heatmap] =
    await Promise.all([
      getTotalPoints(member.id),
      getActivity(member.id, 20),
      supabase
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", currentProfile.id)
        .eq("blocked_id", member.id)
        .maybeSingle(),
      getPublicTagsForUser(member.id),
      getTutorCompletionCourses(member.id),
      getUserFeedPosts(member.id, currentProfile.id, 10),
      getUserThreads(member.id, 10),
      getActivityHeatmap(member.id),
    ]);
  const isBlocked = !!blockData.data;
  const isOwnProfile = member.id === currentProfile.id;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar profile={member} size={56} />
            <OnlineDot lastSeenAt={member.last_seen_at} />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              {member.display_name ?? member.username}
              {member.role === "admin" && (
                <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-xs font-bold text-[var(--primary)] dark:bg-[var(--primary-light)] dark:text-[var(--primary)]">
                  ADMIN
                </span>
              )}
              {member.role === "moderator" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  MOD
                </span>
              )}
            </h1>
            {publicTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {publicTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {tutorCourses.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tutorCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition hover:brightness-95 dark:bg-emerald-500/15 dark:text-emerald-400"
                  >
                    Completed with a tutor — {course.title}
                  </Link>
                ))}
              </div>
            )}
            <p className="text-sm text-stone-500 dark:text-stone-400">
              @{member.username} · joined {formatRelative(member.created_at)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6 rounded-xl bg-stone-50 px-4 py-3 dark:bg-[#0c0a09]/80">
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-400">Total points</p>
            <p className="text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">{points}</p>
          </div>
          {!isOwnProfile && (
            <div className="ml-auto flex items-center gap-3">
              <MessageButton userId={member.id} />
              <BlockButton targetUserId={member.id} isBlocked={isBlocked} />
            </div>
          )}
        </div>
        <div className="mt-3">
          <SocialLinks profile={member} size="md" />
        </div>
      </div>

      {/* Activity Heat Map */}
      {heatmap.length > 0 && heatmap.some((d) => d.count > 0) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-3 font-semibold">Activity</h2>
          <ActivityHeatMap days={heatmap} />
        </div>
      )}

      {/* Feed Posts */}
      {feedPosts.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-3 font-semibold">Feed posts</h2>
          <div className="space-y-4">
            {feedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentProfile.id}
                isAdmin={currentProfile.role === "admin" || currentProfile.role === "moderator"}
                canEditPost={canEdit(
                  post.created_at,
                  post.author_id,
                  currentProfile.id,
                  currentProfile.role === "admin" || currentProfile.role === "moderator",
                )}
                editableCommentIds={getEditableCommentIds(
                  post.comments,
                  currentProfile.id,
                  currentProfile.role === "admin" || currentProfile.role === "moderator",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Board Threads */}
      {threads.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-3 font-semibold">Board threads</h2>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {threads.map((thread) => (
              <ThreadListItem key={thread.id} thread={thread} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="mb-3 font-semibold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-400">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-stone-600 dark:text-stone-300">
                  {KIND_LABELS[a.kind] ?? a.kind}
                </span>
                <span className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-400">
                  {formatRelative(a.created_at)}
                  <span className="font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                    +{a.points}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/members"
        className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← All members
      </Link>
    </div>
  );
}
