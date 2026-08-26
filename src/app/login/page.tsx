import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthUser, getCurrentProfile } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect("/feed");

  if (await getAuthUser()) redirect("/setup");

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Log in to your account.
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
