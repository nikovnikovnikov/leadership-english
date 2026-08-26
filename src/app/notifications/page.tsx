import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import { MarkNotificationsRead } from "@/components/messages/mark-notifications-read";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

function notificationLink(n: { target_type: string; target_id: string | null }): string {
  switch (n.target_type) {
    case "thread":
      return `/thread/${n.target_id}`;
    case "thread_reply":
      return `/thread/${n.target_id}`;
    case "feed_post":
      return `/feed`;
    case "feed_comment":
      return `/feed`;
    case "event":
      return `/events/${n.target_id}`;
    default:
      return "/feed";
  }
}

export default async function NotificationsPage() {
  const profile = await requireUser();
  const notifications = await getNotifications(profile.id);

  return (
    <div className="space-y-6">
      <MarkNotificationsRead />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Activity that mentions you or involves content you&apos;re following.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={notificationLink(n)}
              className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                n.read_at
                  ? "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                  : "border-[var(--primary)] bg-[var(--primary-light)] dark:bg-[var(--primary-light)]"
              }`}
            >
              <UserAvatar profile={n.actor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-700 dark:text-stone-200">
                  {n.type === "mention" && (
                    <>
                      <span className="font-semibold">
                        {n.actor?.display_name ?? n.actor?.username ?? "Someone"}
                      </span>{" "}
                      mentioned you
                    </>
                  )}
                  {n.type === "reply" && (
                    <>
                      <span className="font-semibold">
                        {n.actor?.display_name ?? n.actor?.username ?? "Someone"}
                      </span>{" "}
                      replied
                    </>
                  )}
                  {n.type === "like" && (
                    <>
                      <span className="font-semibold">
                        {n.actor?.display_name ?? n.actor?.username ?? "Someone"}
                      </span>{" "}
                      liked your content
                    </>
                  )}
                </p>
                {n.message && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                    {n.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                  {formatRelative(n.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
