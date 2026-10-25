"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { title: "Tableau de bord", href: "/admin" },
  { title: "Boutiques", href: "/admin/boutiques" },
  { title: "Prospection", href: "/admin/prospection" },
  { title: "Abonnements", href: "/admin/abonnements" },
  { title: "Messages échoués", href: "/admin/messages" },
  { title: "Alertes", href: "/admin/alertes" },
  { title: "Utilisateurs", href: "/admin/utilisateurs" },
  { title: "Administrateurs", href: "/admin/administrateurs", superAdminOnly: true },
  { title: "Journal", href: "/admin/journal" },
] as const;

/** Menu de l'administration : latéral dès 1024 px, onglets défilants en dessous. */
export function AdminNavigation({ openAlerts, superAdmin, variant }: { openAlerts: number; superAdmin: boolean; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className={variant === "sidebar" ? "vendor-sidebar admin-sidebar" : "admin-tabs"}>
      {links
        .filter((link) => !("superAdminOnly" in link) || superAdmin)
        .map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link aria-current={active ? "page" : undefined} href={link.href} key={link.href}>
              {link.title}
              {link.href === "/admin/alertes" && openAlerts > 0 && <span className="admin-nav-count">{openAlerts}</span>}
            </Link>
          );
        })}
    </nav>
  );
}
