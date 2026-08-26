import { getSettings } from "@/lib/queries";

export const metadata = { title: "Book a Private Lesson" };

export default async function BookPage() {
  const settings = await getSettings();
  const siteName = settings.site_name || "Sanctum";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Book a Private Lesson</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Schedule a 1-on-1 session with an instructor from {siteName}.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <iframe
          src="https://cal.com/dustinl/50-minute-tutoring-session"
          className="h-[700px] w-full border-0"
          allow="autoplay; fullscreen"
          loading="lazy"
          title="Book a Private Lesson"
        />
      </div>
    </div>
  );
}
