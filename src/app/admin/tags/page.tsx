import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TagsManager } from "@/components/admin/tags-manager";
import { AutoTagConfig } from "@/components/admin/auto-tag-config";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Tags — Admin" };

export default async function AdminTagsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const settings = await getSettings();

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, visibility, created_at")
    .order("name");

  const tagIds = (tags ?? []).map((t) => t.id);
  const counts: Record<string, number> = {};

  if (tagIds.length > 0) {
    const { data: pts } = await supabase
      .from("profile_tags")
      .select("tag_id")
      .in("tag_id", tagIds);
    for (const pt of pts ?? []) {
      counts[pt.tag_id] = (counts[pt.tag_id] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Create tags to segment your community. Assign tags to members, then mass
        DM or email everyone with a given tag. Public tags are visible on member
        profiles.
      </p>
      <TagsManager tags={tags ?? []} counts={counts} />

      <div className="border-t border-stone-200 dark:border-stone-800 pt-6">
        <h2 className="text-lg font-semibold dark:text-stone-100">Auto-assign tags</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Automatically assign tags to new members based on their signup order.
          Set a name (e.g. &ldquo;Founder&rdquo;), threshold, and pick which tag to assign.
        </p>
        <AutoTagConfig settings={settings} allTags={tags ?? []} />
      </div>
    </div>
  );
}
