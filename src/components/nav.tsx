"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "@/components/mobile-menu";
import type { ProfileRef } from "@/lib/queries";

export function Nav({
  profile,
  unreadCount,
  notifCount,
  siteName,
  logoInitial,
  chatEnabled,
}: {
  profile: (ProfileRef & { role: string }) | null;
  unreadCount: number;
  notifCount: number;
  siteName: string;
  logoInitial: string;
  chatEnabled: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-[#0c0a09]/80">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <Link
                  href="/notifications"
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  aria-label="Notifications"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd" />
                  </svg>
                  {notifCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  aria-label="Open menu"
                >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
                </svg>
              </button>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <Logo siteName={siteName} logoInitial={logoInitial} hideNameOnMobile />
        </div>
      </header>

      {/* Mobile drawer */}
      {profile && (
        <MobileMenu
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          profile={profile}
          unreadCount={unreadCount}
          notifCount={notifCount}
          siteName={siteName}
          logoInitial={logoInitial}
          chatEnabled={chatEnabled}
        />
      )}
    </>
  );
}
