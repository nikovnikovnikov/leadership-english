"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REPORT_TARGET_TYPES } from "@/lib/config";
import { safeDbError } from "@/lib/sanitize";

export type ReportActionState = { error?: string; ok?: boolean };

export async function createReport(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const targetType = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!REPORT_TARGET_TYPES.includes(targetType as never))
    return { error: "Invalid report target." };
  if (!reason) return { error: "Pick a reason." };

  const { error } = await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: user.id,
    reason,
  });
  if (error) return { error: safeDbError(error) };

  return { ok: true };
}
