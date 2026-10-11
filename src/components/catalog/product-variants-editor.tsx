"use client";

import { useState } from "react";

type Variant = {
  sku: string;
  optionName: string;
  optionValue: string;
  priceXaf: string;
  stockQuantity: string;
};

const emptyVariant: Variant = {
  sku: "",
  optionName: "",
  optionValue: "",
  priceXaf: "",
  stockQuantity: "",
};

export function ProductVariantsEditor({ initialVariants = [] }: { initialVariants?: Variant[] }) {
  const [variants, setVariants] = useState(initialVariants);
  const value = JSON.stringify(
    variants
      .filter((variant) => variant.sku || variant.optionName || variant.optionValue)
      .map((variant) => ({
        sku: variant.sku.trim(),
        optionName: variant.optionName.trim(),
        optionValue: variant.optionValue.trim(),
        priceXaf: variant.priceXaf ? Number(variant.priceXaf) : null,
        stockQuantity: variant.stockQuantity ? Number(variant.stockQuantity) : null,
      })),
  );

  function updateVariant(index: number, key: keyof Variant, nextValue: string) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: nextValue } : variant,
      ),
    );
  }

  return (
    <section aria-label="Variantes du produit" className="variant-editor">
      <input name="variants" type="hidden" value={value} />
      <div className="variant-editor-heading">
        <div>
          <h2>Variantes</h2>
          <p>Facultatif : tailles, couleurs ou formats.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setVariants((current) => [...current, { ...emptyVariant }])}
          type="button"
        >
          Ajouter une variante
        </button>
      </div>
      {variants.length === 0 && <p>Aucune variante pour le moment.</p>}
      {variants.map((variant, index) => (
        <fieldset className="variant-row" key={index}>
          <legend>Variante {index + 1}</legend>
          <label className="form-field">
            Type
            <input
              maxLength={60}
              onChange={(event) => updateVariant(index, "optionName", event.target.value)}
              placeholder="Taille"
              value={variant.optionName}
            />
          </label>
          <label className="form-field">
            Valeur
            <input
              maxLength={80}
              onChange={(event) => updateVariant(index, "optionValue", event.target.value)}
              placeholder="M"
              value={variant.optionValue}
            />
          </label>
          <label className="form-field">
            Référence
            <input
              maxLength={48}
              onChange={(event) => updateVariant(index, "sku", event.target.value)}
              placeholder="TEE-M"
              value={variant.sku}
            />
          </label>
          <label className="form-field">
            Prix spécifique (facultatif)
            <input
              inputMode="numeric"
              onChange={(event) => updateVariant(index, "priceXaf", event.target.value)}
              placeholder="Même prix que le produit"
              value={variant.priceXaf}
            />
          </label>
          <label className="form-field">
            Quantité en stock (facultative)
            <input
              inputMode="numeric"
              onChange={(event) => updateVariant(index, "stockQuantity", event.target.value)}
              placeholder="Même stock que le produit"
              value={variant.stockQuantity}
            />
          </label>
          <button
            className="text-link variant-remove"
            onClick={() =>
              setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))
            }
            type="button"
          >
            Retirer cette variante
          </button>
        </fieldset>
      ))}
    </section>
  );
}
