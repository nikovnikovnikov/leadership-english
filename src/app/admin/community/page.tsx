import { getSettings } from "@/lib/queries";
import { CommunityInfoForm } from "@/components/admin/community-info-form";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export const metadata = { title: "Community Info — Admin" };

export default async function AdminCommunityPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-2">Announcement</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Show a &ldquo;What&apos;s New&rdquo; banner at the top of the feed.
          Use it for updates, launches, or important community info.
        </p>
        <div className="mt-4">
          <AnnouncementForm values={settings} />
        </div>
      </section>

      <section className="border-t border-stone-200 dark:border-stone-800 pt-8">
        <h2 className="text-lg font-semibold mb-2">Community Info</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Edit the &ldquo;Start Here&rdquo;, &ldquo;About&rdquo;, and
          &ldquo;Rules&rdquo; sections. Content supports **markdown**.
        </p>
        <div className="mt-4">
          <CommunityInfoForm values={settings} />
        </div>
      </section>
    </div>
  );
}
