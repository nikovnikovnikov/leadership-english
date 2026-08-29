"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ContactAdminButton } from "@/components/contact-admin-button";
import type { ProfileRef } from "@/lib/queries";

const NAV_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/board", label: "Board" },
  { href: "/events", label: "Events" },
  { href: "/courses", label: "Courses" },
  { href: "/book", label: "Book a Lesson" },
  { href: "/members", label: "Members" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
] as const;

const CHAT_LINK = { href: "/chat", label: "Chat" } as const;

function MobileNavLink({
  href,
  label,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-lg px-3 py-2 text-base font-medium transition ${
        isActive
          ? "bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[var(--primary-light)] dark:text-[var(--primary)]"
          : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      {label}
    </Link>
  );
}

export function MobileMenu({
  open,
  onClose,
  profile,
  unreadCount,
  notifCount,
  siteName,
  logoInitial,
  chatEnabled,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileRef & { role: string };
  unreadCount: number;
  notifCount: number;
  siteName: string;
  logoInitial: string;
  chatEnabled: boolean;
}) {
  const pathname = usePathname();

  if (!open) return null;

  const links: ReadonlyArray<{ href: string; label: string }> = chatEnabled
    ? [...NAV_LINKS.slice(0, 2), CHAT_LINK, ...NAV_LINKS.slice(2)]
    : NAV_LINKS;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 overflow-y-auto bg-white dark:bg-[#1c1917] shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-4 py-3">
          <Logo siteName={siteName} logoInitial={logoInitial} />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {links.map((link) => (
            <MobileNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={pathname.startsWith(link.href)}
              onClick={onClose}
            />
          ))}

          <div className="my-2 border-t border-stone-100 dark:border-stone-800" />

          <MobileNavLink
            href="/notifications"
            label={`Notifications${notifCount > 0 ? ` (${notifCount})` : ""}`}
            isActive={pathname === "/notifications"}
            onClick={onClose}
          />
          <MobileNavLink
            href="/messages"
            label={`Messages${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            isActive={pathname.startsWith("/messages")}
            onClick={onClose}
          />

          {(profile.role === "admin" || profile.role === "moderator") && (
            <>
              <div className="my-2 border-t border-stone-100 dark:border-stone-800" />
              <MobileNavLink
                href="/admin"
                label="Admin"
                isActive={pathname.startsWith("/admin")}
                onClick={onClose}
              />
            </>
          )}
        </nav>

        <div className="border-t border-stone-200 dark:border-stone-800 p-3">
          <Link
            href="/account"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <UserAvatar profile={profile} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile.display_name ?? profile.username}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-400">
                @{profile.username}
              </p>
            </div>
          </Link>
          <div className="mt-2 flex items-center gap-2 px-3">
            <ContactAdminButton className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200" />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
