import { requireAdmin } from "@/lib/auth";
import { getCategories, getAllTags } from "@/lib/queries";
import { BoardsList } from "@/components/admin/boards-list";

export const metadata = { title: "Boards — Admin" };

export default async function AdminBoardsPage() {
  await requireAdmin();
  const [categories, tags] = await Promise.all([getCategories(), getAllTags()]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Manage the discussion boards. Reorder with the arrows, edit inline, or delete empty boards.
        Use &ldquo;Access restriction&rdquo; to gate a board behind a user tag.
      </p>
      <BoardsList categories={categories} tags={tags} />
    </div>
  );
}
