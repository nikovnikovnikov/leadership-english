import { requireUser } from "@/lib/auth";
import { getInviteSettings, getMyInvites } from "@/actions/invites";
import { InviteManager } from "@/components/invite-manager";
import { redirect } from "next/navigation";

export const metadata = { title: "Invites" };

export default async function InvitesPage() {
  await requireUser();
  const settings = await getInviteSettings();

  if (settings.invites_enabled !== "true") {
    redirect("/feed");
  }

  const invites = await getMyInvites();
  const maxInvites = Number(settings.invites_per_member) || 3;
  const usedCount = invites.filter((i) => i.used_by).length;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invite people</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Share invite codes to bring new members into the community.
        </p>
      </div>

      <InviteManager
        invites={invites.map((i) => ({
          id: i.id,
          code: i.code,
          usedBy: (i.usedBy as { display_name?: string; username?: string } | null) ?? null,
          usedAt: i.used_at,
          createdAt: i.created_at,
        }))}
        maxInvites={maxInvites}
        usedCount={usedCount}
      />
    </div>
  );
}
