import Link from "next/link";
import { SITE_NAME, SITE_LOGO_INITIAL } from "@/lib/config";

export function Logo({
  siteName = SITE_NAME,
  logoInitial = SITE_LOGO_INITIAL,
}: {
  siteName?: string;
  logoInitial?: string;
}) {
  return (
    <Link href="/feed" className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
        {logoInitial}
      </span>
      <span className="text-sm font-semibold tracking-tight dark:text-stone-100">{siteName}</span>
    </Link>
  );
}
