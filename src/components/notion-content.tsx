"use client";

import dynamic from "next/dynamic";
import type { ExtendedRecordMap } from "notion-types";

const NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: false },
);

export function NotionContent({ recordMap }: { recordMap: ExtendedRecordMap }) {
  return (
    <div className="notion-content rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <NotionRenderer
        recordMap={recordMap}
        fullPage={false}
        darkMode={false}
        mapPageUrl={(pageId) => `#notion-${pageId}`}
      />
    </div>
  );
}
