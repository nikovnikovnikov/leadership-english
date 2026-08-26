"use client";

import { useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  onUploaded,
}: {
  userId: string;
  currentAvatarUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    onUploaded(publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {currentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-2xl font-bold text-emerald-800 dark:text-emerald-300">
            A
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-xs text-white">
            ...
          </span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Change photo"}
        </button>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">JPG, PNG. Max 2 MB.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
