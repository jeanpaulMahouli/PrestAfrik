"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStoreBase } from "@/components/storefront/store-links";
import { storeHref } from "@/lib/store-host";

type MenuPage = { title: string; slug: string };

/** « Boutique » (accueil, page des ventes) puis les pages publiées, dans l'ordre choisi par le vendeur. */
function useMenuLinks(storeSlug: string, pages: MenuPage[]) {
  const base = useStoreBase(storeSlug);
  const pathname = usePathname();
  const home = storeHref(base);
  const links = [{ label: "Boutique", href: home }, ...pages.map((page) => ({ label: page.title, href: storeHref(base, "page", page.slug) }))];
  const isActive = (href: string) => (href === home ? pathname === home || pathname === `${home}/` : pathname === href);
  return { links, isActive };
}

/** Liens au centre de l'en-tête (ordinateur). */
export function StoreDesktopNav({ storeSlug, pages }: { storeSlug: string; pages: MenuPage[] }) {
  const { links, isActive } = useMenuLinks(storeSlug, pages);
  return (
    <nav aria-label="Menu de la boutique" className="sf-nav">
      {links.map((link) => (
        <Link aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bouton menu (mobile), placé avant le logo, qui ouvre un panneau latéral. */
export function StoreMobileMenu({ storeSlug, storeName, pages }: { storeSlug: string; storeName: string; pages: MenuPage[] }) {
  const { links, isActive } = useMenuLinks(storeSlug, pages);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll<HTMLElement>("a, button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const button = buttonRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button aria-expanded={open} aria-haspopup="dialog" aria-label="Ouvrir le menu de la boutique" className="sf-menu-button" onClick={() => setOpen(true)} ref={buttonRef} type="button">
        <Menu aria-hidden="true" size={22} />
      </button>
      {open && (
        <div className="sf-drawer-backdrop" onClick={() => setOpen(false)}>
          <div aria-label={`Menu de ${storeName}`} aria-modal="true" className="sf-drawer" onClick={(event) => event.stopPropagation()} ref={panelRef} role="dialog">
            <div className="sf-drawer-head">
              <strong>{storeName}</strong>
              <button aria-label="Fermer le menu" className="sf-drawer-close" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <nav aria-label="Menu de la boutique">
              {links.map((link) => (
                <Link aria-current={isActive(link.href) ? "page" : undefined} href={link.href} key={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
