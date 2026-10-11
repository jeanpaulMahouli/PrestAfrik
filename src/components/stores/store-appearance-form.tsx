"use client";

import { StoreTheme } from "@prisma/client";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateStoreSettings } from "@/modules/stores/settings-actions";
import { cameroonCities, storeBusinessCategories } from "@/modules/stores/options";

type AppearanceValues = {
  name: string;
  businessCategory: string;
  city: string;
  description: string;
  logoUrl: string | null;
  theme: StoreTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const themes: { id: StoreTheme; name: string; detail: string }[] = [
  { id: "CATALOGUE_EXPRESS", name: "Catalogue express", detail: "Simple et rapide" },
  { id: "MODE_BEAUTE", name: "Mode et beauté", detail: "Photos en grand" },
  { id: "BOUTIQUE_MARQUE", name: "Boutique de marque", detail: "Ton identité" },
];

export function StoreAppearanceForm({
  initialValues,
  error,
}: {
  initialValues: AppearanceValues;
  error?: string;
}) {
  const [values, setValues] = useState(initialValues);
  const previewStyle = {
    "--store-primary": values.primaryColor,
    "--store-secondary": values.secondaryColor,
    "--store-accent": values.accentColor,
    "--store-on-primary": "#000026",
  } as CSSProperties;

  function updateValue(field: keyof AppearanceValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="store-settings-layout">
      <form action={updateStoreSettings} className="store-settings-form">
        <div className="surface-card settings-section">
          <h2>Logo de la boutique</h2>
          <p className="dashboard-copy">
            Ajoute ton logo. Sans logo, les initiales de ta boutique sont affichées.
          </p>
          <div className="store-logo-edit">
            {values.logoUrl ? (
              <Image alt={`Logo ${values.name}`} height={112} src={values.logoUrl} width={112} />
            ) : (
              <span aria-hidden="true" className="store-logo-placeholder">
                {values.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B"}
              </span>
            )}
            <label className="store-logo-upload">
              <span>Glisse ton logo ici ou choisis un fichier</span>
              <small>PNG, JPG ou WebP · 2 Mo maximum</small>
              <input accept="image/png,image/jpeg,image/webp" name="logo" type="file" />
            </label>
          </div>
        </div>
        <div className="surface-card settings-section">
          <h2>Apparence</h2>
          <div className="theme-cards">
            {themes.map((theme) => (
              <label className={`theme-card ${values.theme === theme.id ? "selected" : ""}`} key={theme.id}>
                <span aria-hidden="true" className={`theme-swatch theme-swatch-${theme.id.toLowerCase()}`} />
                <input
                  checked={values.theme === theme.id}
                  name="theme"
                  onChange={() => updateValue("theme", theme.id)}
                  type="radio"
                  value={theme.id}
                />
                <strong>{theme.name}</strong>
                <span>{theme.detail}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="surface-card settings-section">
          <h2>Couleurs de ta boutique</h2>
          <p className="dashboard-copy">
            Les changements s’appliquent seulement à ta vitrine, pas à l’espace PrestAfrik.
          </p>
          {([
            ["primaryColor", "Couleur principale"],
            ["secondaryColor", "Couleur secondaire"],
            ["accentColor", "Couleur d’accent"],
          ] as const).map(([field, label]) => (
            <label className="color-setting" key={field}>
              <span className="color-preview-swatch" style={{ backgroundColor: values[field] }} />
              <span>
                {label}
                <small>{values[field]}</small>
              </span>
              <input
                aria-label={label}
                name={field}
                onChange={(event) => updateValue(field, event.target.value)}
                type="color"
                value={values[field]}
              />
            </label>
          ))}
        </div>
        <div className="surface-card settings-section">
          <h2>Informations de la boutique</h2>
          <label className="form-field">
            Nom de la boutique
            <input
              maxLength={80}
              minLength={2}
              name="name"
              onChange={(event) => updateValue("name", event.target.value)}
              required
              value={values.name}
            />
          </label>
          <label className="form-field">
            Activité
            <select
              name="businessCategory"
              onChange={(event) => updateValue("businessCategory", event.target.value)}
              required
              value={values.businessCategory}
            >
              <option disabled value="">Choisis une activité</option>
              {storeBusinessCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Ville
            <select
              name="city"
              onChange={(event) => updateValue("city", event.target.value)}
              required
              value={values.city}
            >
              <option disabled value="">Choisis une ville</option>
              {cameroonCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Présentation
            <textarea
              maxLength={2000}
              name="description"
              onChange={(event) => updateValue("description", event.target.value)}
              rows={4}
              value={values.description}
            />
          </label>
        </div>
        {error && <p aria-live="polite" className="form-error" role="alert">{error}</p>}
        <SubmitButton className="primary-button" pendingLabel="Enregistrement…">
          Enregistrer les modifications
        </SubmitButton>
      </form>
      <aside aria-label="Aperçu en direct" className="surface-card store-preview-card" style={previewStyle}>
        <h2>Aperçu avant publication</h2>
        <div className="store-preview">
          <p>{values.city}</p>
          <h3>{values.name || "Nom de ta boutique"}</h3>
          <p>{values.description || "Ta présentation apparaîtra ici."}</p>
          <div className="store-preview-banner" />
          <button className="store-preview-button" type="button">Voir mes produits</button>
        </div>
        <p className="dashboard-copy">
          Thème : {themes.find(({ id }) => id === values.theme)?.name}.
        </p>
      </aside>
    </div>
  );
}
