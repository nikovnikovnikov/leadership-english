import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { setReportStatus } from "@/actions/admin";
import { AdminActionButton } from "@/components/admin/action-button";

export const metadata = { title: "Reports" };

type PreviewRow = {
  body?: string;
  title?: string;
  author?: { username: string } | null;
};

type Preview = {
  kind: string;
  text: string;
  author: string | null;
};

async function fetchPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: string,
  targetId: string,
): Promise<Preview | null> {
  if (targetType === "feed_post") {
    const { data } = await supabase
      .from("feed_posts")
      .select("body, author:author_id(username)")
      .eq("id", targetId)
      .single();
    if (!data) return null;
    const row = data as unknown as PreviewRow;
    return {
      kind: "Feed post",
      text: row.body ?? "",
      author: row.author?.username ?? null,
    };
  }
  if (targetType === "feed_comment") {
    const { data } = await supabase
      .from("feed_comments")
      .select("body, author:author_id(username)")
      .eq("id", targetId)
      .single();
    if (!data) return null;
    const row = data as unknown as PreviewRow;
    return {
      kind: "Comment",
      text: row.body ?? "",
      author: row.author?.username ?? null,
    };
  }
  if (targetType === "thread") {
    const { data } = await supabase
      .from("threads")
      .select("title, author:author_id(username)")
      .eq("id", targetId)
      .single();
    if (!data) return null;
    const row = data as unknown as PreviewRow;
    return {
      kind: "Thread",
      text: row.title ?? "",
      author: row.author?.username ?? null,
    };
  }
  if (targetType === "thread_reply") {
    const { data } = await supabase
      .from("thread_replies")
      .select("body, author:author_id(username)")
      .eq("id", targetId)
      .single();
    if (!data) return null;
    const row = data as unknown as PreviewRow;
    return {
      kind: "Thread reply",
      text: row.body ?? "",
      author: row.author?.username ?? null,
    };
  }
  return null;
}

export default async function ReportsPage() {
  await requireModerator();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reporter_id, reason, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = await Promise.all(
    (reports ?? []).map(async (report) => ({
      ...report,
      preview: await fetchPreview(supabase, report.target_type, report.target_id),
    })),
  );

  return (
    <div>
      <p className="text-sm text-stone-500">
        Content members have flagged for review.
      </p>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-sm text-stone-500">All clear — no open reports.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-stone-400">
                  {report.preview?.kind ?? report.target_type} by{" "}
                  <span className="font-medium text-stone-600">
                    @{report.preview?.author ?? "unknown"}
                  </span>{" "}
                  · flagged by @{""} {report.reporter_id.slice(0, 8)} ·{" "}
                  {formatRelative(report.created_at)}
                </p>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {report.reason}
                </span>
              </div>
              {report.preview && (
                <p className="mt-2 line-clamp-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
                  {report.preview.text}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <AdminActionButton
                  action={setReportStatus.bind(null, report.id, "resolved")}
                  label="Resolve"
                  className="bg-[var(--primary)] text-white hover:brightness-90"
                />
                <AdminActionButton
                  action={setReportStatus.bind(null, report.id, "dismissed")}
                  label="Dismiss"
                  className="border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/admin"
        className="mt-6 block text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← Back to overview
      </Link>
    </div>
  );
}
