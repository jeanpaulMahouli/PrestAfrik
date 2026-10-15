"use client";

import { StoreTheme } from "@prisma/client";
import { startTransition, useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { StoreImage } from "@/components/ui/store-image";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { colorReadability } from "@/lib/contrast";
import { updateStoreSettings, type StoreSettingsState } from "@/modules/stores/settings-actions";

export type StoreSettingsValues = {
  name: string;
  slug: string;
  description: string;
  activityId: string;
  activityOther: string;
  city: string;
  neighborhood: string;
  phoneCountry: string;
  phoneNational: string;
  contactEmail: string;
  address: string;
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupHours: string;
  logoUrl: string | null;
  theme: StoreTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const themes: { id: StoreTheme; name: string; detail: string }[] = [
  { id: "CATALOGUE_EXPRESS", name: "Catalogue express", detail: "Simple et rapide" },
  { id: "MODE_BEAUTE", name: "Mode et beauté", detail: "Photos en grand" },
  { id: "BOUTIQUE_MARQUE", name: "Boutique de marque", detail: "Votre identité" },
];

const colorFields = [
  ["primaryColor", "Couleur principale"],
  ["secondaryColor", "Couleur secondaire"],
  ["accentColor", "Couleur d’accent"],
] as const;

export const storeSettingsFormId = "store-settings-form";

/** Maquette « Ma boutique » : logo, apparence, couleurs, informations, aperçu avant publication. */
export function StoreAppearanceForm({
  initialValues,
  activities,
  cities,
  publicUrl,
  published,
}: {
  initialValues: StoreSettingsValues;
  activities: { id: string; label: string }[];
  cities: readonly string[];
  publicUrl: string;
  published: boolean;
}) {
  const [values, setValues] = useState(initialValues);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<StoreSettingsState, FormData>(updateStoreSettings, null);
  const fieldError = (field: string) => (state && !state.ok && state.field === field ? state.message : null);

  useEffect(() => {
    if (!state?.ok) return;
    // Le nouveau logo est enregistré : l'aperçu local laisse place à l'image publiée.
    setLogoPreview(null);
    if (logoInput.current) logoInput.current.value = "";
    setValues((current) => ({ ...current, logoUrl: state.logoUrl }));
  }, [state]);

  function chooseLogo(file: File | undefined) {
    setLogoError("");
    if (!file) return setLogoPreview(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Choisissez une image PNG, JPG ou WebP.");
    } else if (file.size > 2 * 1024 * 1024) {
      setLogoError("Le logo ne peut pas dépasser 2 Mo.");
    } else {
      setLogoPreview(URL.createObjectURL(file));
      return;
    }
    if (logoInput.current) logoInput.current.value = "";
    setLogoPreview(null);
  }
  const set = <K extends keyof StoreSettingsValues>(key: K, value: StoreSettingsValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const initials = values.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";
  const primary = colorReadability(values.primaryColor);
  const previewStyle = {
    "--store-primary": values.primaryColor,
    "--store-secondary": values.secondaryColor,
    "--store-accent": values.accentColor,
    "--store-on-primary": primary.text,
  } as CSSProperties;

  return (
    <div className="v-split">
      <form
        className="v-stack"
        id={storeSettingsFormId}
        noValidate
        onSubmit={(event) => {
          // Envoi sans rechargement : en cas d'erreur, le logo choisi et les réglages restent affichés.
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => action(data));
        }}
      >
        {state && (
          <p className={`v-banner ${state.ok ? "v-banner-success" : "v-banner-danger"}`} role={state.ok ? "status" : "alert"}>
            {state.message}
          </p>
        )}
        <section className="v-card" id="logo">
          <h2 className="v-card-title">Logo de la boutique</h2>
          <p className="v-small v-muted">Ajoutez votre propre logo. Sans logo, nous affichons les initiales de votre boutique.</p>
          <div className="logo-row">
            <span className="logo-preview">
              {logoPreview ? (
                // Aperçu local du fichier choisi (blob), avant l'envoi.
                <img alt="Aperçu du nouveau logo" src={logoPreview} />
              ) : values.logoUrl ? (
                <StoreImage alt={`Logo ${values.name}`} height={160} src={values.logoUrl} width={160} />
              ) : (
                <span aria-hidden="true">{initials}</span>
              )}
            </span>
            <label
              className={`logo-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file && logoInput.current) {
                  const transfer = new DataTransfer();
                  transfer.items.add(file);
                  logoInput.current.files = transfer.files;
                }
                chooseLogo(file);
              }}
            >
              <span>
                Glissez votre logo ici ou <span className="v-link-inline">choisissez un fichier</span>
              </span>
              <small>PNG, JPG ou WebP, 2 Mo maximum. Recadré en carré.</small>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                name="logo"
                onChange={(event) => chooseLogo(event.currentTarget.files?.[0])}
                ref={logoInput}
                type="file"
              />
            </label>
          </div>
          {(logoError || fieldError("logo")) && <p className="v-field-error" role="alert">{logoError || fieldError("logo")}</p>}
        </section>

        <section className="v-card" id="apparence">
          <h2 className="v-card-title">Apparence</h2>
          <div className="theme-tiles">
            {themes.map((theme) => (
              <label className={`theme-tile ${values.theme === theme.id ? "is-selected" : ""}`} key={theme.id}>
                <input checked={values.theme === theme.id} className="visually-hidden" name="theme" onChange={() => set("theme", theme.id)} type="radio" value={theme.id} />
                <span aria-hidden="true" className={`theme-tile-thumb theme-tile-thumb-${theme.id.toLowerCase()}`} />
                <strong>{theme.name}</strong>
                <small>{theme.detail}</small>
              </label>
            ))}
          </div>
          <p className="v-field-help">Changer de thème n’efface rien : produits, commandes, clients et pages sont conservés.</p>
        </section>

        <section className="v-card">
          <h2 className="v-card-title">Couleurs</h2>
          <ul className="color-list">
            {colorFields.map(([key, label]) => {
              const readability = colorReadability(values[key]);
              return (
                <li key={key}>
                  <label className="color-swatch" style={{ background: values[key] }}>
                    <span className="visually-hidden">{label}</span>
                    <input name={key} onChange={(event) => set(key, event.target.value.toUpperCase())} type="color" value={values[key]} />
                  </label>
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {values[key]} · {readability.label}
                    </small>
                  </span>
                  <span className={`badge badge-${key === "accentColor" || readability.readable ? "success" : "danger"}`}>
                    {key === "accentColor" || readability.readable ? "Lisible" : "Peu lisible"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="v-field-help">Le texte des boutons (blanc ou bleu nuit) est choisi automatiquement pour rester lisible.</p>
        </section>

        <section className="v-card" id="informations">
          <h2 className="v-card-title">Informations</h2>
          <div className="v-grid-2">
            <label className="v-field">
              Nom de la boutique
              <input maxLength={60} name="name" onChange={(event) => set("name", event.target.value)} required value={values.name} />
            </label>
            <div className="v-field">
              Adresse de la boutique
              <span className="store-address">{publicUrl.replace(/^https?:\/\//, "")}</span>
            </div>
            <label className="v-field">
              Activité principale
              <select defaultValue={values.activityId} name="activityId">
                <option value="">Mon activité n’est pas dans la liste</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>{activity.label}</option>
                ))}
              </select>
            </label>
            <label className="v-field">
              Autre activité (si elle n’est pas dans la liste)
              <input defaultValue={values.activityOther} maxLength={80} name="activityOther" />
            </label>
            <label className="v-field">
              Ville
              <input defaultValue={values.city} list="store-cities" maxLength={80} name="city" required />
              <datalist id="store-cities">
                {cities.map((city) => <option key={city} value={city} />)}
              </datalist>
            </label>
            <label className="v-field">
              Quartier (facultatif)
              <input defaultValue={values.neighborhood} maxLength={80} name="neighborhood" />
            </label>
          </div>
          <PhoneInput
            defaultCountry={values.phoneCountry}
            defaultNational={values.phoneNational}
            error={fieldError("phone") ?? undefined}
            label="Téléphone de la boutique"
            name="phone"
            required={false}
          />
          <div className="v-grid-2">
            <label className="v-field">
              E-mail de contact (facultatif)
              <input defaultValue={values.contactEmail} maxLength={254} name="contactEmail" type="email" />
            </label>
            <label className="v-field">
              Adresse (facultative)
              <input defaultValue={values.address} maxLength={200} name="address" />
            </label>
          </div>
          <label className="v-field">
            Description (facultative)
            <textarea defaultValue={values.description} maxLength={2000} name="description" rows={3} />
          </label>
          <label className="v-check">
            <input checked={values.pickupEnabled} name="pickupEnabled" onChange={(event) => set("pickupEnabled", event.target.checked)} type="checkbox" />
            Proposer le retrait en boutique
          </label>
          {values.pickupEnabled && (
            <div className="v-grid-2 pickup-fields">
              <label className="v-field">
                Adresse de retrait
                <input
                  aria-invalid={Boolean(fieldError("pickupAddress")) || undefined}
                  defaultValue={values.pickupAddress}
                  maxLength={200}
                  name="pickupAddress"
                  placeholder="Ex. Akwa, face à la pharmacie"
                />
                {fieldError("pickupAddress") && <span className="v-field-error">{fieldError("pickupAddress")}</span>}
              </label>
              <label className="v-field">
                Horaires de retrait
                <input defaultValue={values.pickupHours} maxLength={120} name="pickupHours" placeholder="Ex. Lundi au samedi, 9 h – 18 h" />
              </label>
            </div>
          )}
        </section>

        <div className="v-sticky-actions">
          <SubmitButton className="btn btn-primary" loading={pending} pendingLabel="Enregistrement…">
            Enregistrer les modifications
          </SubmitButton>
        </div>
      </form>

      <section aria-labelledby="store-preview-title" className="v-card store-preview-card">
        <h2 className="v-card-title" id="store-preview-title">Aperçu avant publication</h2>
        <div className={`store-preview store-preview-${values.theme.toLowerCase()}`} style={previewStyle}>
          <div className="store-preview-head">
            <span className="store-preview-logo">
              {logoPreview ? (
                <img alt="" src={logoPreview} />
              ) : values.logoUrl ? (
                <StoreImage alt="" height={80} src={values.logoUrl} width={80} />
              ) : (
                initials
              )}
            </span>
            <strong>{values.name || "Ma boutique"}</strong>
          </div>
          {values.theme === "BOUTIQUE_MARQUE" && <span className="store-preview-banner">{values.city || "Votre identité"}</span>}
          <div className="store-preview-products">
            {Array.from({ length: values.theme === "CATALOGUE_EXPRESS" ? 4 : values.theme === "MODE_BEAUTE" ? 1 : 2 }, (_, index) => (
              <span aria-hidden="true" className="store-preview-image" key={index} />
            ))}
          </div>
          <span className="store-preview-button">Commander</span>
        </div>
        {logoPreview && <p className="v-small store-preview-note">Nouveau logo : il sera publié à l’enregistrement.</p>}
        <p className="v-small">
          {published ? "Tout est prêt : partagez votre boutique avec un lien ou un QR code." : "Votre boutique est en brouillon : publiez-la quand tout est prêt."}
        </p>
      </section>
    </div>
  );
}
