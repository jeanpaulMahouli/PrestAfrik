"use client";

import type { StorePromoStyle, StoreTheme } from "@prisma/client";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StoreLivePreview } from "@/components/stores/store-live-preview";
import { Combobox } from "@/components/ui/combobox";
import { StoreImage } from "@/components/ui/store-image";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { updateStoreSettings, type StoreSettingsState } from "@/modules/stores/settings-actions";
import { socialNetworks, type SocialLinks } from "@/modules/stores/social-links";
import { FacebookLogo, InstagramLogo, Pencil, TiktokLogo, XLogo, YoutubeLogo } from "@/components/ui/icons";
import { defaultStoreCover } from "@/lib/store-cover";

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
  /** Couverture (bannière) de la boutique, en haut de la vitrine. */
  bannerUrl: string | null;
  theme: StoreTheme;
  promoStyle: StorePromoStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  social: SocialLinks;
};

const socialIcons = { facebookUrl: FacebookLogo, instagramUrl: InstagramLogo, tiktokUrl: TiktokLogo, youtubeUrl: YoutubeLogo, xUrl: XLogo };

const promoStyles: { id: StorePromoStyle; name: string; detail: string }[] = [
  { id: "CLASSIQUE", name: "Classique", detail: "Sobre et élégant" },
  { id: "VENTE_FLASH", name: "Vente flash", detail: "Bandeau éclair, stock restant" },
  { id: "OFFRES_DU_JOUR", name: "Offres du jour", detail: "Économies mises en avant" },
  { id: "ECLAT", name: "Éclat", detail: "Fond nuit, reflets dorés animés" },
];

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
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
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
    setBannerPreview(null);
    setSavedCount((count) => count + 1);
    if (logoInput.current) logoInput.current.value = "";
    if (bannerInput.current) bannerInput.current.value = "";
    setValues((current) => ({ ...current, logoUrl: state.logoUrl, bannerUrl: state.bannerUrl }));
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
      return;
    }
    if (logoInput.current) logoInput.current.value = "";
    setLogoPreview(null);
  }
  /** Couverture choisie : vérifiée ici (type, 2 Mo), recadrée en 1920 × 600 à l'enregistrement. */
  function chooseBanner(file: File | undefined) {
    setBannerError("");
    if (!file) return setBannerPreview(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setBannerError("Choisissez une image PNG, JPG ou WebP.");
    } else if (file.size > 2 * 1024 * 1024) {
      setBannerError("La couverture ne peut pas dépasser 2 Mo.");
    } else {
      setBannerPreview(URL.createObjectURL(file));
      return;
    }
    if (bannerInput.current) bannerInput.current.value = "";
    setBannerPreview(null);
  }
  const set = <K extends keyof StoreSettingsValues>(key: K, value: StoreSettingsValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const initials = values.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";
  const liveValues = useMemo(
    () => ({
      name: values.name,
      theme: values.theme,
      promoStyle: values.promoStyle,
      primaryColor: values.primaryColor,
      secondaryColor: values.secondaryColor,
      accentColor: values.accentColor,
      logoUrl: logoPreview ?? values.logoUrl,
      bannerUrl: bannerPreview ?? values.bannerUrl,
    }),
    [values.name, values.theme, values.promoStyle, values.primaryColor, values.secondaryColor, values.accentColor, values.logoUrl, logoPreview, values.bannerUrl, bannerPreview],
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
        {/* En-tête comme sur Facebook : couverture en fond, logo rond par-dessus ; un crayon pour changer chacun. */}
        <section aria-label="Couverture et logo" className="v-card store-identity" id="logo">
          <div className="store-identity-cover">
            {/* Aperçu local (blob) avant l'envoi, sinon la couverture publiée, sinon l'image par défaut. */}
            <img alt="" src={bannerPreview ?? values.bannerUrl ?? defaultStoreCover} />
            <label className="store-identity-edit store-identity-edit--cover">
              <Pencil aria-hidden="true" size={16} />
              <span>Modifier la couverture</span>
              <input accept="image/png,image/jpeg,image/webp" className="visually-hidden" name="banner" onChange={(event) => chooseBanner(event.currentTarget.files?.[0])} ref={bannerInput} type="file" />
            </label>
          </div>
          <div className="store-identity-body">
            <div className="store-identity-logo">
              <span className="store-identity-logo-img">
                {logoPreview ? (
                  <img alt="Aperçu du nouveau logo" src={logoPreview} />
                ) : values.logoUrl ? (
                  <StoreImage alt={`Logo ${values.name}`} height={160} src={values.logoUrl} width={160} />
                ) : (
                  <span aria-hidden="true">{initials}</span>
                )}
              </span>
              <label aria-label="Modifier le logo" className="store-identity-edit store-identity-edit--logo" title="Modifier le logo">
                <Pencil aria-hidden="true" size={16} />
                <input accept="image/png,image/jpeg,image/webp" className="visually-hidden" name="logo" onChange={(event) => chooseLogo(event.currentTarget.files?.[0])} ref={logoInput} type="file" />
              </label>
            </div>
            <div className="store-identity-text">
              <strong>{values.name || "Ma boutique"}</strong>
              <small>Couverture 1920 × 600 px · logo carré · 2 Mo max</small>
            </div>
          </div>
          {(logoPreview || bannerPreview) && <p className="v-small store-identity-note">Nouvelle image : publiée à l’enregistrement.</p>}
          {(bannerError || fieldError("banner")) && <p className="v-field-error" role="alert">{bannerError || fieldError("banner")}</p>}
          {(logoError || fieldError("logo")) && <p className="v-field-error" role="alert">{logoError || fieldError("logo")}</p>}
        </section>

        <section className="v-card" id="apparence">
          <h2 className="v-card-title" id="style-promotions">Style des promotions</h2>
          <p className="v-small v-muted">Style de la rangée « Promotions ».</p>
          <div aria-labelledby="style-promotions" className="theme-tiles" role="radiogroup">
            {promoStyles.map((style) => (
              <label className={`theme-tile ${values.promoStyle === style.id ? "is-selected" : ""}`} key={style.id}>
                <input checked={values.promoStyle === style.id} className="visually-hidden" name="promoStyle" onChange={() => set("promoStyle", style.id)} type="radio" value={style.id} />
                <span aria-hidden="true" className={`promo-tile-thumb promo-tile-thumb-${style.id.toLowerCase()}`}>
                  <span />
                  <span />
                  <span />
                </span>
                <strong>{style.name}</strong>
                <small>{style.detail}</small>
              </label>
            ))}
          </div>
        </section>

        <section className="v-card" id="reseaux-sociaux">
          <h2 className="v-card-title">Réseaux sociaux</h2>
          <p className="v-small v-muted">Lien ou nom d’utilisateur.</p>
          <div className="v-grid-2 social-fields">
            {socialNetworks.map((network) => {
              const Icon = socialIcons[network.key];
              const error = fieldError(network.key);
              return (
                <label className="v-field" key={network.key}>
                  <span className="social-label">
                    <Icon aria-hidden="true" size={18} />
                    {network.label} (facultatif)
                  </span>
                  <input
                    aria-invalid={error ? true : undefined}
                    autoComplete="off"
                    defaultValue={values.social[network.key] ?? ""}
                    inputMode="url"
                    maxLength={300}
                    name={network.key}
                    placeholder={network.example}
                  />
                  {error && <span className="v-field-error">{error}</span>}
                </label>
              );
            })}
          </div>
        </section>

        <section className="v-card" id="informations">
          <h2 className="v-card-title">Informations</h2>
          <div className="v-grid-2">
            <label className="v-field">
              Nom de la boutique
              <input maxLength={60} name="name" onChange={(event) => set("name", event.target.value)} required value={values.name} />
              {values.name.trim() !== initialValues.name.trim() && (
                <span className="v-field-help">L’ancien lien redirigera vers le nouveau.</span>
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
          <StoreLivePreview reloadKey={savedCount} storePath={`/${initialValues.slug}`} values={liveValues} />
          {logoPreview && <p className="v-small store-preview-note">Nouveau logo : il sera publié à l’enregistrement.</p>}
          <p className="v-small">
            {published ? "Partagez votre boutique." : "Boutique en brouillon."}
          </p>
          {/* En bas de l'aperçu : zone sensible (suppression de la boutique). */}
          {sideFooter}
        </section>
      </div>
    </div>
  );
}
