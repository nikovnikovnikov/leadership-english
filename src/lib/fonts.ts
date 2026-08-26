import { Geist, Geist_Mono } from "next/font/google";

// ---------------------------------------------------------------------------
// Only Geist (default "modern" pairing) is bundled at build time.
// Other pairings load via Google Fonts CDN at runtime when selected.
// ---------------------------------------------------------------------------

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const ALL_FONT_VARIABLES = [
  geistSans.variable,
  geistMono.variable,
].join(" ");

// Google Fonts CDN links for non-default pairings.
// Loaded at runtime when data-font-pair is set, not bundled into JS.
export const FONT_CDN_LINKS: Record<string, string> = {
  soft: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@600;700&display=swap",
  bold: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap",
  classic: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap",
  creative: "https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Outfit:wght@400;500;600;700&display=swap",
};

// No-op font variables for non-default pairings (CDN handles loading via @font-face).
// These are not needed at runtime since globals.css uses font-family names directly.
