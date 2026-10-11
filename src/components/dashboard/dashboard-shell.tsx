import { StoreRole } from "@prisma/client";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  role: StoreRole;
  store: { id: string; name: string; city: string | null };
  memberships: {
    storeId: string;
    role: StoreRole;
    store: { id: string; name: string; city: string | null };
  }[];
  userName: string;
  userEmail: string;
};

export function DashboardShell({
  children,
  store,
  memberships,
  role,
}: DashboardShellProps) {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <a aria-label="PrestAfrik, accueil" className="topbar-brand" href="/dashboard">
          <BrandLogo priority />
        </a>
        <input
          aria-label="Recherche globale"
          className="topbar-search"
          disabled
          placeholder="Recherche globale · bientôt disponible"
          type="search"
        />
        <DashboardAccountMenu memberships={memberships} role={role} store={store} />
      </header>
      <div className="dashboard-body">
        <DashboardNavigation role={role} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
