import Link from "next/link";
import { requireModerator, isAdminOnly } from "@/lib/auth";

const ALL_TABS = [
  { href: "/admin", label: "Overview", adminOnly: false },
  { href: "/admin/analytics", label: "Analytics", adminOnly: true },
  { href: "/admin/assessments", label: "Assessments", adminOnly: true },
  { href: "/admin/reports", label: "Reports", adminOnly: false },
  { href: "/admin/boards", label: "Boards", adminOnly: false },
  { href: "/admin/courses", label: "Courses", adminOnly: false },
  { href: "/admin/events/new", label: "Events", adminOnly: false },
  { href: "/admin/chat", label: "Chat", adminOnly: false },
  { href: "/admin/branding", label: "Branding", adminOnly: true },
  { href: "/admin/tags", label: "Tags", adminOnly: true },
  { href: "/admin/community", label: "Community", adminOnly: true },
  { href: "/admin/settings", label: "Points", adminOnly: true },
  { href: "/admin/waitlist", label: "Waitlist", adminOnly: true },
  { href: "/admin/members", label: "Members", adminOnly: true },
] as const;

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const profile = await requireModerator();
  const adminOnly = isAdminOnly(profile);

  const tabs = adminOnly ? ALL_TABS : ALL_TABS.filter((t) => !t.adminOnly);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">Admin</h1>
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-stone-200 dark:border-stone-800 pb-px">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-t-lg px-3 py-1.5 text-sm font-medium text-stone-500 dark:text-stone-400 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
