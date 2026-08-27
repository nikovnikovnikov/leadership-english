import { createClient } from "@/lib/supabase/server";
import { getBlockedIds } from "@/lib/notifications";
import { sanitizeSearchTerm } from "@/lib/sanitize";

export type SearchResult = {
  type: "post" | "thread" | "member" | "course";
  id: string;
  title: string;
  body: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  created_at: string;
  category?: string;
  rank: number;
};

export async function searchAll(
  query: string,
  currentUserId: string,
  limit = 20,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const supabase = await createClient();

  const blockedIds = await getBlockedIds(currentUserId);
  const term = sanitizeSearchTerm(query.trim());

  const [postsResult, threadsResult, membersResult, coursesResult] =
    await Promise.all([
      // Posts — use ilike for search
      supabase
        .from("feed_posts")
        .select("id, body, created_at, author_id")
        .ilike("body", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Threads — use ilike for title + body
      supabase
        .from("threads")
        .select("id, title, body, category, created_at, author_id")
        .or(`title.ilike.%${term}%,body.ilike.%${term}%`)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Members (username + display_name match)
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(limit),

      // Courses (title + description match)
      supabase
        .from("courses")
        .select("id, title, description, created_at")
        .eq("published", true)
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(limit),
    ]);

  const results: SearchResult[] = [];

  // Deduplicate author fetch
  const allAuthorIds = new Set<string>();
  for (const p of postsResult.data ?? []) allAuthorIds.add(p.author_id);
  for (const t of threadsResult.data ?? []) allAuthorIds.add(t.author_id);

  const { data: authors } = allAuthorIds.size
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", [...allAuthorIds])
    : { data: [] };

  const authorMap = new Map(
    (authors ?? []).map((a) => [a.id, a]),
  );

  for (const p of postsResult.data ?? []) {
    if (blockedIds.has(p.author_id)) continue;
    const author = authorMap.get(p.author_id);
    results.push({
      type: "post",
      id: p.id,
      title: "",
      body: p.body,
      username: author?.username,
      display_name: author?.display_name,
      avatar_url: author?.avatar_url,
      created_at: p.created_at,
      rank: 0,
    });
  }

  for (const t of threadsResult.data ?? []) {
    if (blockedIds.has(t.author_id)) continue;
    const author = authorMap.get(t.author_id);
    results.push({
      type: "thread",
      id: t.id,
      title: t.title,
      body: t.body,
      username: author?.username,
      display_name: author?.display_name,
      avatar_url: author?.avatar_url,
      created_at: t.created_at,
      category: t.category,
      rank: 0,
    });
  }

  for (const m of membersResult.data ?? []) {
    if (m.id === currentUserId || blockedIds.has(m.id)) continue;
    results.push({
      type: "member",
      id: m.id,
      title: m.display_name ?? m.username,
      body: `@${m.username}`,
      username: m.username,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      created_at: m.created_at,
      rank: 0,
    });
  }

  for (const c of coursesResult.data ?? []) {
    results.push({
      type: "course",
      id: c.id,
      title: c.title,
      body: c.description ?? "",
      created_at: c.created_at,
      rank: 0,
    });
  }

  // Sort by recency
  results.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return results.slice(0, limit);
}
