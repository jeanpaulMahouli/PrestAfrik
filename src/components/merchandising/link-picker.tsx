"use client";

import { useId, useState } from "react";
import { storeLinkLabels, storeLinkTypes, type StoreLinkKind } from "@/modules/merchandising/links";

export type LinkPickerTargets = {
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
};

export type LinkPickerValue = { linkType: StoreLinkKind; categoryId: string | null; productId: string | null };

/**
 * « Lien au clic (facultatif) » : Aucun, une catégorie, un produit ou les promotions, puis le choix de la
 * catégorie ou du produit concerné. Champs envoyés : linkType, categoryId, productId.
 */
export function LinkPicker({ targets, initial, error }: { targets: LinkPickerTargets; initial?: LinkPickerValue; error?: string }) {
  const id = useId();
  const [type, setType] = useState<StoreLinkKind>(initial?.linkType ?? "NONE");
  const noCategory = type === "CATEGORY" && targets.categories.length === 0;
  const noProduct = type === "PRODUCT" && targets.products.length === 0;

  return (
    <div className="link-picker">
      <label className="v-field" htmlFor={`${id}-type`}>
        Lien au clic (facultatif)
        <select id={`${id}-type`} name="linkType" onChange={(event) => setType(event.currentTarget.value as StoreLinkKind)} value={type}>
          {storeLinkTypes.map((value) => (
            <option key={value} value={value}>{storeLinkLabels[value]}</option>
          ))}
        </select>
      </label>
      {type === "CATEGORY" && !noCategory && (
        <label className="v-field">
          Catégorie à ouvrir
          <select defaultValue={initial?.categoryId ?? ""} name="categoryId" required>
            <option disabled value="">Choisissez une catégorie</option>
            {targets.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
      )}
      {type === "PRODUCT" && !noProduct && (
        <label className="v-field">
          Produit à ouvrir
          <select defaultValue={initial?.productId ?? ""} name="productId" required>
            <option disabled value="">Choisissez un produit</option>
            {targets.products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </label>
      )}
      {(noCategory || noProduct) && (
        <p className="v-field-error">
          {noCategory ? "Vous n’avez pas encore de catégorie. Créez-en une depuis un produit, ou choisissez un autre lien." : "Vous n’avez pas encore de produit en ligne. Ajoutez-en un, ou choisissez un autre lien."}
        </p>
      )}
      {type === "PROMO" && <p className="v-small v-muted">Ouvre la page de tous vos produits en promotion.</p>}
      {error && <p className="v-field-error" role="alert">{error}</p>}
    </div>
  );
}
