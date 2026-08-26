import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTotalPointsBatch } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { AdminActionButton } from "@/components/admin/action-button";
import { toggleAdmin, toggleModerator } from "@/actions/admin";
import { TagAssigner, TagFilter } from "@/components/admin/tag-assigner";

export const metadata = { title: "Members" };

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  await requireAdmin();
  const { tag: activeTagId } = await searchParams;
  const supabase = await createClient();

  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  const membersQuery = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_admin, role, created_at")
    .order("created_at", { ascending: false });

  type MemberRow = { id: string; username: string; display_name: string | null; avatar_url: string | null; is_admin: boolean; role: string; created_at: string };
  let members: MemberRow[] = [];

  if (activeTagId) {
    const { data: profileTags } = await supabase
      .from("profile_tags")
      .select("profile_id")
      .eq("tag_id", activeTagId);

    const profileIds = (profileTags ?? []).map((pt) => pt.profile_id);
    if (profileIds.length > 0) {
      const { data } = await membersQuery.in("id", profileIds);
      members = (data ?? []) as MemberRow[];
    }
  } else {
    const { data } = await membersQuery;
    members = (data ?? []) as MemberRow[];
  }

  const pointsMap = await getTotalPointsBatch(members.map((m) => m.id));
  const withPoints = members.map((m) => ({
    ...m,
    points: pointsMap.get(m.id) ?? 0,
  }));

  const { data: allProfileTags } = await supabase
    .from("profile_tags")
    .select("profile_id, tag_id");

  const tagsByProfile: Record<string, string[]> = {};
  for (const pt of allProfileTags ?? []) {
    if (!tagsByProfile[pt.profile_id]) tagsByProfile[pt.profile_id] = [];
    tagsByProfile[pt.profile_id].push(pt.tag_id);
  }

  return (
    <div>
      <p className="text-sm text-stone-500">
        {withPoints.length} member{withPoints.length !== 1 && "s"}
        {activeTagId ? " with this tag" : " in the community"}.
      </p>

      {(allTags?.length ?? 0) > 0 && (
        <div className="mt-4">
          <TagFilter allTags={allTags ?? []} activeTagId={activeTagId ?? ""} />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {withPoints.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <UserAvatar profile={m} size={32} />
              <Link
                href={`/member/${m.username}`}
                className="min-w-0 flex-1"
              >
                <p className="flex items-center gap-2 truncate text-sm font-semibold hover:text-[var(--primary)]">
                  {m.display_name ?? m.username}
                  {m.role === "admin" && (
                    <span className="rounded-full bg-[var(--primary-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                      ADMIN
                    </span>
                  )}
                  {m.role === "moderator" && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      MOD
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-400">
                  @{m.username} · joined {formatRelative(m.created_at)} ·{" "}
                  {m.points} pts
                </p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {m.is_admin ? (
                  <AdminActionButton
                    action={toggleAdmin.bind(null, m.id, false)}
                    label="Remove admin"
                    className="border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  />
                ) : (
                  <AdminActionButton
                    action={toggleAdmin.bind(null, m.id, true)}
                    label="Make admin"
                    className="border border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary-light)]"
                  />
                )}
                {!m.is_admin && (
                  m.role === "moderator" ? (
                    <AdminActionButton
                      action={toggleModerator.bind(null, m.id, false)}
                      label="Remove mod"
                      className="border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                    />
                  ) : (
                    <AdminActionButton
                      action={toggleModerator.bind(null, m.id, true)}
                      label="Make mod"
                      className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                    />
                  )
                )}
              </div>
            </div>
            {(allTags?.length ?? 0) > 0 && (
              <TagAssigner
                profileId={m.id}
                allTags={allTags ?? []}
                assignedTagIds={tagsByProfile[m.id] ?? []}
              />
            )}
          </div>
        ))}
      </div>

      <Link
        href="/admin"
        className="mt-6 block text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← Back to overview
      </Link>
    </div>
  );
}
