/** Validate and sanitize a hex color string (e.g. #059669). */
export function sanitizeHexColor(input: string | null | undefined): string {
  const fallback = "#059669";
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return fallback;
}

/** Escape HTML special characters to prevent XSS when interpolating into HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a search term for safe use in Supabase `.or()` filter strings. */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[%()[\]\\]/g, () => {
    return "";
  });
}

/** Validate a URL — only allows http/https schemes, rejects javascript: etc. */
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // Not a valid URL — reject it
  }
  return null;
}

/** Return a safe user-facing error message, stripping database internals. */
export function safeDbError(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Something went wrong.";
  if (/relation .* does not exist/i.test(msg)) return "Something went wrong.";
  if (/column .* does not exist/i.test(msg)) return "Something went wrong.";
  if (/violates.*constraint/i.test(msg)) return "An unexpected conflict occurred.";
  return msg;
}
