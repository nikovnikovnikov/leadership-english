"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUpload } from "@/components/avatar-upload";
import { updateAvatarUrl } from "@/actions/profile";

export function AccountAvatar({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">Profile photo</h2>
      <AvatarUpload
        userId={userId}
        currentAvatarUrl={avatarUrl}
        onUploaded={async (url) => {
          setAvatarUrl(url);
          await updateAvatarUrl(url);
          router.refresh();
        }}
      />
    </div>
  );
}
