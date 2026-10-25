"use client";

import { StoreTheme } from "@prisma/client";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StoreLivePreview } from "@/components/stores/store-live-preview";
import { Combobox } from "@/components/ui/combobox";
import { StoreImage } from "@/components/ui/store-image";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { colorReadability } from "@/lib/contrast";
import { paletteFromImage } from "@/lib/logo-palette";
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
  { id: "BOUTIQUE_MARQUE", name: "Galerie", detail: "Grandes photos, angles droits" },
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
  sideFooter,
}: {
  initialValues: StoreSettingsValues;
  activities: { id: string; label: string }[];
  cities: readonly string[];
  publicUrl: string;
  published: boolean;
  /** Affiché en bas de la carte d'aperçu (ex. la zone de suppression de la boutique). */
  sideFooter?: ReactNode;
}) {
  const [values, setValues] = useState(initialValues);
  // Ville choisie dans la liste (ancienne ville saisie à la main : à choisir de nouveau).
  const [city, setCity] = useState(cities.includes(initialValues.city) ? initialValues.city : "");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [paletteNote, setPaletteNote] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  // Saisie gardée si la page est actualisée avant l'enregistrement.
  const formRef = useRef<HTMLFormElement>(null);
  useFormPersistence(formRef, `boutique:${initialValues.slug}`);
  const [state, action, pending] = useActionState<StoreSettingsState, FormData>(updateStoreSettings, null);
  // Nombre d'enregistrements réussis : l'aperçu se recharge après chacun.
  const [savedCount, setSavedCount] = useState(0);
  const fieldError = (field: string) => (state && !state.ok && state.field === field ? state.message : null);

  useEffect(() => {
    if (!state?.ok) return;
    // Le nouveau logo est enregistré : l'aperçu local laisse place à l'image publiée.
    setLogoPreview(null);
    setSavedCount((count) => count + 1);
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
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      void applyLogoColors(url);
      return;
    }
    if (logoInput.current) logoInput.current.value = "";
    setLogoPreview(null);
  }
  const set = <K extends keyof StoreSettingsValues>(key: K, value: StoreSettingsValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  /** Pipette : les couleurs de la boutique sont reprises du logo (modifiables ensuite). */
  async function applyLogoColors(src: string) {
    const palette = await paletteFromImage(src);
    if (!palette) {
      setPaletteNote("");
      return;
    }
    setValues((current) => ({ ...current, ...palette }));
    setPaletteNote("Couleurs reprises de votre logo. Vous pouvez les ajuster ci-dessous, puis enregistrez.");
  }
  const currentLogo = logoPreview ?? values.logoUrl;
  const initials = values.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";
  const liveValues = useMemo(
    () => ({
      name: values.name,
      theme: values.theme,
      primaryColor: values.primaryColor,
      secondaryColor: values.secondaryColor,
      accentColor: values.accentColor,
      logoUrl: logoPreview ?? values.logoUrl,
    }),
    [values.name, values.theme, values.primaryColor, values.secondaryColor, values.accentColor, values.logoUrl, logoPreview],
  );

  return (
    <div className="v-split">
      <form
        className="v-stack"
        id={storeSettingsFormId}
        noValidate
        ref={formRef}
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
        {state?.ok && state.slugNotice && (
          // Le lien a suivi le nouveau nom : on dit clairement au vendeur ce qui a changé (et pourquoi un indice a été ajouté).
          <p className="v-banner v-banner-info" role="status">
            <strong>Votre lien a changé.</strong> {state.slugNotice}
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
          {paletteNote && (
            <p className="v-banner v-banner-info" role="status">
              {paletteNote}
            </p>
          )}
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
          {currentLogo && (
            <button className="v-link-button" onClick={() => void applyLogoColors(currentLogo)} type="button">
              Reprendre les couleurs de mon logo
            </button>
          )}
        </section>

        <section className="v-card" id="informations">
          <h2 className="v-card-title">Informations</h2>
          <div className="v-grid-2">
            <label className="v-field">
              Nom de la boutique
              <input maxLength={60} name="name" onChange={(event) => set("name", event.target.value)} required value={values.name} />
              {values.name.trim() !== initialValues.name.trim() && (
                <span className="v-field-help">Le lien de votre boutique suivra ce nouveau nom ; l’ancien lien redirigera vers le nouveau.</span>
              )}
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
            <Combobox
              label="Ville"
              name="city"
              onChange={setCity}
              options={cities.map((item) => ({ value: item, label: item }))}
              placeholder="Choisir une ville"
              searchPlaceholder="Tapez pour filtrer les villes…"
              value={city}
            />
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

        <div className="v-sticky-actions store-save-actions">
          <SubmitButton className="btn btn-primary" loading={pending} pendingLabel="Enregistrement…">
            Enregistrer les modifications
          </SubmitButton>
        </div>
      </form>

      <div className="v-stack store-side">
        <section aria-labelledby="store-preview-title" className="v-card store-preview-card">
          <h2 className="v-card-title" id="store-preview-title">Aperçu avant publication</h2>
          <p className="v-small v-muted">Votre vraie boutique, telle que vos clients la verront sur leur téléphone. Vos changements s’y affichent avant même d’être enregistrés.</p>
          <StoreLivePreview reloadKey={savedCount} storePath={`/${initialValues.slug}`} values={liveValues} />
          {logoPreview && <p className="v-small store-preview-note">Nouveau logo : il sera publié à l’enregistrement.</p>}
          <p className="v-small">
            {published ? "Tout est prêt : partagez votre boutique avec un lien ou un QR code." : "Votre boutique est en brouillon : publiez-la quand tout est prêt."}
          </p>
          {/* En bas de l'aperçu : zone sensible (suppression de la boutique). */}
          {sideFooter}
        </section>
      </div>
    </div>
  );
}
