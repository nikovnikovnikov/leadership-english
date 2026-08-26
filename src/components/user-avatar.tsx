import Image from "next/image";
import type { ProfileRef } from "@/lib/queries";

export function UserAvatar({
  profile,
  size = 36,
  showOnline = false,
}: {
  profile: ProfileRef | null;
  size?: number;
  showOnline?: boolean;
}) {
  const label = profile?.display_name ?? profile?.username ?? "?";

  const avatar = profile?.avatar_url ? (
    <Image
      src={profile.avatar_url}
      alt={label}
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-stone-200 dark:bg-white/10 object-cover"
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 font-semibold text-emerald-800 dark:text-emerald-300"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );

  if (!showOnline) return avatar;

  return (
    <div className="relative inline-flex">
      {avatar}
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-stone-800" />
    </div>
  );
}
