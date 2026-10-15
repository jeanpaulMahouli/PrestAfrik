"use client";

import { useState } from "react";

export type VariantDraft = { optionValue: string; sku: string; priceXaf: string; stockQuantity: string };

type Props = { initialOptionName?: string; initialVariants?: VariantDraft[]; error?: string };

/** Variantes du produit : une option (ex. Taille) et ses valeurs, chacune avec référence, prix et stock. */
export function ProductVariantsEditor({ initialOptionName = "", initialVariants = [], error }: Props) {
  const [enabled, setEnabled] = useState(initialVariants.length > 0);
  const [optionName, setOptionName] = useState(initialOptionName || "Taille");
  const [variants, setVariants] = useState<VariantDraft[]>(initialVariants);
  const [newValue, setNewValue] = useState("");

  const toNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);
  const serialized = enabled
    ? JSON.stringify(
        variants.map((variant) => ({
          optionName: optionName.trim(),
          optionValue: variant.optionValue.trim(),
          sku: variant.sku.trim(),
          priceXaf: toNumber(variant.priceXaf),
          stockQuantity: toNumber(variant.stockQuantity),
        })),
      )
    : "[]";

  function addValue() {
    const values = newValue
      .split(/[,;]/)
      .map((value) => value.trim())
      .filter((value) => value && !variants.some((variant) => variant.optionValue.toLowerCase() === value.toLowerCase()));
    if (!values.length) return;
    setVariants((current) => [...current, ...values.map((value) => ({ optionValue: value, sku: "", priceXaf: "", stockQuantity: "" }))].slice(0, 100));
    setNewValue("");
  }

  const update = (index: number, key: keyof VariantDraft, value: string) =>
    setVariants((current) => current.map((variant, position) => (position === index ? { ...variant, [key]: value } : variant)));

  return (
    <div className="variants-editor">
      <input name="variants" type="hidden" value={serialized} />
      <h2 className="v-card-title">{enabled ? "Variantes" : "Variantes (facultatif)"}</h2>
      {!enabled ? (
        <>
          <p className="v-muted v-small">
            Votre produit existe en plusieurs tailles ou couleurs ? Ajoutez des variantes, chacune avec son stock.
          </p>
          <button className="btn btn-secondary" onClick={() => setEnabled(true)} type="button">
            + Ajouter des variantes
          </button>
        </>
      ) : (
        <>
          <p className="v-muted v-small">Chaque variante peut avoir sa référence, son prix et son stock. Sans prix, celui du produit s’applique.</p>
          <div className="variants-option">
            <label className="v-field">
              Option
              <input maxLength={60} onChange={(event) => setOptionName(event.target.value)} placeholder="Taille, Couleur…" value={optionName} />
            </label>
            <label className="v-field">
              Ajouter des valeurs
              <span className="variants-add-row">
                <input
                  maxLength={160}
                  onChange={(event) => setNewValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addValue();
                    }
                  }}
                  placeholder="Ex. S, M, L"
                  value={newValue}
                />
                <button className="btn btn-secondary" onClick={addValue} type="button">
                  Ajouter
                </button>
              </span>
            </label>
          </div>
          {variants.length > 0 && (
            <div className="variants-table" role="table" aria-label="Variantes">
              <div className="variants-row variants-head" role="row">
                <span role="columnheader">{optionName || "Valeur"}</span>
                <span role="columnheader">Référence</span>
                <span role="columnheader">Prix (FCFA)</span>
                <span role="columnheader">Stock</span>
                <span role="columnheader"><span className="visually-hidden">Retirer</span></span>
              </div>
              {variants.map((variant, index) => (
                <div className="variants-row" key={`${variant.optionValue}-${index}`} role="row">
                  <span className="variants-chip" role="cell">{variant.optionValue}</span>
                  <input aria-label={`Référence ${variant.optionValue}`} maxLength={40} onChange={(event) => update(index, "sku", event.target.value)} placeholder="Automatique" role="cell" value={variant.sku} />
                  <input aria-label={`Prix ${variant.optionValue}`} inputMode="numeric" onChange={(event) => update(index, "priceXaf", event.target.value)} placeholder="Prix du produit" role="cell" value={variant.priceXaf} />
                  <input aria-label={`Stock ${variant.optionValue}`} inputMode="numeric" onChange={(event) => update(index, "stockQuantity", event.target.value)} placeholder="—" role="cell" value={variant.stockQuantity} />
                  <button aria-label={`Retirer la variante ${variant.optionValue}`} className="variants-remove" onClick={() => setVariants((current) => current.filter((_, position) => position !== index))} role="cell" type="button">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            className="v-link-button"
            onClick={() => {
              setEnabled(false);
              setVariants([]);
            }}
            type="button"
          >
            Retirer toutes les variantes
          </button>
        </>
      )}
      {error && <p className="v-field-error" role="alert">{error}</p>}
    </div>
  );
}
