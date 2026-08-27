import { describe, it, expect } from "vitest";
import {
  sanitizeHexColor,
  escapeHtml,
  sanitizeSearchTerm,
  sanitizeUrl,
  safeDbError,
} from "./sanitize";

// ---------------------------------------------------------------------------
// sanitizeHexColor
// ---------------------------------------------------------------------------
describe("sanitizeHexColor", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(sanitizeHexColor("#059669")).toBe("#059669");
    expect(sanitizeHexColor("#FFFFFF")).toBe("#FFFFFF");
    expect(sanitizeHexColor("#abc123")).toBe("#abc123");
  });

  it("trims whitespace before validation", () => {
    expect(sanitizeHexColor("  #ff0000  ")).toBe("#ff0000");
  });

  it("returns fallback for null/undefined/empty", () => {
    expect(sanitizeHexColor(null)).toBe("#059669");
    expect(sanitizeHexColor(undefined)).toBe("#059669");
    expect(sanitizeHexColor("")).toBe("#059669");
  });

  it("rejects XSS payloads", () => {
    expect(sanitizeHexColor("</style><script>alert(1)</script>")).toBe("#059669");
    expect(sanitizeHexColor("#059669; } body{background:red} .x{")).toBe("#059669");
  });

  it("rejects invalid hex formats", () => {
    expect(sanitizeHexColor("red")).toBe("#059669");
    expect(sanitizeHexColor("#fff")).toBe("#059669");
    expect(sanitizeHexColor("#1234567")).toBe("#059669");
    expect(sanitizeHexColor("059669")).toBe("#059669");
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe("escapeHtml", () => {
  it("escapes all special HTML characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('a & b')).toBe("a &amp; b");
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles mixed payloads", () => {
    expect(escapeHtml('<img onerror="alert(1)" src=x>')).toBe(
      "&lt;img onerror=&quot;alert(1)&quot; src=x&gt;",
    );
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
    expect(escapeHtml("no special chars here")).toBe("no special chars here");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// sanitizeSearchTerm
// ---------------------------------------------------------------------------
describe("sanitizeSearchTerm", () => {
  it("removes characters used in Supabase .or() filter syntax", () => {
    expect(sanitizeSearchTerm("%")).toBe("");
    expect(sanitizeSearchTerm("(")).toBe("");
    expect(sanitizeSearchTerm(")")).toBe("");
    expect(sanitizeSearchTerm("[")).toBe("");
    expect(sanitizeSearchTerm("]")).toBe("");
  });

  it("strips filter injection payloads", () => {
    expect(sanitizeSearchTerm("x),id.eq.ADMIN_UUID")).toBe("x,id.eq.ADMIN_UUID");
    expect(sanitizeSearchTerm("term%),other.eq.hack")).toBe("term,other.eq.hack");
  });

  it("preserves normal search text", () => {
    expect(sanitizeSearchTerm("hello world")).toBe("hello world");
    expect(sanitizeSearchTerm("react hooks")).toBe("react hooks");
  });

  it("handles empty string", () => {
    expect(sanitizeSearchTerm("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// sanitizeUrl
// ---------------------------------------------------------------------------
describe("sanitizeUrl", () => {
  it("accepts valid http and https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    expect(sanitizeUrl("http://example.com/path?q=1")).toBe("http://example.com/path?q=1");
  });

  it("returns null for null/undefined/empty", () => {
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
  });

  it("rejects javascript: URIs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("  javascript:void(0)  ")).toBeNull();
  });

  it("rejects data: URIs", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects ftp: and other non-http schemes", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeNull();
    expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects strings that are not valid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
    expect(sanitizeUrl("example.com")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// safeDbError
// ---------------------------------------------------------------------------
describe("safeDbError", () => {
  it("passes through normal error messages", () => {
    expect(safeDbError(new Error("Something went wrong"))).toBe("Something went wrong");
  });

  it("strips relation-does-not-exist errors", () => {
    expect(safeDbError(new Error('relation "public.foo" does not exist'))).toBe(
      "Something went wrong.",
    );
  });

  it("strips column-does-not-exist errors", () => {
    expect(safeDbError(new Error('column "foo.bar" does not exist'))).toBe(
      "Something went wrong.",
    );
  });

  it("strips constraint-violation errors", () => {
    expect(safeDbError(new Error("duplicate key value violates unique constraint"))).toBe(
      "An unexpected conflict occurred.",
    );
  });

  it("handles objects with message property", () => {
    expect(safeDbError({ message: "duplicate key value violates unique constraint" })).toBe(
      "An unexpected conflict occurred.",
    );
  });

  it("handles non-Error inputs", () => {
    expect(safeDbError("raw string")).toBe("Something went wrong.");
    expect(safeDbError(null)).toBe("Something went wrong.");
    expect(safeDbError(42)).toBe("Something went wrong.");
  });
});
