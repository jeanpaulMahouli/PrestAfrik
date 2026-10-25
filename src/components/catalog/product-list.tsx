"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { StoreImage } from "@/components/ui/store-image";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatFcfa } from "@/lib/format";

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  availability: "AVAILABLE" | "SOLD_OUT" | "PREORDER";
  stock: number | null;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  isFeatured: boolean;
  thumbnail: string | null;
  photoCount: number;
  orderCount: number;
};

type Action = (formData: FormData) => void | Promise<void>;

type ProductListProps = {
  rows: ProductListRow[];
  tab: string;
  storeSlug: string;
  storePublished: boolean;
  canManage: boolean;
  actions: { archive: Action; restore: Action; remove: Action; duplicate: Action; feature: Action };
};

const availabilityBadge = {
  AVAILABLE: { label: "Disponible", tone: "success" },
  SOLD_OUT: { label: "Épuisé", tone: "danger" },
  PREORDER: { label: "Sur commande", tone: "info" },
} as const;

function HiddenIds({ ids, tab }: { ids: string[]; tab: string }) {
  return (
    <>
      <input name="onglet" type="hidden" value={tab} />
      {ids.map((id) => (
        <input key={id} name="productIds" type="hidden" value={id} />
      ))}
    </>
  );
}

function RowMenu({ row, tab, storeSlug, storePublished, actions, onDelete }: { row: ProductListRow; tab: string; storeSlug: string; storePublished: boolean; actions: ProductListProps["actions"]; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  // Ouvre le menu vers le haut quand la place manque sous le bouton (dernières lignes du tableau).
  const [upward, setUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={ref}>
      <button aria-expanded={open} aria-haspopup="menu" aria-label={`Plus d’actions pour ${row.name}`} className="row-menu-trigger" onClick={(event) => {
          setUpward(window.innerHeight - event.currentTarget.getBoundingClientRect().bottom < 280);
          setOpen((value) => !value);
        }} type="button">
        ···
      </button>
      {open && (
        <div className={`row-menu-panel${upward ? " is-upward" : ""}`} role="menu">
          <Link href={`/dashboard/produits/${row.id}`} role="menuitem">Modifier</Link>
          <form action={actions.duplicate}>
            <input name="productId" type="hidden" value={row.id} />
            <button role="menuitem" type="submit">Dupliquer</button>
          </form>
          {row.status === "ACTIVE" && storePublished && (
            <a href={`/${storeSlug}/${row.slug}`} rel="noopener noreferrer" role="menuitem" target="_blank">
              Voir dans la boutique
            </a>
          )}
          <form action={row.status === "ARCHIVED" ? actions.restore : actions.archive}>
            <HiddenIds ids={[row.id]} tab={tab} />
            <button role="menuitem" type="submit">{row.status === "ARCHIVED" ? "Restaurer en brouillon" : "Archiver"}</button>
          </form>
          <button
            className="row-menu-danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            role="menuitem"
            type="button"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

/** Tableau des produits avec sélection multiple (maquettes « Produits » et « Supprimer ou archiver »). */
export function ProductList({ rows, tab, storeSlug, storePublished, canManage, actions }: ProductListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<ProductListRow[] | null>(null);
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ordered = deleting?.filter((row) => row.orderCount > 0) ?? [];
  const neverOrdered = deleting?.filter((row) => row.orderCount === 0) ?? [];
  const single = deleting?.length === 1 ? deleting[0] : null;

  return (
    <>
      {canManage && selected.size > 0 && (
        <div aria-live="polite" className="bulk-bar">
          <strong>
            {selected.size} produit{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          </strong>
          <div>
            <form action={tab === "archives" ? actions.restore : actions.archive}>
              <HiddenIds ids={[...selected]} tab={tab} />
              <SubmitButton className="btn btn-secondary" pendingLabel="Patientez…">
                {tab === "archives" ? "Restaurer" : "Archiver"}
              </SubmitButton>
            </form>
            <button className="btn btn-danger" onClick={() => setDeleting(selectedRows)} type="button">
              Supprimer
            </button>
          </div>
        </div>
      )}

      <table className="v-table product-table">
        <thead>
          <tr>
            {canManage && (
              <th className="product-check" scope="col">
                <input
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                  type="checkbox"
                />
              </th>
            )}
            <th scope="col">Produit</th>
            <th scope="col">Disponibilité</th>
            <th scope="col">Stock</th>
            <th scope="col">Prix</th>
            <th scope="col">Prix promo</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={selected.has(row.id) ? "is-selected" : ""} key={row.id}>
              {canManage && (
                <td className="product-check">
                  <input aria-label={`Sélectionner ${row.name}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} type="checkbox" />
                </td>
              )}
              <td className="product-cell">
                <span className="product-thumb">
                  {row.thumbnail ? <StoreImage alt="" height={96} sizes="48px" src={row.thumbnail} width={96} /> : null}
                </span>
                <span>
                  {canManage ? <Link className="product-name" href={`/dashboard/produits/${row.id}`}>{row.name}</Link> : <span className="product-name">{row.name}</span>}
                  <small>
                    {row.sku} · {row.photoCount} photo{row.photoCount > 1 ? "s" : ""}
                  </small>
                </span>
              </td>
              <td data-label="Disponibilité">
                <span className={`badge badge-${availabilityBadge[row.availability].tone}`}>{availabilityBadge[row.availability].label}</span>
              </td>
              <td data-label="Stock">{row.stock ?? "—"}</td>
              <td data-label="Prix">{formatFcfa(row.priceXaf)}</td>
              <td data-label="Prix promo">{row.promotionalPriceXaf === null ? "—" : formatFcfa(row.promotionalPriceXaf)}</td>
              <td className="product-actions">
                {canManage && row.status !== "ARCHIVED" && (
                  <form action={actions.feature}>
                    <input name="onglet" type="hidden" value={tab} />
                    <input name="productId" type="hidden" value={row.id} />
                    <input name="featured" type="hidden" value={row.isFeatured ? "0" : "1"} />
                    <button
                      aria-label={row.isFeatured ? `Ne plus mettre en avant « ${row.name} »` : `Mettre en avant « ${row.name} » sur l’accueil de la boutique`}
                      aria-pressed={row.isFeatured}
                      className={`icon-button icon-button-sm${row.isFeatured ? " is-featured" : ""}`}
                      title={row.isFeatured ? "Mis en avant : touchez pour retirer" : "Mettre en avant sur l’accueil"}
                      type="submit"
                    >
                      <Star aria-hidden="true" fill={row.isFeatured ? "currentColor" : "none"} size={16} />
                    </button>
                  </form>
                )}
                {canManage && <Link className="v-link" href={`/dashboard/produits/${row.id}`}>Modifier</Link>}
                {canManage && (
                  <RowMenu actions={actions} onDelete={() => setDeleting([row])} row={row} storePublished={storePublished} storeSlug={storeSlug} tab={tab} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        onClose={() => setDeleting(null)}
        open={Boolean(deleting)}
        size="sm"
        title={
          single
            ? single.orderCount > 0
              ? `Supprimer « ${single.name} » ?`
              : `Supprimer définitivement « ${single.name} » ?`
            : `Supprimer ${deleting?.length ?? 0} produits ?`
        }
      >
        <div className="delete-dialog">
          <span aria-hidden="true" className={`delete-dialog-icon ${neverOrdered.length && !ordered.length ? "is-danger" : ""}`}>
            {neverOrdered.length && !ordered.length ? "⚠" : "!"}
          </span>
          {single ? (
            single.orderCount > 0 ? (
              <p>
                Ce produit a déjà été commandé <strong>{single.orderCount} fois</strong>. Pour que l’historique de vos commandes reste exact, il ne peut pas être
                supprimé définitivement. Nous vous proposons de l’archiver : il disparaît de votre boutique, mais reste visible dans vos anciennes commandes. Vous
                pourrez le restaurer à tout moment.
              </p>
            ) : (
              <p>
                Ce produit n’a jamais été commandé. Sa suppression est <strong>définitive</strong> : ses informations et ses photos seront effacées et ne pourront
                pas être récupérées.
              </p>
            )
          ) : (
            <p>
              {neverOrdered.length > 0 && (
                <>
                  <strong>{neverOrdered.length}</strong> produit{neverOrdered.length > 1 ? "s" : ""} jamais commandé{neverOrdered.length > 1 ? "s" : ""} ser
                  {neverOrdered.length > 1 ? "ont" : "a"} supprimé{neverOrdered.length > 1 ? "s" : ""} définitivement, photos comprises.{" "}
                </>
              )}
              {ordered.length > 0 && (
                <>
                  <strong>{ordered.length}</strong> produit{ordered.length > 1 ? "s" : ""} déjà commandé{ordered.length > 1 ? "s" : ""} ser
                  {ordered.length > 1 ? "ont" : "a"} archivé{ordered.length > 1 ? "s" : ""} à la place, pour garder l’historique de vos commandes.
                </>
              )}
            </p>
          )}
          <div className="action-dialog-buttons">
            <button className="btn btn-secondary" onClick={() => setDeleting(null)} type="button">
              Annuler
            </button>
            {single && single.orderCount > 0 ? (
              <form action={actions.archive}>
                <HiddenIds ids={[single.id]} tab={tab} />
                <SubmitButton className="btn btn-primary" pendingLabel="Archivage…">
                  Archiver ce produit
                </SubmitButton>
              </form>
            ) : (
              <form action={actions.remove}>
                <HiddenIds ids={(deleting ?? []).map((row) => row.id)} tab={tab} />
                <SubmitButton className="btn btn-danger" pendingLabel="Suppression…">
                  {single ? "Oui, supprimer" : "Confirmer"}
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
