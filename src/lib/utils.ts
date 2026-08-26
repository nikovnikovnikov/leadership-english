export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** ISO string for N days ago. */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export function initials(name: string | null | undefined): string {
  return (name ?? "?").trim().slice(0, 2).toUpperCase();
}

/** Convert a YouTube/Vimeo link into an embeddable URL. */
export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const yt =
    trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    ) ??
    trimmed.match(/(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const ig = trimmed.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
  if (ig) return `https://www.instagram.com/reel/${ig[1]}/embed/`;
  return trimmed;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong.";
}

const EDIT_WINDOW_MS = 5 * 60 * 1000;

/** Server-side: check if content was created within the edit window */
export function canEdit(createdAt: string, authorId: string, currentUserId: string, isAdmin = false): boolean {
  if (authorId !== currentUserId) return false;
  if (isAdmin) return true;
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

/** Server-side: compute which comment IDs are editable */
export function getEditableCommentIds(
  comments: { id: string; author_id: string; created_at: string }[],
  currentUserId: string,
  isAdmin = false,
): string[] {
  return comments
    .filter((c) => canEdit(c.created_at, c.author_id, currentUserId, isAdmin))
    .map((c) => c.id);
}

/** Server-side: compute which reply IDs are editable */
export function getEditableReplyIds(
  replies: { id: string; author_id: string; created_at: string }[],
  currentUserId: string,
  isAdmin = false,
): string[] {
  return replies
    .filter((r) => canEdit(r.created_at, r.author_id, currentUserId, isAdmin))
    .map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Nested reply tree
// ---------------------------------------------------------------------------

export type ReplyTreeNode<T extends { id: string; parent_reply_id: string | null }> = T & {
  children: ReplyTreeNode<T>[];
};

export function buildReplyTree<T extends { id: string; parent_reply_id: string | null }>(
  replies: T[],
): ReplyTreeNode<T>[] {
  const map = new Map<string, ReplyTreeNode<T>>();
  const roots: ReplyTreeNode<T>[] = [];

  for (const r of replies) {
    map.set(r.id, { ...r, children: [] });
  }

  for (const r of replies) {
    const node = map.get(r.id)!;
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      const parent = map.get(r.parent_reply_id)!;
      if (depthOf(parent, map) < 2) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function depthOf<T extends { id: string; parent_reply_id: string | null }>(
  node: ReplyTreeNode<T>,
  map: Map<string, ReplyTreeNode<T>>,
): number {
  let depth = 0;
  let current: ReplyTreeNode<T> | undefined = node;
  while (current?.parent_reply_id) {
    depth++;
    current = map.get(current.parent_reply_id);
    if (depth > 10) break;
  }
  return depth;
}
