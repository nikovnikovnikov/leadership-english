import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Tag Members — Admin" };

export default async function TagMembersPage({
  params,
}: {
  params: Promise<{ tagId: string }>;
}) {
  await requireAdmin();
  const { tagId } = await params;
  const supabase = await createClient();

  const { data: tag } = await supabase
    .from("tags")
    .select("id, name")
    .eq("id", tagId)
    .single();

  if (!tag) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Tag not found.</p>
        <Link href="/admin/tags" className="text-sm text-[var(--primary)] hover:underline">
          Back to tags
        </Link>
      </div>
    );
  }

  const { data: profileTags } = await supabase
    .from("profile_tags")
    .select("profile_id")
    .eq("tag_id", tagId);

  const profileIds = (profileTags ?? []).map((pt) => pt.profile_id);

  let members: { id: string; username: string; display_name: string | null; avatar_url: string | null; role: string }[] = [];
  if (profileIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role")
      .in("id", profileIds)
      .order("display_name", { ascending: true });
    members = data ?? [];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/tags" className="text-xs font-medium text-stone-400 hover:text-stone-600">
            &larr; Tags
          </Link>
          <h2 className="text-lg font-semibold">
            <span className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-2.5 py-0.5 text-sm font-semibold text-[var(--primary)]">
              {tag.name}
            </span>
          </h2>
          <span className="text-sm text-stone-400">{members.length} member{members.length !== 1 && "s"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/tags/${tagId}/message`}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            Message all
          </Link>
          <Link
            href={`/admin/tags/${tagId}/email`}
            className="rounded-lg border border-stone-200 dark:border-stone-800 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
          >
            Email all
          </Link>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No members have this tag yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 shadow-sm"
            >
              <UserAvatar profile={m} size={32} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/member/${m.username}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {m.display_name ?? m.username}
                </Link>
                <span className="ml-1.5 text-xs text-stone-400">
                  @{m.username}
                </span>
              </div>
              {m.role === "admin" && (
                <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                  ADMIN
                </span>
              )}
              {m.role === "moderator" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  MOD
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
