"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/config/statuses";
import { hideProducts, showProducts } from "@/modules/marketplace/product-moderation-actions";

export type ModerationRow = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  href: string;
  storeName: string;
  storeHref: string;
  category: string | null;
  price: string;
  createdAt: string;
  hidden: boolean;
  state: { label: string; tone: Tone; reason?: string };
  hiddenNote: string | null;
};

/**
 * Tableau des produits (Administration → Produits).
 *   - Le bouton d'une ligne n'agit que sur ce produit (et seul ce bouton patiente pendant l'envoi).
 *   - La barre « Masquer / Réafficher la sélection » n'apparaît qu'une fois des produits cochés.
 */
export function ProductsModeration({ rows, retour }: { rows: ModerationRow[]; retour: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allChecked = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function run(action: typeof hideProducts, ids: string[], key: string) {
    const data = new FormData();
    data.set("retour", retour);
    if (motif.trim()) data.set("motif", motif.trim());
    if (ids.length === 1 && key !== "bulk") data.set("single", ids[0]);
    else for (const id of ids) data.append("productId", id);
    setBusy(key);
    startTransition(async () => {
      await action(data);
    });
  }

  const isBusy = (key: string) => pending && busy === key;

  return (
    <div className="admin-products">
      {selected.size > 0 && (
        <div aria-live="polite" className="admin-products-bulk" role="region">
          <strong>
            {selected.size} produit{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          </strong>
          <label className="visually-hidden" htmlFor="products-motif">
            Motif
          </label>
          <input id="products-motif" maxLength={200} onChange={(event) => setMotif(event.target.value)} placeholder="Motif (facultatif, envoyé au vendeur)" value={motif} />
          <button className="btn btn-danger-outline" disabled={pending} onClick={() => run(hideProducts, [...selected], "bulk")} type="button">
            {isBusy("bulk") ? "…" : "Masquer la sélection"}
          </button>
          <button className="btn btn-secondary" disabled={pending} onClick={() => run(showProducts, [...selected], "bulk")} type="button">
            Réafficher la sélection
          </button>
          <button className="v-link-button" onClick={() => setSelected(new Set())} type="button">
            Annuler
          </button>
        </div>
      )}
      <table className="v-table admin-table admin-products-table">
        <thead>
          <tr>
            <th scope="col">
              <input
                aria-label="Tout sélectionner sur cette page"
                checked={allChecked}
                onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((row) => row.id)))}
                type="checkbox"
              />
            </th>
            <th scope="col">Produit</th>
            <th scope="col">Boutique</th>
            <th scope="col">Prix</th>
            <th scope="col">Ajouté le</th>
            <th scope="col">Marketplace</th>
            <th scope="col">
              <span className="visually-hidden">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.hidden ? "is-off" : selected.has(row.id) ? "is-selected" : undefined} key={row.id}>
              <td>
                <input aria-label={`Sélectionner ${row.name}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} type="checkbox" />
              </td>
              <td className="v-cell-primary">
                <span className="admin-product">
                  {/* Miniature déjà optimisée (WebP). */}
                  {row.imageUrl ? <img alt="" height={44} loading="lazy" src={row.imageUrl} width={44} /> : <span aria-hidden="true" className="admin-product-empty" />}
                  <span>
                    <a href={row.href} rel="noopener noreferrer" target="_blank">
                      {row.name}
                    </a>
                    <span className="v-cell-sub">{row.sku}</span>
                  </span>
                </span>
              </td>
              <td data-label="Boutique">
                <Link href={row.storeHref}>{row.storeName}</Link>
                {row.category && <span className="v-cell-sub">{row.category}</span>}
              </td>
              <td data-label="Prix">{row.price}</td>
              <td data-label="Ajouté le">{row.createdAt}</td>
              <td className="v-cell-badges" data-label="Marketplace">
                <Badge tone={row.state.tone}>{row.state.label}</Badge>
                {row.state.reason && <span className="v-cell-sub">{row.state.reason}</span>}
                {row.hiddenNote && <span className="v-cell-sub">{row.hiddenNote}</span>}
              </td>
              <td className="admin-row-actions">
                {row.hidden ? (
                  <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(showProducts, [row.id], row.id)} type="button">
                    {isBusy(row.id) ? "…" : "Réafficher"}
                  </button>
                ) : (
                  <button className="btn btn-danger-outline btn-sm" disabled={pending} onClick={() => run(hideProducts, [row.id], row.id)} type="button">
                    {isBusy(row.id) ? "…" : "Masquer"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
