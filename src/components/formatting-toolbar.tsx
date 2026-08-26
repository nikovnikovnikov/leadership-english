"use client";

import { useEffect } from "react";

function wrap(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);

  let insertion: string;
  let newCursorStart: number;
  let newCursorEnd: number;

  if (selected) {
    insertion = before + selected + after;
    newCursorStart = start + before.length;
    newCursorEnd = start + before.length + selected.length;
  } else {
    insertion = before + "text" + after;
    newCursorStart = start + before.length;
    newCursorEnd = start + before.length + 4;
  }

  const newValue = value.slice(0, start) + insertion + value.slice(end);

  textarea.value = newValue;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorStart, newCursorEnd);
  }, 0);
}

function insertAtLineStart(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const value = textarea.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const currentLinePrefix = value.slice(lineStart, start);

  let newValue: string;
  let newCursor: number;

  if (currentLinePrefix === prefix) {
    newValue = value.slice(0, lineStart) + value.slice(start);
    newCursor = lineStart;
  } else {
    newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    newCursor = lineStart + prefix.length;
  }

  textarea.value = newValue;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursor, newCursor);
  }, 0);
}

function ToolbarButton({
  label,
  title,
  textareaRef,
  action,
}: {
  label: React.ReactNode;
  title: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  action: (ta: HTMLTextAreaElement) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        const ta = textareaRef.current;
        if (ta) action(ta);
      }}
      className="rounded px-1.5 py-0.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
    >
      {label}
    </button>
  );
}

export function FormattingToolbar({
  textareaRef,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!ta) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        wrap(ta, "**", "**");
      } else if (key === "i") {
        e.preventDefault();
        wrap(ta, "*", "*");
      } else if (key === "u") {
        e.preventDefault();
        wrap(ta, "<u>", "</u>");
      }
    }

    ta.addEventListener("keydown", handleKeyDown);
    return () => ta.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef]);

  return (
    <div className="flex items-center gap-0.5 border-b border-stone-200 dark:border-stone-800 px-2 py-1">
      <ToolbarButton
        label="B"
        title="Bold (Ctrl+B)"
        textareaRef={textareaRef}
        action={(ta) => wrap(ta, "**", "**")}
      />
      <ToolbarButton
        label={<i>I</i>}
        title="Italic (Ctrl+I)"
        textareaRef={textareaRef}
        action={(ta) => wrap(ta, "*", "*")}
      />
      <ToolbarButton
        label="U"
        title="Underline (Ctrl+U)"
        textareaRef={textareaRef}
        action={(ta) => wrap(ta, "<u>", "</u>")}
      />
      <span className="mx-0.5 h-3 w-px bg-stone-200 dark:bg-stone-800" />
      <ToolbarButton
        label="H1"
        title="Heading 1"
        textareaRef={textareaRef}
        action={(ta) => insertAtLineStart(ta, "# ")}
      />
      <ToolbarButton
        label="H2"
        title="Heading 2"
        textareaRef={textareaRef}
        action={(ta) => insertAtLineStart(ta, "## ")}
      />
    </div>
  );
}
