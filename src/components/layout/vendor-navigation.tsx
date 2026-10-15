"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { StoreRole } from "@prisma/client";
import { texts } from "@/config/texts";
import { hasPermission, type Permission } from "@/modules/auth/permissions";

const nav = texts.vendor.nav;

const links: readonly { title: string; href: string; permission?: Permission }[] = [
  { title: nav.home, href: "/dashboard" },
  { title: nav.orders, href: "/dashboard/commandes", permission: "orders.read" },
  { title: nav.deliveries, href: "/dashboard/livraisons", permission: "delivery.manage" },
  { title: nav.products, href: "/dashboard/produits", permission: "products.read" },
  { title: nav.customers, href: "/dashboard/clients", permission: "customers.read" },
  { title: nav.money, href: "/dashboard/argent", permission: "payments.read" },
  { title: nav.marketing, href: "/dashboard/marketing", permission: "marketing.manage" },
  { title: nav.team, href: "/dashboard/equipe", permission: "team.read" },
  { title: nav.store, href: "/dashboard/boutique", permission: "store.manage" },
  { title: nav.subscription, href: "/dashboard/abonnement", permission: "subscription.manage" },
];

function NavLinks({ role, onNavigate }: { role: StoreRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {links
        .filter((link) => !link.permission || hasPermission(role, link.permission))
        .map((link) => {
          const active = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          return (
            <Link aria-current={active ? "page" : undefined} href={link.href} key={link.href} onClick={onNavigate}>
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

/** Bouton « Menu » et tiroir de navigation sous 1024 px (brief §4.2). */
export function VendorDrawer({ role, storeName }: { role: StoreRole; storeName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
      <button
        aria-controls="vendor-drawer"
        aria-expanded={open}
        aria-label={texts.vendor.shell.openMenu}
        className="topbar-icon-button vendor-menu-button"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="22">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
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
              <NavLinks onNavigate={() => setOpen(false)} role={role} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
