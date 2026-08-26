import Link from "next/link";

export function Logo({
  siteName = "Sanctum",
  logoInitial = "S",
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
