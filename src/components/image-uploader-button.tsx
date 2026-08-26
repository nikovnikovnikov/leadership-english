"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UploadState = "idle" | "uploading" | "done" | "error";

export function ImageUploaderButton() {
  const [state, setState] = useState<UploadState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only images are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setState("uploading");
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setState("error");
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setState("error");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("post-images").getPublicUrl(path);

    setPreview(publicUrl);
    setUploadedUrl(publicUrl);
    setState("done");

    if (hiddenRef.current) {
      hiddenRef.current.value = publicUrl;
    }
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      upload(file);
    },
    [upload],
  );

  const clear = () => {
    setPreview(null);
    setUploadedUrl(null);
    setState("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (hiddenRef.current) hiddenRef.current.value = "";
  };

  return (
    <div className="relative">
      <input
        ref={hiddenRef}
        type="hidden"
        name="media_url"
        value={uploadedUrl ?? ""}
      />

      {preview ? (
        <div className="relative inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Upload preview"
            className="h-8 w-8 rounded-lg border border-stone-200 object-cover dark:border-stone-800"
          />
          <button
            type="button"
            onClick={clear}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-800 text-[10px] text-white shadow transition hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
            state === "uploading"
              ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
              : "border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
          }`}
        >
          {state === "uploading" ? "Uploading…" : "+ Image"}
        </button>
      )}

      {error && (
        <p className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-red-50 px-2 py-1 text-xs text-red-600 shadow dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
