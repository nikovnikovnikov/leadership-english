"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormattingToolbar } from "@/components/formatting-toolbar";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-stone-400 dark:text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-300"
    >
      Edit
    </button>
  );
}

export function EditForm({
  initialBody,
  onSave,
  onCancel,
  maxLength = 5000,
  label = "Edit",
}: {
  initialBody: string;
  onSave: (body: string) => Promise<{ error?: string }>;
  onCancel: () => void;
  maxLength?: number;
  label?: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Cannot be empty.");
      return;
    }
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <FormattingToolbar textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError(null);
        }}
        maxLength={maxLength}
        rows={4}
        className="w-full rounded-b-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        autoFocus
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
        >
          Cancel
        </button>
        <span className="ml-auto text-xs text-stone-400 dark:text-stone-400">
          {body.length}/{maxLength}
        </span>
      </div>
    </form>
  );
}
