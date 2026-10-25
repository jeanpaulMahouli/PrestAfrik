import Image from "next/image";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { NotificationBell } from "@/components/admin/notification-bell";
import { UserMenu } from "@/components/layout/vendor-topbar-menus";
import { countOpenAlerts } from "@/modules/admin/alerts";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { countUnreadSystemNotifications } from "@/modules/system/notifications";

/** Mise en page de l'administration PrestAfrik (maquette « Administration », pastille distincte de l'espace vendeur). */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const [openAlerts, unreadNotifications] = await Promise.all([countOpenAlerts().catch(() => 0), countUnreadSystemNotifications().catch(() => 0)]);
  const superAdmin = admin.platformRole === "SUPER_ADMIN";

  return (
    <div className="vendor-shell admin-shell">
      <header className="vendor-topbar">
        <Link aria-label="PrestAfrik, accueil de l’administration" className="vendor-logo" href="/admin">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <span className="admin-pill">Administration</span>
        <span className="vendor-topbar-spacer" />
        <Link className="admin-topbar-link" href="/dashboard">Espace vendeur</Link>
        <NotificationBell initialUnread={unreadNotifications} />
        <UserMenu userEmail={admin.email} userImage={admin.image} userName={admin.name} />
      </header>
      <AdminNavigation openAlerts={openAlerts} superAdmin={superAdmin} variant="tabs" />
      <div className="vendor-body">
        <AdminNavigation openAlerts={openAlerts} superAdmin={superAdmin} variant="sidebar" />
        <main className="vendor-main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
