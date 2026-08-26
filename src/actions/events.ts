"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EventState = { error?: string };

function generateRecurringDates(
  startDate: Date,
  frequency: string,
  count: number,
): Date[] {
  const dates: Date[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(d));
    switch (frequency) {
      case "daily":
        d.setDate(d.getDate() + 1);
        break;
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "biweekly":
        d.setDate(d.getDate() + 14);
        break;
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
    }
  }
  return dates;
}

export async function createEvent(
  _prev: EventState,
  formData: FormData,
): Promise<EventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator"))
    return { error: "Only admins and moderators can create events." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "") || null;
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  const specialGuest = String(formData.get("special_guest") ?? "").trim() || null;
  const specialGuestUrl = String(formData.get("special_guest_url") ?? "").trim() || null;
  const eventLink = String(formData.get("event_link") ?? "").trim() || null;
  const requiredTagId = String(formData.get("required_tag_id") ?? "").trim() || null;
  const recurringFrequency = String(formData.get("recurring_frequency") ?? "").trim() || null;
  const recurringCount = parseInt(String(formData.get("recurring_count") ?? "4"), 10) || 4;

  if (!title) return { error: "Title is required." };
  if (!startsAt) return { error: "Start date/time is required." };

  const startDate = new Date(startsAt);

  // Single event
  if (!recurringFrequency) {
    const { data, error } = await supabase
      .from("events")
      .insert({
        created_by: user.id,
        title,
        description,
        location,
        starts_at: startsAt,
        ends_at: endsAt,
        cover_url: coverUrl,
        special_guest: specialGuest,
        special_guest_url: specialGuestUrl,
        event_link: eventLink,
        required_tag_id: requiredTagId,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/events");
    redirect(`/events/${data.id}`);
  }

  // Recurring events — create all instances
  const dates = generateRecurringDates(startDate, recurringFrequency, recurringCount);
  const duration = endsAt
    ? new Date(endsAt).getTime() - startDate.getTime()
    : 0;

  const eventsToInsert = dates.map((date, i) => ({
    created_by: user.id,
    title: i === 0 ? title : `${title} (${i + 1})`,
    description,
    location,
    starts_at: date.toISOString(),
    ends_at: duration > 0 ? new Date(date.getTime() + duration).toISOString() : null,
    cover_url: coverUrl,
    special_guest: specialGuest,
    special_guest_url: specialGuestUrl,
    event_link: eventLink,
    required_tag_id: requiredTagId,
    recurring_frequency: recurringFrequency,
  }));

  // Insert all events — first one becomes the group parent
  const { data: inserted, error } = await supabase
    .from("events")
    .insert(eventsToInsert)
    .select("id");

  if (error) return { error: error.message };
  if (!inserted?.length) return { error: "Failed to create events." };

  // Set recurring_group_id to the first event's id
  const groupId = inserted[0].id;
  await supabase
    .from("events")
    .update({ recurring_group_id: groupId })
    .in(
      "id",
      inserted.map((e) => e.id),
    );

  revalidatePath("/events");
  redirect(`/events/${groupId}`);
}

export async function updateEvent(
  id: string,
  _prev: EventState,
  formData: FormData,
): Promise<EventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator"))
    return { error: "Only admins and moderators can edit events." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "") || null;
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  const specialGuest = String(formData.get("special_guest") ?? "").trim() || null;
  const specialGuestUrl = String(formData.get("special_guest_url") ?? "").trim() || null;
  const eventLink = String(formData.get("event_link") ?? "").trim() || null;
  const requiredTagId = String(formData.get("required_tag_id") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!startsAt) return { error: "Start date/time is required." };

  // Fetch current event to check group
  const { data: current } = await supabase
    .from("events")
    .select("recurring_group_id")
    .eq("id", id)
    .single();

  const updatePayload = {
    title,
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt,
    cover_url: coverUrl,
    special_guest: specialGuest,
    special_guest_url: specialGuestUrl,
    event_link: eventLink,
    required_tag_id: requiredTagId,
  };

  // Update all events in the group if this is part of a recurring group
  if (current?.recurring_group_id) {
    await supabase
      .from("events")
      .update(updatePayload)
      .eq("recurring_group_id", current.recurring_group_id)
      .gte("starts_at", startsAt);
  }

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator"))
    return { error: "Only admins and moderators can delete events." };

  // Check if this is part of a recurring group
  const { data: current } = await supabase
    .from("events")
    .select("recurring_group_id")
    .eq("id", id)
    .single();

  if (current?.recurring_group_id) {
    // Delete all future events in the group
    const { data: event } = await supabase
      .from("events")
      .select("starts_at")
      .eq("id", id)
      .single();

    if (event) {
      await supabase
        .from("events")
        .delete()
        .eq("recurring_group_id", current.recurring_group_id)
        .gte("starts_at", event.starts_at);
    }
  }

  await supabase.from("events").delete().eq("id", id);

  revalidatePath("/events");
  redirect("/events");
}

export async function toggleEventSignup(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if already signed up
  const { data: existing } = await supabase
    .from("event_signups")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Cancel signup
    const { error } = await supabase
      .from("event_signups")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    // Sign up
    const { error } = await supabase.from("event_signups").insert({
      event_id: eventId,
      user_id: user.id,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function postEventUpdate(
  eventId: string,
  _prev: EventState,
  formData: FormData,
): Promise<EventState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator"))
    return { error: "Only admins and moderators can post updates." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Update cannot be empty." };

  const { error } = await supabase.from("event_updates").insert({
    event_id: eventId,
    created_by: user.id,
    body,
  });
  if (error) return { error: error.message };

  // Notify signups (non-blocking)
  try {
    const { data: signups } = await supabase
      .from("event_signups")
      .select("user_id")
      .eq("event_id", eventId);

    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    if (signups?.length && event) {
      await Promise.allSettled(
        signups
          .filter((s) => s.user_id !== user.id)
          .map((s) =>
            supabase.from("notifications").insert({
              user_id: s.user_id,
              actor_id: user.id,
              type: "event",
              target_type: "event",
              target_id: eventId,
              message: `Update on "${event.title}": ${body.slice(0, 120)}`,
            }),
          ),
      );
    }
  } catch { /* best effort */ }

  revalidatePath(`/events/${eventId}`);
  return {};
}
