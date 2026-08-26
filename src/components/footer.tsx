import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";

export async function Footer() {
  const settings = await getSettings();
  const name = settings.site_name || SITE_NAME;

  return (
    <footer className="mt-12 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-stone-400 dark:text-stone-400 sm:px-6">
        <p>&copy; {new Date().getFullYear()} {name}. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link href="/legal/privacy" className="hover:text-stone-600 dark:hover:text-stone-300">
            Privacy Policy
          </Link>
          <Link href="/legal/terms" className="hover:text-stone-600 dark:hover:text-stone-300">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
