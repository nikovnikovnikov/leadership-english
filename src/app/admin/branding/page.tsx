import { getSettings } from "@/lib/queries";
import { BrandingForm } from "@/components/admin/branding-form";

export const metadata = { title: "Branding — Admin" };

export default async function AdminBrandingPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Customize your community&apos;s name, logo, accent color, and legal
        page placeholders. Changes take effect site-wide after saving.
      </p>
      <BrandingForm values={settings} key={JSON.stringify(settings)} />
    </div>
  );
}
