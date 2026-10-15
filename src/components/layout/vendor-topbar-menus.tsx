"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { StoreRole } from "@prisma/client";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";
import { selectStore } from "@/modules/stores/actions";

const t = texts.vendor.shell;

export function storeInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
      .join("") || "B"
  );
}

/** Ferme un menu déroulant au clic extérieur et à la touche Échap. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

type Membership = { storeId: string; role: StoreRole; store: { name: string; city: string | null } };

export function StoreSwitcher({ storeId, storeName, memberships }: { storeId: string; storeName: string; memberships: Membership[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div className="topbar-menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t.storeMenu} (${storeName})`}
        className="topbar-store"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true" className="store-mark">{storeInitials(storeName)}</span>
        <span className="topbar-store-name">{storeName}</span>
      </button>
      {open && (
        <div className="topbar-menu-panel">
          <p className="topbar-menu-label">{t.activeStore}</p>
          <ul className="store-switch-list">
            {memberships.map((membership) => (
              <li key={membership.storeId}>
                {membership.storeId === storeId ? (
                  <span aria-current="true" className="store-switch-item is-active">
                    <span aria-hidden="true" className="store-mark">{storeInitials(membership.store.name)}</span>
                    <span>
                      <strong>{membership.store.name}</strong>
                      <small>{t.roles[membership.role]}</small>
                    </span>
                  </span>
                ) : (
                  <form action={selectStore}>
                    <input name="storeId" type="hidden" value={membership.storeId} />
                    <button aria-label={`${t.switchStore} : ${membership.store.name}`} className="store-switch-item" type="submit">
                      <span aria-hidden="true" className="store-mark">{storeInitials(membership.store.name)}</span>
                      <span>
                        <strong>{membership.store.name}</strong>
                        <small>{t.roles[membership.role]}</small>
                      </span>
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <Link className="topbar-menu-link" href="/boutiques/nouvelle?nouvelle=1">+ {t.createStore}</Link>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ref = useDismiss(open, () => setOpen(false));

  async function signOut() {
    setPending(true);
    setError("");
    const result = await authClient.signOut().catch(() => ({ error: true }));
    if (result.error) {
      setError(t.signOutError);
      setPending(false);
      return;
    }
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <div className="topbar-menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.accountMenu}
        className="user-avatar"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {userName.trim()[0]?.toLocaleUpperCase("fr-FR") ?? "?"}
      </button>
      {open && (
        <div className="topbar-menu-panel topbar-menu-panel-end">
          <p className="topbar-user">
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </p>
          <Link className="topbar-menu-link" href="/dashboard/profil" onClick={() => setOpen(false)}>{t.profile}</Link>
          <button className="topbar-menu-link topbar-signout" disabled={pending} onClick={signOut} type="button">
            {pending ? t.signingOut : t.signOut}
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function MobileSearchButton() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button aria-label={t.openSearch} className="topbar-icon-button topbar-search-toggle" onClick={() => setOpen(true)} type="button">
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
      {open && (
        <div className="topbar-search-overlay" role="search">
          <form action="/dashboard/recherche" className="topbar-search-overlay-form">
            <input aria-label={t.searchLabel} maxLength={80} name="q" placeholder={t.searchPlaceholder} ref={inputRef} type="search" />
            <button aria-label={t.closeSearch} className="topbar-icon-button" onClick={() => setOpen(false)} type="button">
              <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
