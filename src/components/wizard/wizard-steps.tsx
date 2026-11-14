"use client";

import { useEffect, useRef, useState } from "react";
import { shopUniverseKeys, shopUniverses, universeFromDb, type DbUniverse, type ShopUniverse } from "@/config/marketplace";
import { wizardWording } from "./wizard-universe";
import { PhotoManager } from "@/components/catalog/photo-manager";
import { PhoneInput } from "@/components/ui/phone-input";
import { colorReadability } from "@/lib/contrast";
import { paletteFromImage } from "@/lib/logo-palette";
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
import { CheckIcon, Sparkles } from "@/components/ui/icons";

const back = (draftId: string | null, step: number) => (draftId ? `/boutiques/nouvelle?brouillon=${draftId}&etape=${step}` : undefined);

/* ---------- 1. Nom ---------- */

type SlugStatus = { state: "idle" | "checking" | "ok" | "error"; message?: string; suggestions: string[] };

export function NameStep({
  draftId,
  initialName,
  initialSlug,
  city,
  address,
}: {
  draftId: string | null;
  initialName: string;
  initialSlug: string;
  city: string | null;
  /** Forme de l'adresse (storeAddressFormat) : « prestafrik.com/ » devant, ou « .prestafrik.com » derrière. */
  address: { prefix: string; suffix: string };
}) {
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
      const query = new URLSearchParams({ slug, nom: name || slug, ...(city ? { ville: city } : {}) });
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
  }, [slug, name, city]);

  return (
    <WizardStepForm action={saveNameStep} draftId={draftId} step={1} subtitle="C’est le nom que vos clients verront en premier. Pas d’inquiétude : vous pourrez le modifier plus tard. Votre boutique ne sera créée qu’à la dernière étape." title="Comment s’appelle votre boutique ?">
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
            <span className={`wizard-slug${address.suffix ? " wizard-slug--sub" : ""} ${status.state === "ok" ? "is-valid" : status.state === "error" ? "is-invalid" : ""}`}>
              {address.prefix && <span className="wizard-slug-prefix">{address.prefix}</span>}
              <span className="wizard-slug-grow" data-value={slug || (address.suffix ? "votre-boutique" : "")}>
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
                  placeholder={address.suffix ? "votre-boutique" : undefined}
                  // Largeur minimale d'un caractère : le champ suit son texte (voir .wizard-slug-grow).
                  size={address.suffix ? 1 : undefined}
                  spellCheck={false}
                  value={slug}
                />
              </span>
              {address.suffix && <span className="wizard-slug-suffix">{address.suffix}</span>}
              {status.state === "ok" && <CheckIcon />}
            </span>
            <span aria-live="polite" className={status.state === "error" || fieldError("slug") ? "v-field-error" : status.state === "ok" ? "wizard-success" : "v-field-help"} id="slug-status">
              {fieldError("slug") ??
                (status.state === "checking"
                  ? "Vérification de la disponibilité…"
                  : status.state === "ok"
                    ? `Bonne nouvelle : cette adresse est disponible ! Votre boutique sera visible sur ${address.prefix}${slug}${address.suffix}.`
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

export function ActivityStep({
  draftId,
  activities,
  initialId,
  initialOther,
  initialDescription,
}: {
  draftId: string;
  activities: { id: string; slug: string; label: string; popular: boolean; universe: DbUniverse }[];
  initialId: string;
  initialOther: string;
  initialDescription: string;
}) {
  const { update } = useWizardPreview();
  const [description, setDescription] = useState(initialDescription);
  const [activityId, setActivityId] = useState(initialId);
  const [other, setOther] = useState(initialOther);
  const [freeText, setFreeText] = useState(!initialId && Boolean(initialOther));
  // Univers (Boutique, Immobilier, Services, Restauration) : il adapte les textes et la liste des activités.
  const [universe, setUniverse] = useState<ShopUniverse>(universeFromDb(activities.find((activity) => activity.id === initialId)?.universe));
  const words = wizardWording[universe];
  const listed = activities.filter((activity) => universeFromDb(activity.universe) === universe);
  const choose = (id: string) => {
    setActivityId(id);
    update({ activity: activities.find((activity) => activity.id === id)?.label ?? "" });
  };
  const chooseUniverse = (next: ShopUniverse) => {
    setUniverse(next);
    setFreeText(false);
    const inUniverse = activities.filter((activity) => universeFromDb(activity.universe) === next);
    // Une seule activité dans l'univers : choisie d'office.
    if (inUniverse.length === 1) choose(inUniverse[0].id);
    else if (!inUniverse.some((activity) => activity.id === activityId)) {
      setActivityId("");
      update({ activity: "" });
    }
  };

  return (
    <WizardStepForm action={saveActivityStep} backHref={back(draftId, 1)} draftId={draftId} step={2} subtitle={words.activitySubtitle} title={words.activityTitle}>
      {(fieldError) => (
        <>
          {/* Listes déroulantes du navigateur (natives), comme demandé pour toute la création de boutique. */}
          <label className="v-field">
            Que proposez-vous ?
            <select className="wizard-native-select" onChange={(event) => chooseUniverse(event.target.value as ShopUniverse)} value={universe}>
              {shopUniverseKeys.map((key) => (
                <option key={key} value={key}>
                  {shopUniverses[key].label} — {shopUniverses[key].text}
                </option>
              ))}
            </select>
          </label>
          {listed.length === 1 ? (
            <input name="activityId" type="hidden" value={listed[0].id} />
          ) : !freeText ? (
            <label className="v-field">
              Votre activité principale
              <select
                aria-invalid={Boolean(fieldError("activityId")) || undefined}
                className="wizard-native-select"
                name="activityId"
                onChange={(event) => {
                  if (event.target.value === "__autre") {
                    setFreeText(true);
                    setActivityId("");
                    update({ activity: other });
                  } else choose(event.target.value);
                }}
                value={activityId}
              >
                <option disabled value="">
                  Choisir une activité
                </option>
                {listed.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.label}
                  </option>
                ))}
                <option value="__autre">Mon activité n’est pas dans la liste</option>
              </select>
              {fieldError("activityId") && <span className="v-field-error">{fieldError("activityId")}</span>}
            </label>
          ) : (
            <label className="v-field">
              Votre activité
              <input autoFocus maxLength={80} name="activityOther" onChange={(event) => { setOther(event.target.value); update({ activity: event.target.value }); }} placeholder="Ex. Vente de pagnes" value={other} />
              {fieldError("activityOther") && <span className="v-field-error">{fieldError("activityOther")}</span>}
              <button className="v-link-button" onClick={() => setFreeText(false)} type="button">Choisir dans la liste</button>
            </label>
          )}
          <label className="v-field">
            <span>
              Description de la boutique <span className="wizard-optional">(facultatif)</span>
            </span>
            <textarea
              aria-describedby="wizard-description-help"
              aria-invalid={Boolean(fieldError("description")) || undefined}
              maxLength={2000}
              name="description"
              onChange={(event) => {
                setDescription(event.target.value);
                update({ description: event.target.value });
              }}
              placeholder={words.descriptionPlaceholder}
              rows={3}
              value={description}
            />
            <span className={fieldError("description") ? "v-field-error" : "v-field-help"} id="wizard-description-help">
              {fieldError("description") ?? `${words.descriptionHelp} Elle s’affiche en haut de votre boutique. ${description.length} / 2000`}
            </span>
          </label>
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 3. Localisation ---------- */

type GeoRegion = { code: string; name: string; cities: string[] };

/** Pays et ville (listes natives) ; la région est retrouvée à partir de la ville, sans la demander. */
export function LocationStep({ draftId, countries, geo, initial }: { draftId: string; countries: { iso: string; name: string }[]; geo: Record<string, GeoRegion[]>; initial: { country: string; region: string; city: string; neighborhood: string } }) {
  const { update } = useWizardPreview();
  const [country, setCountry] = useState(() => (countries.some((item) => item.iso === initial.country) ? initial.country : (countries[0]?.iso ?? "CM")));
  const regions = geo[country] ?? [];
  const known = (value: string) => regions.some((item) => item.cities.includes(value));
  const [city, setCity] = useState(() => (known(initial.city) ? initial.city : ""));
  const countryName = countries.find((item) => item.iso === country)?.name ?? country;

  useEffect(() => {
    update({ location: city ? `${city}, ${countryName}` : countryName });
    // L'aperçu suit la ville et le pays choisis.
  }, [city, countryName]);

  return (
    <WizardStepForm action={saveLocationStep} backHref={back(draftId, 2)} draftId={draftId} step={3} subtitle="Choisissez votre ville dans la liste : elle nous permet de proposer les bonnes zones de livraison." title="Où se trouve votre boutique ?">
      {(fieldError) => (
        <>
          {countries.length > 1 ? (
            <label className="v-field">
              Pays
              <select
                className="wizard-native-select"
                name="country"
                onChange={(event) => {
                  setCountry(event.target.value);
                  setCity("");
                }}
                value={country}
              >
                {countries.map((item) => (
                  <option key={item.iso} value={item.iso}>
                    {item.name}
                  </option>
                ))}
              </select>
              {fieldError("country") && <span className="v-field-error">{fieldError("country")}</span>}
            </label>
          ) : (
            <input name="country" type="hidden" value={country} />
          )}
          <label className="v-field">
            Ville
            <select aria-invalid={Boolean(fieldError("city")) || undefined} className="wizard-native-select" name="city" onChange={(event) => setCity(event.target.value)} value={city}>
              <option disabled value="">
                Choisir une ville
              </option>
              {regions.map((region) => (
                <optgroup key={region.code} label={region.name}>
                  {region.cities.map((item) => (
                    <option key={`${region.code}-${item}`} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldError("city") && <span className="v-field-error">{fieldError("city")}</span>}
          </label>
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

export function ContactStep({ draftId, phone, whatsapp, contactEmail }: { draftId: string; phone: { country: string; national: string }; whatsapp: { country: string; national: string } | null; contactEmail: string }) {
  const [same, setSame] = useState(!whatsapp || (whatsapp.country === phone.country && whatsapp.national === phone.national));
  return (
    <WizardStepForm action={saveContactStep} backHref={back(draftId, 3)} draftId={draftId} step={4} subtitle="Ces coordonnées s’affichent dans votre boutique. L’indicatif du pays est séparé du numéro : saisissez simplement votre numéro, nous ajoutons l’indicatif." title="Comment vos clients peuvent-ils vous joindre ?">
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
  { id: "BOUTIQUE_MARQUE", name: "Galerie", detail: "Grandes photos bord à bord, angles droits, deux produits par ligne" },
  { id: "GRAND_MARCHE", name: "Grand marché", detail: "Style supermarché en ligne : en-tête coloré, cartes compactes, prix bien visibles" },
] as const;

export function ThemeStep({ draftId, initialTheme }: { draftId: string; initialTheme: (typeof themes)[number]["id"] }) {
  const { update } = useWizardPreview();
  const [theme, setTheme] = useState(initialTheme);
  return (
    <WizardStepForm action={saveThemeStep} backHref={back(draftId, 5)} draftId={draftId} step={6} subtitle="Les quatre thèmes offrent exactement les mêmes fonctions. Seule la mise en page change. Vous pourrez en changer plus tard sans perdre vos produits ni vos commandes." title="Choisissez le style de votre boutique">
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

/* ---------- 5. Logo et couleurs ---------- */

const defaults = { primaryColor: "#FF9900", secondaryColor: "#000026", accentColor: "#EF765E" };

export function BrandingStep({ draftId, initial }: { draftId: string; initial: { primaryColor: string; secondaryColor: string; accentColor: string; logoUrl: string | null; initials: string } }) {
  const { update } = useWizardPreview();
  const [colors, setColors] = useState({ primaryColor: initial.primaryColor, secondaryColor: initial.secondaryColor, accentColor: initial.accentColor });
  const [logo, setLogo] = useState<string | null>(initial.logoUrl);
  const [logoError, setLogoError] = useState("");
  const [paletteNote, setPaletteNote] = useState(false);
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
    // Pipette : les couleurs de la boutique sont reprises du logo (modifiables ensuite).
    void paletteFromImage(url).then((palette) => {
      if (!palette) return;
      setColors(palette);
      update(palette);
      setPaletteNote(true);
    });
  };

  return (
    <WizardStepForm action={saveBrandingStep} backHref={back(draftId, 3)} draftId={draftId} step={5} subtitle="Ajoutez votre logo et, si vous le souhaitez, vos couleurs. Nous vérifions que vos textes restent bien lisibles." title="Votre logo et vos couleurs">
      {(fieldError) => (
        <>
          <p className="wizard-label">Logo de votre boutique</p>
          <div className="logo-row">
            <span className="logo-preview">{logo ? <img alt="Aperçu du logo" src={logo} /> : <span aria-hidden="true">{initial.initials}</span>}</span>
            {/* Un simple bouton à côté du logo (plus de zone « glisser-déposer »). */}
            <label className="btn btn-secondary logo-add-button">
              {logo ? "Changer le logo" : "Ajouter le logo"}
              <input accept="image/png,image/jpeg,image/webp" className="visually-hidden" name="logo" onChange={(event) => chooseLogo(event.currentTarget.files?.[0])} ref={input} type="file" />
            </label>
          </div>
          <p className="v-field-help">PNG ou JPG, 2 Mo maximum. Sans logo, vos initiales sont affichées.</p>
          {(logoError || fieldError("logo")) && <p className="v-field-error">{logoError || fieldError("logo")}</p>}
          <p className="wizard-label">Couleurs</p>
          {paletteNote && (
            <p className="v-field-help" role="status">
              Couleurs reprises de votre logo : vous pouvez les ajuster.
            </p>
          )}
          <ul className="color-list">
            {(
              [
                ["primaryColor", "Couleur des boutons"],
                ["secondaryColor", "Couleur des bandeaux"],
                ["accentColor", "Couleur des badges (promotions, panier)"],
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
            Revenir aux couleurs par défaut
          </button>
        </>
      )}
    </WizardStepForm>
  );
}

/* ---------- 7. Premier produit ---------- */

type DraftProduct = { name: string; priceXaf: number; description: string; photos: { key: string; previewUrl: string; alt: string }[] } | null;

/**
 * Premier produit : on commence par la photo (glisser-déposer comme dans le tableau de bord), puis l'IA
 * peut remplir le nom et la description (crédits IA du mois, déduits à la création de la boutique).
 */
export function ProductStep({
  draftId,
  product,
  universe = "vente",
  ai = null,
}: {
  draftId: string;
  product: DraftProduct;
  universe?: ShopUniverse;
  /** Assistant IA activé (offert pendant la création) : essais restants. */
  ai?: { remaining: number } | null;
}) {
  const words = wizardWording[universe];
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [remaining, setRemaining] = useState(ai?.remaining ?? 0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const canAskAi = Boolean(ai) && remaining > 0 && photoUrls.length > 0 && !uploading && !aiLoading;

  async function askAi() {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch(`/api/boutiques/brouillon/ia?brouillon=${encodeURIComponent(draftId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photoUrls, name }),
      });
      const body = (await response.json().catch(() => null)) as { name?: string; description?: string; remaining?: number; error?: string } | null;
      if (typeof body?.remaining === "number") setRemaining(body.remaining);
      if (!response.ok || !body?.name) {
        setAiError(body?.error ?? "L’IA n’a pas pu répondre. Réessayez dans un instant.");
        return;
      }
      setName(body.name);
      setDescription(body.description ?? "");
      setAiFilled(true);
    } catch {
      setAiError("Connexion interrompue. Vérifiez votre réseau, puis réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <WizardStepForm
      action={saveProductStep}
      backHref={back(draftId, 5)}
      draftId={draftId}
      skipLink="Passer cette étape"
      step={7}
      subtitle={words.productSubtitle}
      title={words.productTitle}
    >
      {(fieldError) => (
        <>
          {ai && (
            <p className="wizard-ai-note">
              <Sparkles aria-hidden="true" size={18} />
              <span>Ajoutez une photo : l’IA peut écrire le nom et la description pour vous.</span>
            </p>
          )}
          <PhotoManager
            error={fieldError("photos")}
            hero
            initialPhotos={(product?.photos ?? []).map((photo) => ({ id: photo.key, previewUrl: photo.previewUrl, alt: photo.alt }))}
            onPhotosChange={(summary) => {
              setPhotoUrls(summary.previewUrls);
              setUploading(summary.uploading);
            }}
            uploadUrl={`/api/boutiques/brouillon/photos?brouillon=${draftId}`}
          >
            {ai && (
              <div className="ai-fill">
                <button className={`btn-ai${aiLoading ? " is-loading" : ""}`} disabled={!canAskAi} onClick={askAi} type="button">
                  <span>{aiLoading ? "L’IA analyse vos photos…" : "Remplir le nom et la description avec l’IA"}</span>
                  <Sparkles aria-hidden="true" className="btn-ai-sparkles" size={20} />
                </button>
                <span className="v-field-help">
                  {remaining <= 0
                    ? "Remplissez le nom et la description vous-même : vous pourrez réutiliser l’IA depuis votre tableau de bord."
                    : uploading
                      ? "Patientez pendant l’envoi des photos…"
                      : photoUrls.length
                        ? "Vous relisez et modifiez le texte avant de continuer."
                        : "Commencez par ajouter une photo du produit."}
                </span>
                {aiError && <p className="v-field-error" role="alert">{aiError}</p>}
                {aiFilled && !aiError && (
                  <p className="ai-filled" role="status">
                    Nom et description remplis par l’IA : relisez-les et modifiez-les si besoin.
                  </p>
                )}
              </div>
            )}
          </PhotoManager>
          <label className="v-field">
            {words.productName}
            <input maxLength={120} name="productName" onChange={(event) => setName(event.target.value)} placeholder={words.productPlaceholder} value={name} />
            {fieldError("productName") && <span className="v-field-error">{fieldError("productName")}</span>}
          </label>
          <label className="v-field">
            {words.priceLabel}
            <input defaultValue={product ? String(product.priceXaf) : ""} inputMode="numeric" name="productPrice" placeholder={words.pricePlaceholder} />
            <span className={fieldError("productPrice") ? "v-field-error" : "v-field-help"}>{fieldError("productPrice") ?? "Saisissez un nombre entier, sans espace ni virgule."}</span>
          </label>
          <label className="v-field">
            <span>
              Description <span className="wizard-optional">(facultatif)</span>
            </span>
            <textarea maxLength={2000} name="productDescription" onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
            {fieldError("productDescription") && <span className="v-field-error">{fieldError("productDescription")}</span>}
          </label>
        </>
      )}
    </WizardStepForm>
  );
}
