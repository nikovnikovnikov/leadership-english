"use client";

import { useActionState, useRef, useEffect } from "react";
import { contactAdmin, type ContactAdminState } from "@/actions/messages";

export function ContactAdminButton({ className }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<ContactAdminState, FormData>(
    contactAdmin,
    {},
  );
  const succeeded = state && !("error" in state);

  useEffect(() => {
    if (succeeded) {
      dialogRef.current?.close();
    }
  }, [succeeded]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        Contact Admin
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-2xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-stone-800 dark:bg-stone-900"
      >
        <form
          action={formAction}
          className="w-full max-w-md p-5"
          onSubmit={(e) => {
            if (pending) e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold dark:text-stone-100">Contact Admin</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-200"
            >
              ✕
            </button>
          </div>

          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Report a bug, ask a question, or share feedback. Your message will be sent as a direct message to the admin.
          </p>

          <textarea
            name="body"
            rows={4}
            required
            maxLength={5000}
            placeholder="Describe your issue or question…"
            className="mt-4 w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />

          {state.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
