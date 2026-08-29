import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavWrapper } from "@/components/nav-wrapper";
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { SWRegistration } from "@/components/sw-registration";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";
import { ALL_FONT_VARIABLES, FONT_CDN_LINKS } from "@/lib/fonts";
import { sanitizeHexColor } from "@/lib/sanitize";

const VALID_FONT_PAIRS = ["soft", "modern", "bold", "classic", "creative"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = SITE_NAME;
  return {
    title: name,
    description: settings.site_tagline || "A small, private community for learning and conversation.",
    manifest: "/api/manifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const primaryColor = sanitizeHexColor(settings.primary_color);
  const fontPair = VALID_FONT_PAIRS.includes(settings.font_pairing as typeof VALID_FONT_PAIRS[number])
    ? settings.font_pairing
    : "modern";

  const fontCdn = fontPair !== "modern" ? FONT_CDN_LINKS[fontPair] : null;

  return (
    <html
      lang="en"
      className={`${ALL_FONT_VARIABLES} h-full antialiased`}
      data-font-pair={fontPair}
      suppressHydrationWarning
    >
      <head>
        {fontCdn && (
          <link rel="stylesheet" href={fontCdn} />
        )}
        <style dangerouslySetInnerHTML={{ __html: `:root { --primary: ${primaryColor}; --primary-hover: color-mix(in srgb, ${primaryColor} 85%, black); --primary-light: color-mix(in srgb, ${primaryColor} 10%, white); } .dark { --primary-light: color-mix(in srgb, ${primaryColor} 12%, #0c0a09); }` }} />
        <meta name="theme-color" content={primaryColor} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <NavWrapper />
          <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
            {children}
          </main>
          <Footer />
          <CookieConsent />
          <SWRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
