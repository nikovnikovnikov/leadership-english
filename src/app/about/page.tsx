import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { CommunityInfoCard } from "@/components/community-info-card";

export const metadata = { title: "About" };
export const revalidate = 60;

export default async function AboutPage() {
  await requireUser();
  const settings = await getSettings();

  const startHere = settings.community_start_here ?? "";
  const about = settings.community_about ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Learn about this community.
        </p>
      </div>

      {!startHere && !about && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No community information has been added yet.
          </p>
        </div>
      )}

      {startHere && (
        <CommunityInfoCard title="Start here" content={startHere} />
      )}

      {about && (
        <CommunityInfoCard title="About this community" content={about} />
      )}
    </div>
  );
}
