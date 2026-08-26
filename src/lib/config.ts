export const SITE_NAME = "Sanctum";

export const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "philosophy", label: "Philosophy" },
  { id: "body", label: "Body" },
  { id: "spirit", label: "Spirit" },
  { id: "world-news", label: "World News" },
  { id: "vent", label: "Vent" },
  { id: "questions", label: "Questions" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const POINT_KINDS = {
  feed_post: "feed_post",
  feed_comment: "feed_comment",
  thread: "thread",
  thread_reply: "thread_reply",
  like_received: "like_received",
} as const;

export type PointKind = (typeof POINT_KINDS)[keyof typeof POINT_KINDS];

export const REPORT_TARGET_TYPES = [
  "feed_post",
  "feed_comment",
  "thread",
  "thread_reply",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
