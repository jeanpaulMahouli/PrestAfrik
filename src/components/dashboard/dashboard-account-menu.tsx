"use client";

import Link from "next/link";
import type { StoreRole } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { selectStore } from "@/modules/stores/actions";

type Membership = {
  storeId: string;
  role: StoreRole;
  store: { id: string; name: string; city: string | null };
};

export function DashboardAccountMenu({
  store,
  memberships,
  role,
}: {
  store: { id: string; name: string; city: string | null };
  memberships: Membership[];
  role: StoreRole;
}) {
  const initials = store.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

  return (
    <details className="account-menu">
      <summary aria-label={`Menu de la boutique ${store.name}`} className="account-menu-trigger">
        <span aria-hidden="true" className="topbar-store-mark">
          {initials || "B"}
        </span>
        <span className="topbar-store">
          <strong>{store.name}</strong>
          {store.city && <small>{store.city}</small>}
        </span>
        <span aria-hidden="true" className="account-menu-chevron" />
      </summary>
      <div className="account-menu-panel">
        {memberships.length > 1 && (
          <form action={selectStore} className="account-menu-switcher">
            <label htmlFor="account-store-select">Boutique active</label>
            <select defaultValue={store.id} id="account-store-select" name="storeId">
              {memberships.map(({ store: memberStore, storeId }) => (
                <option key={storeId} value={storeId}>
                  {memberStore.name}
                </option>
              ))}
            </select>
            <SubmitButton className="secondary-button" pendingLabel="Changement…">
              Changer de boutique
            </SubmitButton>
          </form>
        )}
        <nav aria-label="Compte et boutique" className="account-menu-links">
          {role !== "ORDER_PREPARER" && <Link href="/dashboard/boutique">Paramètres de la boutique</Link>}
          <Link href="/dashboard/profil">Mon profil</Link>
        </nav>
        <div className="account-menu-logout">
          <SignOutButton />
        </div>
      </div>
    </details>
  );
}
