import { Nav } from "@/components/nav";
import { getCurrentProfile } from "@/lib/auth";
import { SITE_NAME, SITE_LOGO_INITIAL } from "@/lib/config";
import { getSettings } from "@/lib/queries";
import { getUnreadCount } from "@/lib/queries";
import { getUnreadNotificationCount } from "@/lib/notifications";

export async function NavWrapper() {
  const [profile, settings] = await Promise.all([
    getCurrentProfile(),
    getSettings(),
  ]);

  const [unreadCount, notifCount] = await Promise.all([
    profile ? getUnreadCount(profile.id) : Promise.resolve(0),
    profile ? getUnreadNotificationCount(profile.id) : Promise.resolve(0),
  ]);

  return (
    <Nav
      profile={profile}
      unreadCount={unreadCount}
      notifCount={notifCount}
      siteName={SITE_NAME}
      logoInitial={SITE_LOGO_INITIAL}
      chatEnabled={settings.chat_enabled !== "false"}
    />
  );
}
