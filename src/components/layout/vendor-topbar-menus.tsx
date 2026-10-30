"use client";

import { Check, Copy, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreRole } from "@prisma/client";
import { UserAvatar } from "@/components/account/user-avatar";
import { InstallAppButton } from "@/components/pwa/install-app";
import { useDismiss } from "@/components/ui/use-dismiss";
import { texts } from "@/config/texts";
import { copyText } from "@/lib/clipboard";
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

type Membership = { storeId: string; role: StoreRole; store: { name: string; city: string | null; logoUrl: string | null } };

/** Logo de la boutique (ou ses initiales s'il n'y en a pas). */
function StoreMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <span aria-hidden="true" className="store-mark">
      {/* Logo déjà optimisé (WebP carré) : affiché tel quel. */}
      {logoUrl ? <img alt="" height={28} src={logoUrl} width={28} /> : storeInitials(name)}
    </span>
  );
}

/** « Visiter ma boutique » et copie du lien, dans l'en-tête de l'espace vendeur. */
export function VisitStoreLinks({ storeUrl }: { storeUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="topbar-visit">
      <a className="topbar-visit-link" href={storeUrl} rel="noopener noreferrer" target="_blank">
        <Store aria-hidden="true" size={18} />
        <span className="topbar-visit-label">{t.visitStore}</span>
      </a>
      <button
        aria-label={copied ? "Lien copié" : "Copier le lien de ma boutique"}
        className="icon-button topbar-copy"
        onClick={async () => {
          const done = await copyText(storeUrl);
          setCopied(done);
          if (done) window.setTimeout(() => setCopied(false), 2000);
        }}
        title={copied ? "Lien copié" : "Copier le lien de ma boutique"}
        type="button"
      >
        {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
      </button>
    </div>
  );
}

export function StoreSwitcher({ storeId, storeName, storeLogoUrl, memberships }: { storeId: string; storeName: string; storeLogoUrl: string | null; memberships: Membership[] }) {
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
        <StoreMark logoUrl={storeLogoUrl} name={storeName} />
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
                    <StoreMark logoUrl={membership.store.logoUrl} name={membership.store.name} />
                    <span>
                      <strong>{membership.store.name}</strong>
                      <small>{t.roles[membership.role]}</small>
                    </span>
                  </span>
                ) : (
                  <form action={selectStore}>
                    <input name="storeId" type="hidden" value={membership.storeId} />
                    <button aria-label={`${t.switchStore} : ${membership.store.name}`} className="store-switch-item" type="submit">
                      <StoreMark logoUrl={membership.store.logoUrl} name={membership.store.name} />
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
          <Link className="topbar-menu-link" href="/boutiques/nouvelle">+ {t.createStore}</Link>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ userName, userEmail, userImage = null, adminLink = false }: { userName: string; userEmail: string; userImage?: string | null; adminLink?: boolean }) {
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
        {userImage ? <UserAvatar image={userImage} name={userName} size={32} /> : (userName.trim()[0]?.toLocaleUpperCase("fr-FR") ?? "?")}
      </button>
      {open && (
        <div className="topbar-menu-panel topbar-menu-panel-end">
          <p className="topbar-user">
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </p>
          <Link className="topbar-menu-link" href="/dashboard/profil" onClick={() => setOpen(false)}>{t.profile}</Link>
          <InstallAppButton className="topbar-menu-link topbar-install" compact />
          {adminLink && <Link className="topbar-menu-link" href="/admin" onClick={() => setOpen(false)}>Administration</Link>}
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
  const close = useCallback(() => setOpen(false), []);
  const overlayRef = useDismiss(open, close);
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
        <div className="topbar-search-overlay" ref={overlayRef} role="search">
          <form action="/dashboard/recherche" className="topbar-search-overlay-form">
            <input aria-label={t.searchLabel} maxLength={80} minLength={2} name="q" placeholder={t.searchPlaceholder} ref={inputRef} required type="search" />
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
