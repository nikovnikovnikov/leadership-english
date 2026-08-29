import { NextResponse } from "next/server";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";

export async function GET() {
  const settings = await getSettings();
  const name = SITE_NAME;
  const tagline = settings.site_tagline || "A private community for learning and conversation.";
  const color = settings.primary_color || "#059669";

  const manifest = {
    name,
    short_name: name,
    description: tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: color,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/api/icon/192",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/api/icon/512",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
