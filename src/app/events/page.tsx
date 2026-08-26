import { requireUser } from "@/lib/auth";
import { getEvents } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Events" };

function formatEventDate(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  const startStr = start.toLocaleDateString("en-US", opts);
  if (!endsAt) return startStr;
  const end = new Date(endsAt);
  return `${startStr} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export default async function EventsPage() {
  const profile = await requireUser();
  const events = await getEvents(profile.id);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.starts_at) >= now);
  const past = events.filter((e) => new Date(e.starts_at) < now);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-stone-100">Events</h1>
        {(profile.role === "admin" || profile.role === "moderator") && (
          <Link
            href="/admin/events/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            + New Event
          </Link>
        )}
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <p className="py-12 text-center text-stone-400 dark:text-stone-500">
          No events yet. {(profile.role === "admin" || profile.role === "moderator") ? "Create one to get started." : "Check back soon!"}
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Upcoming
          </h2>
          {upcoming.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            >
              {event.cover_url && (
                <Image
                  src={event.cover_url}
                  alt=""
                  width={600}
                  height={200}
                  className="mb-3 w-full rounded-xl object-cover max-h-48"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold dark:text-stone-100">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--primary)]">
                    {formatEventDate(event.starts_at, event.ends_at)}
                  </p>
                  {event.location && (
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                      {event.location}
                    </p>
                  )}
                </div>
                {event.recurring_frequency && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300">
                    {FREQUENCY_LABELS[event.recurring_frequency] ?? event.recurring_frequency}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
                {event.creator && (
                  <span>
                    Hosted by {event.creator.display_name ?? event.creator.username}
                  </span>
                )}
                {event.special_guest && (
                  <span className="text-stone-400 dark:text-stone-500">
                    with {event.special_guest}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">
                  {event.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-stone-400">
                  {event.signup_count} {event.signup_count === 1 ? "attendee" : "attendees"}
                </span>
                {event.signed_up_by_me && (
                  <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                    Attending
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Past
          </h2>
          {past.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 opacity-75 shadow-sm transition hover:border-stone-300 hover:opacity-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold dark:text-stone-100">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {formatEventDate(event.starts_at, event.ends_at)}
                  </p>
                </div>
                {event.recurring_frequency && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300">
                    {FREQUENCY_LABELS[event.recurring_frequency] ?? event.recurring_frequency}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-4 text-sm text-stone-400 dark:text-stone-500">
                {event.creator && (
                  <span>{event.creator.display_name ?? event.creator.username}</span>
                )}
                {event.special_guest && (
                  <span>with {event.special_guest}</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-stone-400">
                  {event.signup_count} {event.signup_count === 1 ? "attendee" : "attendees"}
                </span>
                {event.signed_up_by_me && (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300">
                    Attended
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
