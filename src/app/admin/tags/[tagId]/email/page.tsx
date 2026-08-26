import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmailTagForm } from "@/components/admin/email-tag-form";

export const metadata = { title: "Email Tag — Admin" };

export default async function EmailTagPage({
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

  if (!tag) redirect("/admin/tags");

  const { count } = await supabase
    .from("profile_tags")
    .select("id", { count: "exact", head: true })
    .eq("tag_id", tagId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/admin/tags/${tagId}`} className="text-xs font-medium text-stone-400 hover:text-stone-600">
          &larr; Back to tag
        </Link>
      </div>
      <h2 className="text-lg font-semibold">
        Email &ldquo;{tag.name}&rdquo;
      </h2>
      <EmailTagForm
        tagId={tagId}
        tagName={tag.name}
        memberCount={count ?? 0}
      />
    </div>
  );
}
