import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";
import { getAllTags } from "@/lib/queries";

export const metadata = { title: "Create Event" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireUser();
  if (profile.role !== "admin" && profile.role !== "moderator") redirect("/events");

  const { edit } = await searchParams;
  const tags = await getAllTags();

  let initialData = null;
  if (edit) {
    const supabase = await createClient();
    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("id", edit)
      .single();
    if (event) initialData = event;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <EventForm initialData={initialData} tags={tags} />
    </div>
  );
}
