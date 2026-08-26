import { requireUser } from "@/lib/auth";
import { getEvent, getUserTagIds, hasTagAccess } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EventSignupButton } from "@/components/events/event-signup-button";
import { EventUpdateForm } from "@/components/events/event-update-form";
import { EventAdminActions } from "@/components/events/event-admin-actions";
import { MarkdownContent } from "@/components/markdown-content";

export const metadata = { title: "Event" };

function formatEventDate(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const dateStr = start.toLocaleDateString("en-US", dateOpts);
  const timeStr = start.toLocaleTimeString("en-US", timeOpts);
  if (!endsAt) return `${dateStr} at ${timeStr}`;
  const end = new Date(endsAt);
  return `${dateStr}, ${timeStr} – ${end.toLocaleTimeString("en-US", timeOpts)}`;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();
  const { id } = await params;
  const event = await getEvent(id, profile.id);
  if (!event) notFound();

  // Check tag access for gated details
  const userTagIds = await getUserTagIds(profile.id);
  const canSeeDetails = hasTagAccess(event.required_tag_id, userTagIds);
  const isHost = event.created_by === profile.id;
  const isPrivileged = profile.role === "admin" || profile.role === "moderator";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/events"
        className="text-sm font-medium text-[var(--primary)] transition hover:brightness-110"
      >
        &larr; All Events
      </Link>

      <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {event.cover_url && (
          <Image
            src={event.cover_url}
            alt=""
            width={800}
            height={300}
            className="mb-4 w-full rounded-xl object-cover max-h-64"
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold dark:text-stone-100">{event.title}</h1>
          {event.recurring_frequency && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300">
              {FREQUENCY_LABELS[event.recurring_frequency] ?? event.recurring_frequency}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="text-sm font-medium text-[var(--primary)]">
            {formatEventDate(event.starts_at, event.ends_at)}
          </p>

          {/* Host */}
          {event.creator && (
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Hosted by{" "}
              <span className="font-medium">
                {event.creator.display_name ?? event.creator.username}
              </span>
            </p>
          )}

          {/* Special Guest */}
          {event.special_guest && (
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Featured guest:{" "}
              {event.special_guest_url ? (
                <a
                  href={event.special_guest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  {event.special_guest}
                </a>
              ) : (
                <span className="font-medium">{event.special_guest}</span>
              )}
            </p>
          )}

          {/* Location — tag-gated */}
          {event.location && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {canSeeDetails ? event.location : "Location visible to members with access"}
            </p>
          )}

          {/* Event link — tag-gated */}
          {event.event_link && (
            <p className="text-sm">
              {canSeeDetails ? (
                <a
                  href={event.event_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Join meeting &rarr;
                </a>
              ) : (
                <span className="text-stone-400 dark:text-stone-500">
                  Meeting link visible to members with access
                </span>
              )}
            </p>
          )}

          {/* Tag restriction notice */}
          {event.required_tag_id && !canSeeDetails && (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500 dark:bg-stone-900 dark:text-stone-400">
              This event has restricted details. Contact an admin for access.
            </p>
          )}
        </div>

        {event.description && (
          <div className="mt-4 text-[15px] leading-relaxed">
            <MarkdownContent content={event.description} />
          </div>
        )}

        <div className="mt-5 flex items-center gap-4 border-t border-stone-100 pt-4 dark:border-stone-800">
          <EventSignupButton
            eventId={event.id}
            signedUp={event.signed_up_by_me}
            signupCount={event.signup_count}
          />
          {isPrivileged && (
            <EventAdminActions eventId={event.id} />
          )}
        </div>
      </article>

      {/* Other events in this recurring group */}
      {event.group_events.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Other dates in this series
          </h2>
          <div className="space-y-2">
            {event.group_events.map((ge) => (
              <Link
                key={ge.id}
                href={`/events/${ge.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <span className="font-medium dark:text-stone-100">{ge.title}</span>
                <span className="text-xs text-stone-400">
                  {new Date(ge.starts_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Updates */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold dark:text-stone-100">Updates</h2>

        {(isHost || isPrivileged) && (
          <EventUpdateForm eventId={event.id} />
        )}

        {event.updates.length === 0 && (
          <p className="text-sm text-stone-400 dark:text-stone-500">
            No updates yet.
          </p>
        )}

        {event.updates.map((update) => (
          <div
            key={update.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold dark:text-stone-100">
                {update.author?.display_name ?? update.author?.username ?? "Admin"}
              </span>
              <span className="text-xs text-stone-400">
                {new Date(update.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="mt-2 text-sm leading-relaxed">
              <MarkdownContent content={update.body} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
