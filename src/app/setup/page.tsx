import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/setup-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Finish setting up" };

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/feed");

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your profile
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Pick a username and you&apos;re in.
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
        <SetupForm userId={user.id} />
      </div>
    </div>
  );
}
