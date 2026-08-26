import { NotionAPI } from "notion-client";
import type { ExtendedRecordMap } from "notion-types";

const notionClient = new NotionAPI();

export async function getNotionRecordMap(
  pageId: string,
): Promise<ExtendedRecordMap | null> {
  try {
    return await notionClient.getPage(pageId);
  } catch (err) {
    console.error("Failed to fetch Notion page:", pageId, err);
    return null;
  }
}
