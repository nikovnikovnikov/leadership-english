"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEvent, updateEvent, type EventState } from "@/actions/events";

type EventData = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  special_guest: string | null;
  special_guest_url: string | null;
  event_link: string | null;
  required_tag_id: string | null;
  recurring_frequency: string | null;
};

type Tag = { id: string; name: string };

export function EventForm({
  initialData,
  tags = [],
}: {
  initialData: EventData | null;
  tags?: Tag[];
}) {
  const isEdit = !!initialData;

  const boundAction = isEdit
    ? updateEvent.bind(null, initialData.id)
    : createEvent;

  const [state, formAction, pending] = useActionState<EventState, FormData>(
    boundAction,
    {},
  );

  function formatForInput(dateStr: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <h1 className="text-xl font-bold dark:text-stone-100">
        {isEdit ? "Edit Event" : "New Event"}
      </h1>

      <div className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Title
          </label>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={initialData?.title ?? ""}
            placeholder="Event title"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Description
          </label>
          <textarea
            name="description"
            rows={5}
            maxLength={5000}
            defaultValue={initialData?.description ?? ""}
            placeholder="Event details (supports markdown)"
            className="mt-1 w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Location
          </label>
          <input
            name="location"
            maxLength={200}
            defaultValue={initialData?.location ?? ""}
            placeholder="e.g. Room 101 or Online"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>

        {/* Event link (Google Meet) */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Event link <span className="text-stone-400">(Google Meet, Zoom, etc.)</span>
          </label>
          <input
            name="event_link"
            type="url"
            maxLength={500}
            defaultValue={initialData?.event_link ?? ""}
            placeholder="https://meet.google.com/..."
            className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Starts at
            </label>
            <input
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={formatForInput(initialData?.starts_at ?? null)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Ends at <span className="text-stone-400">(optional)</span>
            </label>
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={formatForInput(initialData?.ends_at ?? null)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Special Guest */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Special guest <span className="text-stone-400">(optional)</span>
            </label>
            <input
              name="special_guest"
              maxLength={200}
              defaultValue={initialData?.special_guest ?? ""}
              placeholder="Guest name"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Guest link <span className="text-stone-400">(optional)</span>
            </label>
            <input
              name="special_guest_url"
              type="url"
              maxLength={500}
              defaultValue={initialData?.special_guest_url ?? ""}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Cover image URL <span className="text-stone-400">(optional)</span>
          </label>
          <input
            name="cover_url"
            type="url"
            defaultValue={initialData?.cover_url ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>

        {/* Tag gating */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Require tag to see location &amp; link <span className="text-stone-400">(optional)</span>
            </label>
            <select
              name="required_tag_id"
              defaultValue={initialData?.required_tag_id ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
            >
              <option value="">No restriction</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              If set, only users with this tag can see the event location and link.
            </p>
          </div>
        )}

        {/* Recurring */}
        {!isEdit && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-[#0c0a09]/80">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Recurring event <span className="text-stone-400">(optional)</span>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select
                name="recurring_frequency"
                defaultValue=""
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
              >
                <option value="">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-500 dark:text-stone-400">
                  Create
                </label>
                <input
                  name="recurring_count"
                  type="number"
                  min={2}
                  max={52}
                  defaultValue={4}
                  className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
                />
                <label className="text-sm text-stone-500 dark:text-stone-400">
                  instances
                </label>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
              Creates multiple events at the selected interval.
            </p>
          </div>
        )}
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Link
          href="/events"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Event"}
        </button>
      </div>
    </form>
  );
}
