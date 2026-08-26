"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUpload } from "@/components/avatar-upload";
import { updateAvatarUrl } from "@/actions/profile";

export function SetupStep({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <AvatarUpload
        userId={userId}
        currentAvatarUrl={avatarUrl}
        onUploaded={async (url) => {
          setAvatarUrl(url);
          await updateAvatarUrl(url);
          router.refresh();
        }}
      />
      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
      >
        {avatarUrl ? "Continue" : "Skip for now"}
      </button>
    </div>
  );
}
