// ---------------------------------------------------------------------------
// Appearance presets — shared between admin UI and server actions
// ---------------------------------------------------------------------------

export const COLOR_SCHEMES = [
  { id: "forest", label: "Forest", color: "#059669", description: "Nature, growth, calm" },
  { id: "ocean", label: "Ocean", color: "#2563eb", description: "Trust, professionalism" },
  { id: "sunset", label: "Sunset", color: "#d97706", description: "Energy, warmth" },
  { id: "berry", label: "Berry", color: "#7c3aed", description: "Luxury, creativity" },
  { id: "midnight", label: "Midnight", color: "#475569", description: "Elegant, understated" },
] as const;

export type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];

export function getColorForScheme(id: string): string {
  return COLOR_SCHEMES.find((s) => s.id === id)?.color ?? "#059669";
}

// ---------------------------------------------------------------------------
// Font pairing presets
// ---------------------------------------------------------------------------

export const FONT_PAIRINGS = [
  {
    id: "soft",
    label: "Soft & Friendly",
    description: "Rounded, approachable, warm",
    heading: "Nunito",
    body: "Inter",
    googleLink: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&family=Inter:wght@400;500;600&display=swap",
  },
  {
    id: "modern",
    label: "Modern & Clean",
    description: "Technical, minimal, precise",
    heading: "Geist Sans",
    body: "Geist Mono",
    googleLink: "",
  },
  {
    id: "bold",
    label: "Bold & Masculine",
    description: "Strong, geometric, confident",
    heading: "Space Grotesk",
    body: "DM Sans",
    googleLink: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap",
  },
  {
    id: "classic",
    label: "Classic & High-End",
    description: "Serif elegance, editorial",
    heading: "Playfair Display",
    body: "Source Sans 3",
    googleLink: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@400;500;600&display=swap",
  },
  {
    id: "creative",
    label: "Creative & Warm",
    description: "Quirky serif, distinctive",
    heading: "Fraunces",
    body: "Outfit",
    googleLink: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=Outfit:wght@400;500;600&display=swap",
  },
] as const;

export type FontPairingId = (typeof FONT_PAIRINGS)[number]["id"];
