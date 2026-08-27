"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { safeDbError } from "@/lib/sanitize";

export type CategoryActionState = { error?: string; ok?: boolean };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requiredTagId = String(formData.get("required_tag_id") ?? "").trim() || null;

  if (!label) return { error: "Label is required." };
  if (label.length > 60) return { error: "Label must be 60 characters or fewer." };

  const id = slugify(label);
  if (!id) return { error: "Could not generate a valid ID from that label." };

  const supabase = await createClient();

  // Get next sort order
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = existing?.length ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("categories").insert({
    id,
    label,
    description,
    sort_order: nextOrder,
    required_tag_id: requiredTagId,
  });

  if (error) {
    if (error.code === "23505") return { error: "A board with that name already exists." };
    return { error: safeDbError(error) };
  }

  revalidatePath("/admin/boards");
  revalidatePath("/board");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requiredTagId = String(formData.get("required_tag_id") ?? "").trim() || null;

  if (!label) return { error: "Label is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ label, description, required_tag_id: requiredTagId })
    .eq("id", id);

  if (error) return { error: safeDbError(error) };

  revalidatePath("/admin/boards");
  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  // Check if any threads use this category
  const { count } = await supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("category", id);

  if (count && count > 0) {
    throw new Error(
      `Cannot delete this board — ${count} thread${count === 1 ? "" : "s"} still use it. Move or delete them first.`,
    );
  }

  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/admin/boards");
  revalidatePath("/board");
}

export async function reorderCategories(
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("categories")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath("/admin/boards");
  revalidatePath("/board");
}
