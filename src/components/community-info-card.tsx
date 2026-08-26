import { MarkdownContent } from "@/components/markdown-content";

export function CommunityInfoCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  if (!content?.trim()) return null;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</h3>
      <div className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
