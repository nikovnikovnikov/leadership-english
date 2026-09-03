import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Assessments — Admin" };

const ASSESSMENTS = [
  { type: "placement", label: "Placement Assessment" },
  { type: "idioms", label: "Idioms Assessment" },
] as const;

export default async function AdminAssessmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("user_assessments")
    .select(
      "id, assessment_type, score_raw, score_scaled, band, taken_at, profile:profiles!user_assessments_user_id_fkey(id, username, display_name, avatar_url)",
    )
    .order("taken_at", { ascending: false })
    .limit(500);

  const rows = (attempts ?? [])
    .map((a) => ({
      id: a.id as string,
      type: a.assessment_type as string,
      scoreRaw: a.score_raw as number,
      scoreScaled: a.score_scaled as number,
      band: a.band as string | null,
      takenAt: a.taken_at as string,
      profile: (a as unknown as { profile: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null }).profile,
    }))
    .filter((a) => a.profile !== null);

  const summary = ASSESSMENTS.map(({ type, label }) => {
    const ofType = rows.filter((r) => r.type === type);
    return {
      type,
      label,
      attempts: ofType.length,
      takers: new Set(ofType.flatMap((r) => [r.profile!.id])).size,
    };
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        See who has taken each assessment. Preview any test below to review its
        questions and answers as a quality-control check.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {summary.map((s) => (
          <div
            key={s.type}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold dark:text-stone-100">{s.label}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {s.attempts} attempt{s.attempts !== 1 && "s"} · {s.takers} taker
                  {s.takers !== 1 && "s"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Link
                  href={`/admin/assessments/preview/${s.type}`}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Preview
                </Link>
                <Link
                  href={s.type === "placement" ? "/assessment?take=1" : "/idioms?take=1"}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-90"
                >
                  Take a test run
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-semibold dark:text-stone-100">Recent attempts</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No assessments have been taken yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar profile={r.profile} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/member/${r.profile!.username}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {r.profile!.display_name ?? r.profile!.username}
                    </Link>
                    <span className="ml-1.5 text-xs text-stone-400">@{r.profile!.username}</span>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300">
                    {r.type === "placement" ? "Placement" : "Idioms"}
                  </span>
                  <span className="text-sm font-semibold dark:text-stone-100">
                    {r.type === "placement"
                      ? `${r.band ?? "—"} · ${r.scoreScaled}/100`
                      : `${r.scoreRaw} idioms · ${r.scoreScaled}%`}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(r.takenAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}