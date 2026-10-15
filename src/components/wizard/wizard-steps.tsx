"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoManager } from "@/components/catalog/photo-manager";
import { Combobox } from "@/components/ui/combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { colorReadability } from "@/lib/contrast";
import { slugify } from "@/modules/stores/slug";
import {
  saveActivityStep,
  saveBrandingStep,
  saveContactStep,
  saveLocationStep,
  saveNameStep,
  saveProductStep,
  saveThemeStep,
} from "@/modules/stores/wizard-actions";
import { useWizardPreview } from "@/components/wizard/wizard-shell";
import { WizardStepForm } from "@/components/wizard/wizard-step-form";
import { CheckIcon } from "@/components/ui/icons";

const back = (storeId: string | null, step: number) => (storeId ? `/boutiques/nouvelle?boutique=${storeId}&etape=${step}` : undefined);

/* ---------- 1. Nom ---------- */

type SlugStatus = { state: "idle" | "checking" | "ok" | "error"; message?: string; suggestions: string[] };

export function NameStep({ storeId, initialName, initialSlug, city }: { storeId: string | null; initialName: string; initialSlug: string; city: string | null }) {
  const { update } = useWizardPreview();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(initialSlug));
  const [status, setStatus] = useState<SlugStatus>({ state: "idle", suggestions: [] });

  useEffect(() => {
    if (!slug) {
      setStatus({ state: "idle", suggestions: [] });
      return;
    }
    setStatus((current) => ({ ...current, state: "checking" }));
    const controller = new AbortController();
    // Anti-rebond de 400 ms (brief §6.3).
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ slug, nom: name || slug, ...(city ? { ville: city } : {}), ...(storeId ? { boutique: storeId } : {}) });
      fetch(`/api/boutiques/disponibilite?${query.toString()}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ available?: boolean; message?: string; suggestions?: string[]; error?: string }>)
        .then((data) => setStatus({ state: data.available ? "ok" : "error", message: data.message ?? data.error, suggestions: data.suggestions ?? [] }))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setStatus({ state: "idle", suggestions: [] });
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slug, name, city, storeId]);

  return (
    <WizardStepForm action={saveNameStep} storeId={storeId} subtitle="C’est le nom que vos clients verront en premier. Pas d’inquiétude : vous pourrez le modifier plus tard." title="Comment s’appelle votre boutique ?">
      {(fieldError) => (
        <>
          <label className="v-field">
            Nom de la boutique
            <span className={`wizard-input ${name.trim().length >= 2 ? "is-valid" : ""}`}>
              <input
                aria-invalid={Boolean(fieldError("name")) || undefined}
                autoComplete="organization"
                maxLength={60}
                name="name"
                onChange={(event) => {
                  setName(event.target.value);
                  update({ name: event.target.value });
                  if (!slugEdited) setSlug(slugify(event.target.value));
                }}
                placeholder="Ex. Mboa Style"
                required
                value={name}
              />
              <small>{name.length} / 60</small>
              {name.trim().length >= 2 && <CheckIcon />}
            </span>
            {fieldError("name") && <span className="v-field-error">{fieldError("name")}</span>}
          </label>
          <label className="v-field">
            Adresse web de la boutique
            <span className={`wizard-slug ${status.state === "ok" ? "is-valid" : status.state === "error" ? "is-invalid" : ""}`}>
              <span className="wizard-slug-prefix">prestafrik.com/boutique/</span>
              <input
                aria-describedby="slug-status"
                aria-invalid={status.state === "error" || Boolean(fieldError("slug")) || undefined}
                autoCapitalize="none"
                maxLength={40}
                name="slug"
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                spellCheck={false}
                value={slug}
              />
              {status.state === "ok" && <CheckIcon />}
            </span>
            <span aria-live="polite" className={status.state === "error" || fieldError("slug") ? "v-field-error" : status.state === "ok" ? "wizard-success" : "v-field-help"} id="slug-status">
              {fieldError("slug") ??
                (status.state === "checking"
                  ? "Vérification de la disponibilité…"
                  : status.state === "ok"
                    ? `Bonne nouvelle : cette adresse est disponible ! Votre boutique sera visible sur prestafrik.com/boutique/${slug}.`
                    : status.state === "error"
                      ? status.message
                      : "3 à 40 caractères : lettres minuscules, chiffres et tirets, sans espace.")}
            </span>
          </label>
          {status.suggestions.length > 0 && (
            <div className="wizard-suggestions">
              <p>Autres idées d’adresses disponibles :</p>
              <div className="variable-chips">
                {status.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSlugEdited(true);
                      setSlug(suggestion);
                    }}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 2. Activité ---------- */

export function ActivityStep({ storeId, activities, initialId, initialOther }: { storeId: string; activities: { id: string; label: string; popular: boolean }[]; initialId: string; initialOther: string }) {
  const { update } = useWizardPreview();
  const [activityId, setActivityId] = useState(initialId);
  const [other, setOther] = useState(initialOther);
  const [freeText, setFreeText] = useState(!initialId && Boolean(initialOther));
  const choose = (id: string) => {
    setActivityId(id);
    setFreeText(false);
    update({ activity: activities.find((activity) => activity.id === id)?.label ?? "" });
  };

  return (
    <WizardStepForm action={saveActivityStep} backHref={back(storeId, 1)} storeId={storeId} subtitle="Choisissez votre activité principale pour que nous adaptions les suggestions à votre métier. La liste se filtre au fur et à mesure que vous tapez." title="Que vendez-vous ?">
      {(fieldError) => (
        <>
          <p className="wizard-label">Activités les plus choisies :</p>
          <div className="variable-chips">
            {activities.filter((activity) => activity.popular).map((activity) => (
              <button aria-pressed={activityId === activity.id} className={activityId === activity.id ? "is-selected" : ""} key={activity.id} onClick={() => choose(activity.id)} type="button">
                {activity.label}
              </button>
            ))}
          </div>
          {!freeText ? (
            <Combobox
              error={fieldError("activityId")}
              label="Votre activité principale"
              name="activityId"
              notListedLabel="Mon activité n’est pas dans la liste : je la précise"
              onChange={choose}
              onNotListed={() => {
                setFreeText(true);
                setActivityId("");
              }}
              options={activities.map((activity) => ({ value: activity.id, label: activity.label }))}
              placeholder="Choisir une activité"
              searchPlaceholder="Tapez pour chercher (ex. beauté)…"
              value={activityId}
            />
          ) : (
            <label className="v-field">
              Votre activité
              <input autoFocus maxLength={80} name="activityOther" onChange={(event) => { setOther(event.target.value); update({ activity: event.target.value }); }} placeholder="Ex. Vente de pagnes" value={other} />
              {fieldError("activityOther") && <span className="v-field-error">{fieldError("activityOther")}</span>}
              <button className="v-link-button" onClick={() => setFreeText(false)} type="button">Choisir dans la liste</button>
            </label>
          )}
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 3. Localisation ---------- */

type GeoRegion = { code: string; name: string; cities: string[] };

export function LocationStep({ storeId, countries, geo, initial }: { storeId: string; countries: { iso: string; name: string }[]; geo: Record<string, GeoRegion[]>; initial: { country: string; region: string; city: string; neighborhood: string } }) {
  const { update } = useWizardPreview();
  const [country, setCountry] = useState(initial.country || "CM");
  const regions = geo[country] ?? null;
  const [region, setRegion] = useState(() => regions?.find((item) => item.name === initial.region)?.code ?? initial.region);
  const [city, setCity] = useState(initial.city);
  const [cityFree, setCityFree] = useState(Boolean(initial.city && regions && !regions.some((item) => item.cities.includes(initial.city))));
  const [notice, setNotice] = useState("");
  const regionInfo = regions?.find((item) => item.code === region);
  const countryName = countries.find((item) => item.iso === country)?.name ?? country;

  useEffect(() => {
    update({ location: city ? `${city}, ${countryName}` : countryName });
    // L'aperçu suit la ville et le pays choisis.
  }, [city, countryName]);

  return (
    <WizardStepForm action={saveLocationStep} backHref={back(storeId, 2)} storeId={storeId} subtitle="Votre pays, votre région et votre ville nous permettent de proposer les bonnes zones de livraison. Chaque liste s’adapte automatiquement au choix précédent." title="Où se trouve votre boutique ?">
      {(fieldError) => (
        <>
          <Combobox
            help={`Plus de ${Math.floor(countries.length / 10) * 10} pays disponibles. Tapez quelques lettres pour chercher.`}
            label="Pays"
            name="country"
            onChange={(value) => {
              if (value !== country) {
                setCountry(value);
                setRegion("");
                setCity("");
                setCityFree(!geo[value]);
                setNotice("Le pays a changé : choisissez à nouveau la région et la ville.");
              }
            }}
            options={countries.map((item) => ({ value: item.iso, label: item.name }))}
            searchPlaceholder="Rechercher un pays…"
            value={country}
          />
          {notice && <p className="v-field-help" role="status">{notice}</p>}
          {regions ? (
            <>
              <Combobox
                error={fieldError("region")}
                help="Les régions affichées dépendent du pays choisi."
                label="Région"
                name="region"
                onChange={(value) => {
                  setRegion(value);
                  setCity("");
                  setCityFree(false);
                  setNotice("");
                }}
                options={regions.map((item) => ({ value: item.code, label: item.name }))}
                placeholder="Choisir une région"
                searchPlaceholder="Rechercher une région…"
                value={region}
              />
              {!cityFree ? (
                <Combobox
                  disabled={!regionInfo}
                  error={fieldError("city")}
                  label="Ville"
                  name="city"
                  notListedLabel="Ma ville n’est pas dans la liste : je la saisis moi-même"
                  onChange={setCity}
                  onNotListed={() => {
                    setCityFree(true);
                    setCity("");
                  }}
                  options={(regionInfo?.cities ?? []).map((item) => ({ value: item, label: item }))}
                  placeholder={regionInfo ? "Choisir une ville" : "Choisissez d’abord une région"}
                  searchPlaceholder={`Tapez pour filtrer les villes ${regionInfo ? `du ${regionInfo.name}` : ""}…`}
                  value={city}
                />
              ) : null}
            </>
          ) : (
            <label className="v-field">
              Région
              <input maxLength={80} name="region" onChange={(event) => setRegion(event.target.value)} required value={region} />
              {fieldError("region") && <span className="v-field-error">{fieldError("region")}</span>}
            </label>
          )}
          {cityFree && (
            <label className="v-field">
              Ville
              <input autoFocus maxLength={80} name="city" onChange={(event) => setCity(event.target.value)} required value={city} />
              <input name="cityFree" type="hidden" value="1" />
              {fieldError("city") && <span className="v-field-error">{fieldError("city")}</span>}
              {regions && <button className="v-link-button" onClick={() => setCityFree(false)} type="button">Choisir dans la liste</button>}
            </label>
          )}
          <label className="v-field">
            Quartier (facultatif)
            <input defaultValue={initial.neighborhood} maxLength={80} name="neighborhood" placeholder="Ex. Akwa" />
          </label>
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 4. Coordonnées ---------- */

export function ContactStep({ storeId, phone, whatsapp, contactEmail }: { storeId: string; phone: { country: string; national: string }; whatsapp: { country: string; national: string } | null; contactEmail: string }) {
  const [same, setSame] = useState(!whatsapp || (whatsapp.country === phone.country && whatsapp.national === phone.national));
  return (
    <WizardStepForm action={saveContactStep} backHref={back(storeId, 3)} storeId={storeId} subtitle="Ces coordonnées s’affichent dans votre boutique. L’indicatif du pays est séparé du numéro : saisissez simplement votre numéro, nous ajoutons l’indicatif." title="Comment vos clients peuvent-ils vous joindre ?">
      {(fieldError) => (
        <>
          <PhoneInput defaultCountry={phone.country} defaultNational={phone.national} error={fieldError("phone")} help="Saisissez le numéro sans l’indicatif. Le format international est créé automatiquement." label="Téléphone de la boutique" name="phone" />
          <label className="v-check">
            <input checked={same} name="sameWhatsapp" onChange={(event) => setSame(event.target.checked)} type="checkbox" />
            Mon numéro WhatsApp est le même que mon téléphone
          </label>
          {!same && (
            <PhoneInput defaultCountry={whatsapp?.country ?? phone.country} defaultNational={whatsapp?.national ?? ""} error={fieldError("whatsapp")} help="Vos clients vous écriront sur ce numéro." label="Numéro WhatsApp" name="whatsapp" />
          )}
          <label className="v-field">
            Adresse e-mail de contact (facultatif)
            <input defaultValue={contactEmail} maxLength={254} name="contactEmail" placeholder="contact@maboutique.com" type="email" />
            <span className={fieldError("contactEmail") ? "v-field-error" : "v-field-help"}>{fieldError("contactEmail") ?? "Affichée dans la page Contact de votre boutique."}</span>
          </label>
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 5. Thème ---------- */

const themes = [
  { id: "CATALOGUE_EXPRESS", name: "Catalogue express", detail: "Simple et rapide, idéal pour beaucoup de produits" },
  { id: "MODE_BEAUTE", name: "Mode et beauté", detail: "Grandes photos, ambiance soignée" },
  { id: "BOUTIQUE_MARQUE", name: "Boutique de marque", detail: "Votre identité en avant" },
] as const;

export function ThemeStep({ storeId, initialTheme }: { storeId: string; initialTheme: (typeof themes)[number]["id"] }) {
  const { update } = useWizardPreview();
  const [theme, setTheme] = useState(initialTheme);
  return (
    <WizardStepForm action={saveThemeStep} backHref={back(storeId, 4)} storeId={storeId} subtitle="Les trois thèmes offrent exactement les mêmes fonctions. Seule la mise en page change. Vous pourrez en changer plus tard sans perdre vos produits ni vos commandes." title="Choisissez le style de votre boutique">
      {() => (
        <div className="wizard-themes" role="radiogroup">
          {themes.map((item) => (
            <label className={`wizard-theme ${theme === item.id ? "is-selected" : ""}`} key={item.id}>
              <input checked={theme === item.id} className="visually-hidden" name="theme" onChange={() => { setTheme(item.id); update({ theme: item.id }); }} type="radio" value={item.id} />
              <span aria-hidden="true" className={`wizard-theme-mock wizard-theme-mock-${item.id.toLowerCase()}`}>
                <span />
                <span />
                <span />
              </span>
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
              {theme === item.id && <span className="badge badge-warning wizard-theme-chosen">Choisi</span>}
            </label>
          ))}
        </div>
      )}
    </WizardStepForm>
  );
}

/* ---------- 6. Couleurs et logo ---------- */

const defaults = { primaryColor: "#FF9900", secondaryColor: "#000026", accentColor: "#EF765E" };

export function BrandingStep({ storeId, initial }: { storeId: string; initial: { primaryColor: string; secondaryColor: string; accentColor: string; logoUrl: string | null; initials: string } }) {
  const { update } = useWizardPreview();
  const [colors, setColors] = useState({ primaryColor: initial.primaryColor, secondaryColor: initial.secondaryColor, accentColor: initial.accentColor });
  const [logo, setLogo] = useState<string | null>(initial.logoUrl);
  const [logoError, setLogoError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const setColor = (key: keyof typeof colors, value: string) => {
    setColors((current) => ({ ...current, [key]: value.toUpperCase() }));
    update({ [key]: value.toUpperCase() });
  };
  const chooseLogo = (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setLogoError("Choisissez une image PNG, JPG ou WebP de 2 Mo maximum.");
      if (input.current) input.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setLogo(url);
    update({ logoUrl: url });
  };

  return (
    <WizardStepForm action={saveBrandingStep} backHref={back(storeId, 5)} storeId={storeId} subtitle="Ajoutez votre logo (c’est vous qui le choisissez) et personnalisez les couleurs. Nous vérifions que vos textes restent bien lisibles." title="Votre logo et vos couleurs">
      {(fieldError) => (
        <>
          <p className="wizard-label">Logo de votre boutique</p>
          <div className="logo-row">
            <span className="logo-preview">{logo ? <img alt="Aperçu du logo" src={logo} /> : <span aria-hidden="true">{initial.initials}</span>}</span>
            <label
              className="logo-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file && input.current) {
                  const transfer = new DataTransfer();
                  transfer.items.add(file);
                  input.current.files = transfer.files;
                }
                chooseLogo(file);
              }}
            >
              <span>Glissez votre logo ici ou <span className="v-link-inline">choisissez un fichier</span></span>
              <small>PNG ou JPG, 2 Mo maximum. Sans logo, vos initiales sont affichées.</small>
              <input accept="image/png,image/jpeg,image/webp" className="visually-hidden" name="logo" onChange={(event) => chooseLogo(event.currentTarget.files?.[0])} ref={input} type="file" />
            </label>
          </div>
          {(logoError || fieldError("logo")) && <p className="v-field-error">{logoError || fieldError("logo")}</p>}
          <p className="wizard-label">Couleurs</p>
          <ul className="color-list">
            {(
              [
                ["primaryColor", "Couleur principale (boutons)"],
                ["secondaryColor", "Couleur secondaire"],
                ["accentColor", "Couleur d’accent"],
              ] as const
            ).map(([key, label]) => {
              const readability = colorReadability(colors[key]);
              return (
                <li key={key}>
                  <label className="color-swatch" style={{ background: colors[key] }}>
                    <span className="visually-hidden">{label}</span>
                    <input name={key} onChange={(event) => setColor(key, event.target.value)} type="color" value={colors[key]} />
                  </label>
                  <span>
                    <strong>{label}</strong>
                    <small>{colors[key]} · {readability.label.toLowerCase()}</small>
                  </span>
                  <span className={`badge badge-${readability.readable ? "success" : "danger"}`}>{readability.readable ? "Bien lisible" : "Peu lisible"}</span>
                </li>
              );
            })}
          </ul>
          <button
            className="v-link-button"
            onClick={() => {
              setColors(defaults);
              update(defaults);
            }}
            type="button"
          >
            Revenir aux couleurs PrestAfrik
          </button>
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 7. Premier produit ---------- */

export function ProductStep({ storeId, existingProduct }: { storeId: string; existingProduct: string | null }) {
  return (
    <WizardStepForm
      action={saveProductStep}
      backHref={back(storeId, 6)}
      secondary={
        <button className="btn btn-secondary" formNoValidate name="skip" type="submit" value="1">
          {existingProduct ? "Continuer sans ajouter" : "Passer cette étape"}
        </button>
      }
      storeId={storeId}
      subtitle="C’est facultatif, mais une boutique avec un produit donne tout de suite envie d’acheter ! Vous pourrez ajouter jusqu’à 5 photos par produit."
      title={existingProduct ? "Ajouter un autre produit ?" : "Ajoutons votre premier produit"}
    >
      {(fieldError) => (
        <>
          {existingProduct && <p className="v-banner v-banner-success">Déjà ajouté : {existingProduct}. Vous pouvez en ajouter un autre ou continuer.</p>}
          <label className="v-field">
            Nom du produit
            <input maxLength={120} name="productName" placeholder="Ex. Robe wax Akwa" />
            {fieldError("productName") && <span className="v-field-error">{fieldError("productName")}</span>}
          </label>
          <label className="v-field">
            Prix (en FCFA)
            <input inputMode="numeric" name="productPrice" placeholder="18000" />
            <span className={fieldError("productPrice") ? "v-field-error" : "v-field-help"}>{fieldError("productPrice") ?? "Saisissez un nombre entier, sans espace ni virgule."}</span>
          </label>
          <PhotoManager error={fieldError("photos")} initialPhotos={[]} />
        </>
      )}
    </WizardStepForm>
  );
}
