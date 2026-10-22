import Image from "next/image";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { UserMenu } from "@/components/layout/vendor-topbar-menus";
import { fontVariables } from "@/lib/fonts";
import { listOpenAlerts } from "@/modules/admin/alerts";
import { requirePlatformAdmin } from "@/modules/admin/context";

/** Mise en page de l'administration PrestAfrik (maquette « Administration », pastille distincte de l'espace vendeur). */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const openAlerts = (await listOpenAlerts().catch(() => [])).length;

  return (
    <div className={`vendor-shell admin-shell ${fontVariables}`}>
      <header className="vendor-topbar">
        <Link aria-label="PrestAfrik, accueil de l’administration" className="vendor-logo" href="/admin">
          <Image alt="" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
        </Link>
        <span className="admin-pill">Administration</span>
        <span className="vendor-topbar-spacer" />
        <Link className="admin-topbar-link" href="/dashboard">Espace vendeur</Link>
        <UserMenu userEmail={admin.email} userImage={admin.image} userName={admin.name} />
      </header>
      <AdminNavigation openAlerts={openAlerts} variant="tabs" />
      <div className="vendor-body">
        <AdminNavigation openAlerts={openAlerts} variant="sidebar" />
        <main className="vendor-main" id="contenu">
          {children}
        </main>
      </div>
    </div>
  );
}
