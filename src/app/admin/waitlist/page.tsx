import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WaitlistManager } from "@/components/admin/waitlist-manager";

export const metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("waitlist")
    .select("id, email, position, status, note, created_at, admitted_at")
    .order("position", { ascending: true });

  const rows = entries ?? [];
  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    admitted: rows.filter((r) => r.status === "admitted").length,
    declined: rows.filter((r) => r.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Waitlist</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Manage the waitlist queue. Admit people to send them an email with a signup link.
        </p>
      </div>

      <WaitlistManager entries={rows} stats={stats} />

      <Link
        href="/admin"
        className="block text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← Back to overview
      </Link>
    </div>
  );
}
