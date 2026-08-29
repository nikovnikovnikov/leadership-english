import { NextResponse } from "next/server";
import { SITE_LOGO_INITIAL } from "@/lib/config";
import { getSettings } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const px = size === "512" ? 512 : 192;
  const fontSize = Math.round(px * 0.5);
  const rx = Math.round(px * 0.167);

  const settings = await getSettings();
  const initial = SITE_LOGO_INITIAL.slice(0, 1);
  const color = settings.primary_color || "#059669";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
  <rect width="${px}" height="${px}" rx="${rx}" fill="${color}"/>
  <text x="${px / 2}" y="${px * 0.625}" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
