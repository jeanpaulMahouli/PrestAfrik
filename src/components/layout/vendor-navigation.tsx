"use client";

import { CreditCard, House, LayoutGrid, Megaphone, Package, ShoppingBag, Star, Store, Truck, Users, UsersRound, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { StoreRole } from "@prisma/client";
import { billingEnabled } from "@/config/billing";
import { texts } from "@/config/texts";
import { hasPermission, type Permission } from "@/modules/auth/permissions";

const nav = texts.vendor.nav;

type NavLink = { title: string; href: string; icon: LucideIcon; permission?: Permission };

const links: readonly NavLink[] = [
  { title: nav.home, href: "/dashboard", icon: House },
  { title: nav.orders, href: "/dashboard/commandes", icon: ShoppingBag, permission: "orders.read" },
  { title: nav.deliveries, href: "/dashboard/livraisons", icon: Truck, permission: "delivery.manage" },
  { title: nav.products, href: "/dashboard/produits", icon: Package, permission: "products.read" },
  { title: nav.reviews, href: "/dashboard/avis", icon: Star, permission: "products.manage" },
  { title: nav.customers, href: "/dashboard/clients", icon: Users, permission: "customers.read" },
  { title: nav.money, href: "/dashboard/argent", icon: Wallet, permission: "payments.read" },
  { title: nav.marketing, href: "/dashboard/marketing", icon: Megaphone, permission: "marketing.manage" },
  { title: nav.team, href: "/dashboard/equipe", icon: UsersRound, permission: "team.read" },
  { title: nav.store, href: "/dashboard/boutique", icon: Store, permission: "store.manage" },
  { title: nav.subscription, href: "/dashboard/abonnement", icon: CreditCard, permission: "subscription.manage" },
];

/** Raccourcis de la barre du bas (téléphone) ; « Menu » ouvre les autres rubriques. */
const tabHrefs = ["/dashboard", "/dashboard/commandes", "/dashboard/produits", "/dashboard/boutique"];

const allowed = (role: StoreRole) => links.filter((link) => !link.permission || hasPermission(role, link.permission));
const isActive = (pathname: string, href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

function NavLinks({ role, onNavigate, exclude = [] }: { role: StoreRole; onNavigate?: () => void; exclude?: string[] }) {
  const pathname = usePathname();
  return (
    <>
      {allowed(role)
        .filter((link) => !exclude.includes(link.href))
        .map((link) => {
          const Icon = link.icon;
          // Abonnement désactivé pendant le lancement gratuit (ADR-014) : entrée grisée, non cliquable.
          if (link.href === "/dashboard/abonnement" && !billingEnabled) {
            return (
              <span aria-disabled="true" className="nav-link-disabled" key={link.href} title="Bientôt disponible">
                <span className="nav-link-label">
                  <Icon aria-hidden="true" className="nav-link-icon" size={19} />
                  {link.title}
                </span>
                <small>Gratuit</small>
              </span>
            );
          }
          return (
            <Link aria-current={isActive(pathname, link.href) ? "page" : undefined} href={link.href} key={link.href} onClick={onNavigate}>
              <Icon aria-hidden="true" className="nav-link-icon" size={19} />
              {link.title}
            </Link>
          );
        })}
    </>
  );
}

/** Menu latéral fixe à partir de 1024 px. */
export function VendorSidebar({ role }: { role: StoreRole }) {
  return (
    <nav aria-label={texts.vendor.shell.mainNavigation} className="vendor-sidebar">
      <NavLinks role={role} />
    </nav>
  );
}

/**
 * Navigation sous 1024 px : barre du bas, comme une application mobile (Accueil, Commandes, Produits,
 * Ma boutique), et « Menu » qui ouvre les autres rubriques dans un tiroir.
 */
export function VendorMobileNav({ role, storeName }: { role: StoreRole; storeName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tabs = allowed(role).filter((link) => tabHrefs.includes(link.href));
  const menuActive = allowed(role).some((link) => !tabHrefs.includes(link.href) && isActive(pathname, link.href));

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusable = () => [...(panel?.querySelectorAll<HTMLElement>("a, button") ?? [])];
    focusable()[0]?.focus();
    const trigger = triggerRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <nav aria-label={texts.vendor.shell.mainNavigation} className="vendor-tabbar">
        {tabs.map((link) => {
          const Icon = link.icon;
          return (
            <Link aria-current={isActive(pathname, link.href) ? "page" : undefined} href={link.href} key={link.href}>
              <Icon aria-hidden="true" size={22} />
              <span>{link.title}</span>
            </Link>
          );
        })}
        <button aria-controls="vendor-drawer" aria-expanded={open} className={menuActive ? "is-active" : undefined} onClick={() => setOpen(true)} ref={triggerRef} type="button">
          <LayoutGrid aria-hidden="true" size={22} />
          <span>Menu</span>
        </button>
      </nav>
      {open && (
        <div className="vendor-drawer-layer">
          <button aria-label={texts.vendor.shell.closeMenu} className="vendor-drawer-backdrop" onClick={() => setOpen(false)} tabIndex={-1} type="button" />
          <div aria-label={texts.vendor.shell.mainNavigation} aria-modal="true" className="vendor-drawer" id="vendor-drawer" ref={panelRef} role="dialog">
            <div className="vendor-drawer-header">
              <strong>{storeName}</strong>
              <button aria-label={texts.vendor.shell.closeMenu} className="topbar-icon-button" onClick={() => setOpen(false)} type="button">
                <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="vendor-drawer-nav">
              <NavLinks exclude={tabHrefs} onNavigate={() => setOpen(false)} role={role} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
