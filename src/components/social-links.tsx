import type { ProfileRef } from "@/lib/queries";

type SocialLinks = {
  instagram_url: string | null;
  substack_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  custom_link_url: string | null;
  custom_link_label: string | null;
};

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SubstackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function SocialLinks({
  profile,
  size = "sm",
}: {
  profile: SocialLinks & Pick<ProfileRef, "username">;
  size?: "sm" | "md";
}) {
  const links: { href: string; icon: React.ReactNode; label: string }[] = [];

  if (profile.instagram_url) {
    links.push({ href: profile.instagram_url, icon: <InstagramIcon />, label: "Instagram" });
  }
  if (profile.substack_url) {
    links.push({ href: profile.substack_url, icon: <SubstackIcon />, label: "Substack" });
  }
  if (profile.x_url) {
    links.push({ href: profile.x_url, icon: <XIcon />, label: "X" });
  }
  if (profile.youtube_url) {
    links.push({ href: profile.youtube_url, icon: <YouTubeIcon />, label: "YouTube" });
  }
  if (profile.custom_link_url) {
    links.push({
      href: profile.custom_link_url,
      icon: <LinkIcon />,
      label: profile.custom_link_label || getDomain(profile.custom_link_url),
    });
  }

  if (!links.length) return null;

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const gap = size === "md" ? "gap-3" : "gap-2";

  return (
    <div className={`flex flex-wrap items-center ${gap}`}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
           className={`flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-900 dark:hover:text-stone-100`}
        >
          <span className={iconSize}>{link.icon}</span>
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
