"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreRole } from "@prisma/client";
import { hasPermission, type Permission } from "@/modules/auth/permissions";

type NavigationLink = {
  title: string;
  href?: string;
  ready?: boolean;
  permission?: Permission;
};

const links: readonly NavigationLink[] = [
  { title: "Accueil", href: "/dashboard", ready: true },
  { title: "Commandes", href: "/dashboard/commandes", ready: true },
  { title: "Messages", href: "/dashboard/messages", permission: "orders.read" },
  { title: "Livraisons", href: "/dashboard/livraisons", permission: "delivery.manage" },
  { title: "Produits", href: "/dashboard/produits", ready: true },
  { title: "Clients", href: "/dashboard/clients", permission: "customers.read" },
  { title: "Argent reçu", href: "/dashboard/argent", permission: "payments.read" },
  { title: "Marketing", href: "/dashboard/marketing", permission: "marketing.manage" },
  { title: "Mon équipe", href: "/dashboard/equipe", permission: "team.read" },
  { title: "Ma boutique", href: "/dashboard/boutique", ready: true },
  { title: "Abonnement", href: "/dashboard/abonnement", permission: "subscription.manage" },
];

export function DashboardNavigation({ role }: { role: StoreRole }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="sidebar">
      {links.map((link) => {
        const available =
          link.ready || (link.permission ? hasPermission(role, link.permission) : false);
        return link.href && available ? (
          <Link
            aria-current={
              link.href === "/dashboard"
                ? pathname === link.href ? "page" : undefined
                : pathname.startsWith(link.href) ? "page" : undefined
            }
            href={link.href}
            key={link.title}
          >
            {link.title}
          </Link>
        ) : (
          <span aria-disabled="true" className="nav-disabled" key={link.title}>
            {link.title}
          </span>
        );
      })}
    </nav>
  );
}
