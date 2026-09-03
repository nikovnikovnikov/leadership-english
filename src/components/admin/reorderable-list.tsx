"use client";

import { useState, useTransition, type ReactNode } from "react";

/**
 * Native drag-and-drop reorderable list. Renders children in the given order,
 * each with a drag handle. On drop, calls `onReorder` with the full ordered id
 * list so the caller can commit a contiguous renumber in one action.
 */
export function ReorderableList({
  items,
  onReorder,
  render,
}: {
  items: { id: string }[];
  onReorder: (orderedIds: string[]) => void;
  render: (index: number, id: string) => ReactNode;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startTransition = useTransition()[1];

  const ids = items.map((item) => item.id);

  function commit(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const clone = [...ids];
    const [moved] = clone.splice(dragIndex, 1);
    clone.splice(targetIndex, 0, moved);

    setDragIndex(null);
    setOverIndex(null);
    startTransition(() => onReorder(clone));
  }

  return (
    <div className="space-y-2">
      {ids.map((id, index) => (
        <div
          key={id}
          draggable={false}
          onDragStart={(e) => {
            setDragIndex(index);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
          }}
          onDragEnter={() => setOverIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setOverIndex(index);
            commit(index);
          }}
          onDragEnd={(e) => {
            setDragIndex(null);
            setOverIndex(null);
            e.currentTarget.draggable = false;
          }}
          className={`group flex items-stretch rounded-xl border bg-white shadow-sm transition ${
            dragIndex === index
              ? "border-[var(--primary)] opacity-40"
              : overIndex === index && dragIndex !== null
                ? "border-stone-300 dark:border-stone-700"
                : "border-stone-200 dark:border-stone-800 dark:bg-stone-900"
          }`}
        >
          <button
            type="button"
            aria-label="Drag to reorder"
            title="Drag to reorder"
            data-drag-handle
            className="flex cursor-grab touch-none items-center px-2 text-stone-300 transition hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 active:cursor-grabbing"
            onMouseDown={(e) => {
              const row = e.currentTarget.closest<HTMLElement>("[draggable]");
              if (row) row.draggable = true;
            }}
            onMouseUp={(e) => {
              const row = e.currentTarget.closest<HTMLElement>("[draggable]");
              if (row) row.draggable = false;
            }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="7" cy="5" r="1.25" />
              <circle cx="13" cy="5" r="1.25" />
              <circle cx="7" cy="10" r="1.25" />
              <circle cx="13" cy="10" r="1.25" />
              <circle cx="7" cy="15" r="1.25" />
              <circle cx="13" cy="15" r="1.25" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">{render(index, id)}</div>
        </div>
      ))}
    </div>
  );
}