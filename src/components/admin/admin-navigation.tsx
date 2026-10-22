"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { title: "Boutiques", href: "/admin" },
  { title: "Abonnements", href: "/admin/abonnements" },
  { title: "Messages échoués", href: "/admin/messages" },
  { title: "Alertes", href: "/admin/alertes" },
  { title: "Utilisateurs", href: "/admin/utilisateurs" },
  { title: "Journal", href: "/admin/journal" },
] as const;

/** Menu de l'administration : latéral dès 1024 px, onglets défilants en dessous. */
export function AdminNavigation({ openAlerts, variant }: { openAlerts: number; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className={variant === "sidebar" ? "vendor-sidebar admin-sidebar" : "admin-tabs"}>
      {links.map((link) => {
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
