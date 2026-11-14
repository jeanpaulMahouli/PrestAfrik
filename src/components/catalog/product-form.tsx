"use client";

import Link from "next/link";
import { MagicWand, Sparkles } from "@/components/ui/icons";
import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PhotoManager, type ExistingPhoto, type PhotoSummary } from "@/components/catalog/photo-manager";
import { AiRequestError, ProductNotices, requestAiSuggestion, type AiCreditsInfo, type AiSuggestion } from "@/components/catalog/product-assistant";
import { ProductVariantsEditor, type VariantDraft } from "@/components/catalog/product-variants-editor";
import { ListingFields, productWording, type ListingValues } from "@/components/catalog/product-universe";
import type { ShopUniverse } from "@/config/marketplace";
import type { ListingMode } from "@/modules/catalog/listing";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProduct, type ActionResult } from "@/modules/catalog/actions";
import { formatFcfa } from "@/lib/format";
import { buildProductNotices, cleanAmountInput, discountPercent, productCompletion, validAmount, type ProductSnapshot } from "@/modules/catalog/product-notices";

export type ProductFormValues = {
  id?: string;
  updatedAt?: string;
  name: string;
  description: string;
  categoryId: string;
  priceXaf: string;
  promotionalPriceXaf: string;
  sku: string;
  availability: "AVAILABLE" | "SOLD_OUT" | "PREORDER";
  trackInventory: boolean;
  stockQuantity: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  isFeatured: boolean;
  photos: ExistingPhoto[];
  optionName: string;
  variants: VariantDraft[];
  /** Univers Immobilier : vente ou location et caractéristiques du bien. */
  listing?: ListingValues;
};

type ProductFormProps = {
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  /** Carte « Zone sensible » (archivage, suppression), affichée en modification. */
  sidePanel?: ReactNode;
  /** Assistant IA disponible (clé Claude configurée sur le serveur). */
  aiEnabled?: boolean;
  /** Crédits IA restants de la boutique (null si l'assistant n'est pas disponible). */
  aiCredits?: AiCreditsInfo | null;
  /** Univers de la boutique : Shopping, Immobilier (locations), Services ou Restauration. */
  universe?: ShopUniverse;
  /** Biens immobiliers : « rent » (locations et réservations) ou « sale » (vente, dans le Shopping). */
  listingMode?: ListingMode | null;
};

const formId = "product-form";

/** Retire espaces, points et lettres pendant la saisie d'un montant (« 15 000 » devient « 15000 »). */
function cleanAmount(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const cleaned = cleanAmountInput(input.value);
  if (cleaned !== input.value) input.value = cleaned;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="v-field-error" id={id} role="alert">{message}</span> : null;
}

const initialSnapshot = (values: ProductFormValues): ProductSnapshot => ({
  name: values.name,
  description: values.description,
  categoryChosen: Boolean(values.categoryId),
  priceXaf: values.priceXaf,
  promotionalPriceXaf: values.promotionalPriceXaf,
  trackInventory: values.trackInventory,
  stockQuantity: values.stockQuantity,
  availability: values.availability,
  photoCount: values.photos.length,
  uploading: false,
});

export function ProductForm({ values, categories, sidePanel, aiEnabled = false, aiCredits = null, universe = "vente", listingMode = null }: ProductFormProps) {
  const [credits, setCredits] = useState(aiCredits);
  const words = productWording[universe];
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveProduct, null);
  const [dirty, setDirty] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  // Nouvelle catégorie proposée par l'IA (pré-remplie dans le champ « nouvelle catégorie »).
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [trackInventory, setTrackInventory] = useState(values.trackInventory);
  // Modification : saisie gardée si la page est actualisée avant l'enregistrement. Nouveau produit : le
  // formulaire s'ouvre toujours vide (rien n'est repris d'une saisie précédente).
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  // Description remplie par l'assistant IA : l'éditeur est remonté (key) avec la nouvelle valeur.
  const [descriptionValue, setDescriptionValue] = useState(values.description);
  const [descriptionKey, setDescriptionKey] = useState(0);

  // Photos, saisie en cours (pour les infos pratiques) et assistant IA.
  const [photoSummary, setPhotoSummary] = useState<PhotoSummary>({ previewUrls: values.photos.map((photo) => photo.previewUrl), uploading: false });
  const [snapshot, setSnapshot] = useState<ProductSnapshot>(() => initialSnapshot(values));
  // Nom et description remplis par l'IA : petit message sous le bouton, à relire avant d'enregistrer.
  const [aiFilled, setAiFilled] = useState(false);
  // Champs remplis par l'IA (baguette magique orange au bout du champ, retirée dès que le vendeur y touche).
  const [aiMarks, setAiMarks] = useState({ name: false, description: false });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const readForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? "");
    const categoryId = get("categoryId");
    const newCategory = get("newCategory").trim();
    const select = categoryRef.current;
    const categoryName = newCategory || (categoryId && categoryId !== "__new" && select ? (select.selectedOptions[0]?.text ?? "") : "");
    return {
      name: get("name"),
      description: get("description"),
      priceXaf: get("priceXaf"),
      promotionalPriceXaf: get("promotionalPriceXaf"),
      categoryName,
      trackInventory: data.get("trackInventory") === "on",
      stockQuantity: get("stockQuantity"),
      availability: get("availability"),
    };
  }, []);

  const refreshSnapshot = useCallback(() => {
    const current = readForm();
    if (!current) return;
    setSnapshot((previous) => ({
      ...previous,
      name: current.name,
      description: current.description,
      categoryChosen: Boolean(current.categoryName),
      priceXaf: current.priceXaf,
      promotionalPriceXaf: current.promotionalPriceXaf,
      trackInventory: current.trackInventory,
      stockQuantity: current.stockQuantity,
      availability: current.availability,
    }));
  }, [readForm]);

  // Les champs de la colonne latérale sont rattachés au formulaire par l'attribut form : on écoute tout le document.
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refreshSnapshot);
    };
    document.addEventListener("input", schedule);
    document.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("input", schedule);
      document.removeEventListener("change", schedule);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    // Après un remplissage par l'IA (champs remontés), relit la saisie.
    const timer = setTimeout(refreshSnapshot, 0);
    return () => clearTimeout(timer);
  }, [descriptionKey, creatingCategory, refreshSnapshot]);

  const onPhotosChange = useCallback((summary: PhotoSummary) => {
    setPhotoSummary(summary);
    setSnapshot((previous) => ({ ...previous, photoCount: summary.previewUrls.length, uploading: summary.uploading }));
  }, []);

  const notices = useMemo(() => buildProductNotices(snapshot), [snapshot]);
  const completion = useMemo(() => productCompletion(snapshot), [snapshot]);
  const price = validAmount(snapshot.priceXaf);
  const promoPrice = validAmount(snapshot.promotionalPriceXaf);
  const discount = discountPercent(snapshot.priceXaf, snapshot.promotionalPriceXaf);
  const outOfCredits = credits !== null && credits.total <= 0;
  const canAskAi = photoSummary.previewUrls.length > 0 && !photoSummary.uploading && !outOfCredits;

  // Un seul appel à l'IA, uniquement sur demande du vendeur (nom et description).
  async function askAi() {
    if (!canAskAi || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiFilled(false);
    try {
      const result = await requestAiSuggestion({ photos: photoSummary.previewUrls, name: nameRef.current?.value ?? "" });
      if (result.credits) setCredits(result.credits);
      // Le nom et la description vont directement dans leurs champs (le vendeur peut les modifier).
      applySuggestion({ name: result.name, description: result.description, category: result.category });
    } catch (error) {
      if (error instanceof AiRequestError && error.credits) setCredits(error.credits);
      setAiError(error instanceof Error ? error.message : "L’assistant IA n’a pas pu répondre. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  function applySuggestion(applied: AiSuggestion) {
    if (nameRef.current) nameRef.current.value = applied.name;
    setDescriptionValue(applied.description);
    setDescriptionKey((key) => key + 1);
    setAiMarks({ name: Boolean(applied.name), description: Boolean(applied.description) });
    // Catégorie : celle de la liste choisie par l'IA, sinon une nouvelle catégorie pré-remplie.
    if (applied.category) {
      const existing = categories.find((category) => category.name === applied.category);
      if (existing) {
        setCreatingCategory(false);
        setNewCategoryValue("");
        requestAnimationFrame(() => {
          if (categoryRef.current) categoryRef.current.value = existing.id;
          refreshSnapshot();
        });
      } else {
        setNewCategoryValue(applied.category);
        setCreatingCategory(true);
      }
    }
    setAiFilled(true);
    setDirty(true);
    // Amène le vendeur sur les champs remplis, sans saut brusque.
    document.getElementById("product-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus({ preventScroll: true });
  }

  useFormPersistence(formRef, values.id ? `produit:${values.id}` : null);
  useEffect(() => {
    if (values.id) return;
    try {
      // Ancienne saisie d'un nouveau produit, gardée par les versions précédentes.
      sessionStorage.removeItem("prestafrik:formulaire:produit:nouveau");
    } catch {
      // Stockage indisponible : rien à effacer.
    }
  }, [values.id]);
  const isEdit = Boolean(values.id);
  const errors = state && !state.ok ? state.error.fields ?? {} : {};
  const invalid = (name: string) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  useEffect(() => {
    if (!state || state.ok) return;
    setDirty(true);
    // Après un refus du serveur, amène le vendeur sur le premier champ à corriger.
    const first = document.querySelector<HTMLElement>(`[form="${formId}"][aria-invalid="true"], #${formId} [aria-invalid="true"]`);
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
    first?.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    if (!dirty || pending) return;
    // Évite la perte de saisie (brief §5.1).
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">{isEdit ? `Modifier : ${values.name}` : words.newTitle}</h1>
          <p className="v-page-subtitle">{isEdit ? words.editSubtitle : words.newSubtitle}</p>
        </div>
        <div className="v-page-actions product-form-top-actions">
          <Link className="btn btn-secondary" href="/dashboard/produits">Annuler</Link>
          <SubmitButton className="btn btn-primary" form={formId} loading={pending} pendingLabel="Enregistrement…">
            {isEdit ? "Enregistrer les modifications" : words.saveLabel}
          </SubmitButton>
        </div>
      </div>

      {state && !state.ok && (
        <p className="v-banner v-banner-danger" role="alert">
          {state.error.message}
          {state.error.code === "CONFLICT" && (
            <>
              {" "}
              <a href="">Recharger la page</a>
            </>
          )}
        </p>
      )}

      <div className="v-split product-form-grid">
        <form
          className="v-stack"
          id={formId}
          noValidate
          onChange={() => setDirty(true)}
          ref={formRef}
          onSubmit={(event) => {
            // Envoi manuel : contrairement à <form action>, la saisie n'est pas effacée en cas d'erreur.
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setDirty(false);
            startTransition(() => action(data));
          }}
        >
          {values.id && <input name="productId" type="hidden" value={values.id} />}
          {values.updatedAt && <input name="expectedUpdatedAt" type="hidden" value={values.updatedAt} />}

          <section className="v-card" id="product-photos">
            <PhotoManager error={errors.photos} hero initialPhotos={values.photos} onPhotosChange={onPhotosChange}>
              {aiEnabled && (
                <div className="ai-fill">
                  <button className={`btn-ai${aiLoading ? " is-loading" : ""}`} disabled={!canAskAi || aiLoading} onClick={askAi} type="button">
                    <span>
                      {aiLoading ? "L’IA analyse vos photos…" : "Remplir le nom et la description avec l’IA"}
                      {!aiLoading && credits && ` (${credits.total}/${credits.allowance + credits.bonus})`}
                    </span>
                    <Sparkles aria-hidden="true" className="btn-ai-sparkles" size={20} weight="fill" />
                  </button>
                  {credits && <AiCreditsLine credits={credits} />}
                  <span className="v-field-help">
                    {outOfCredits
                      ? "Vous pouvez remplir le nom et la description vous-même, ou demander des crédits à l’équipe PrestAfrik."
                      : canAskAi
                        ? "L’IA regarde vos photos et vous propose un nom et une description. Vous les relisez et les validez avant d’enregistrer. Chaque proposition utilise 1 crédit."
                        : photoSummary.uploading
                          ? "Patientez pendant l’envoi des photos…"
                          : "Commencez par ajouter une photo du produit."}
                  </span>
                  {aiError && <p className="v-field-error" role="alert">{aiError}</p>}
                  {aiFilled && !aiError && (
                    <p className="ai-filled" role="status">
                      Nom et description remplis par l’IA ci-dessous : relisez-les et modifiez-les si besoin avant d’enregistrer.
                    </p>
                  )}
                </div>
              )}
            </PhotoManager>
          </section>

          <section className="v-card" id="product-info">
            <h2 className="v-card-title">Informations</h2>
            <label className="v-field">
              <span className="field-label-row">
                {words.nameLabel}
                <span aria-hidden="true" className="field-counter">{snapshot.name.length}/120</span>
              </span>
              <span className={`field-with-adornment${aiMarks.name ? " has-adornment" : ""}`}>
                <input
                  defaultValue={values.name}
                  id="product-name"
                  maxLength={120}
                  name="name"
                  onInput={() => aiMarks.name && setAiMarks((marks) => ({ ...marks, name: false }))}
                  placeholder={words.namePlaceholder}
                  ref={nameRef}
                  required
                  {...invalid("name")}
                />
                {aiMarks.name && (
                  <span className="field-adornment" title="Écrit par l’IA">
                    <MagicWand aria-hidden="true" size={20} weight="fill" />
                    <span className="visually-hidden">Nom proposé par l’IA</span>
                  </span>
                )}
              </span>
              <span className="v-field-help">{words.nameHelp}</span>
              <FieldError id="name-error" message={errors.name} />
            </label>
            <RichTextEditor
              defaultValue={descriptionValue}
              key={descriptionKey}
              adornment={
                aiMarks.description ? (
                  <span title="Écrit par l’IA">
                    <MagicWand aria-hidden="true" size={20} weight="fill" />
                    <span className="visually-hidden">Description proposée par l’IA</span>
                  </span>
                ) : null
              }
              describedBy={errors.description ? "description-error" : undefined}
              onUserEdit={() => aiMarks.description && setAiMarks((marks) => ({ ...marks, description: false }))}
              help="Gras, italique, sous-titres et listes. Texte simple, sans HTML."
              invalid={Boolean(errors.description)}
              label={words.descriptionLabel}
              name="description"
              placeholder={words.descriptionPlaceholder}
            />
            <FieldError id="description-error" message={errors.description} />
            <label className="v-field">
              Catégorie
              {creatingCategory ? (
                <span className="inline-create">
                  <input autoFocus={!newCategoryValue} defaultValue={newCategoryValue} id="product-category" key={newCategoryValue} maxLength={80} name="newCategory" placeholder="Nom de la nouvelle catégorie" {...invalid("newCategory")} />
                  <button className="btn btn-secondary" onClick={() => { setCreatingCategory(false); setNewCategoryValue(""); }} type="button">Choisir dans la liste</button>
                </span>
              ) : (
                <select
                  defaultValue={values.categoryId}
                  id="product-category"
                  name="categoryId"
                  ref={categoryRef}
                  onChange={(event) => {
                    if (event.target.value === "__new") {
                      event.target.value = "";
                      setCreatingCategory(true);
                    }
                  }}
                  {...invalid("categoryId")}
                >
                  <option value="">{words.categoryPlaceholder}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                  <option value="__new">+ Créer une catégorie…</option>
                </select>
              )}
              <FieldError id="categoryId-error" message={errors.categoryId ?? errors.newCategory} />
            </label>
          </section>

          {listingMode && (
            <ListingFields errors={errors} formId={formId} mode={listingMode} values={values.listing ?? { listingType: "", pricePeriod: "", details: null }} />
          )}

          <section className="v-card">
            <h2 className="v-card-title">Prix</h2>
            <div className="field-row-3">
              <label className="v-field">
                {listingMode === "rent" ? "Loyer ou prix de la nuit (FCFA)" : listingMode === "sale" ? "Prix de vente (FCFA)" : universe === "services" ? "Prix de départ (FCFA)" : "Prix (FCFA)"}
                <input defaultValue={values.priceXaf} id="product-price" inputMode="numeric" name="priceXaf" onInput={cleanAmount} placeholder="Ex. 15000" required {...invalid("priceXaf")} />
                <span className="v-field-help">Chiffres uniquement : les espaces sont retirés automatiquement.</span>
                <FieldError id="priceXaf-error" message={errors.priceXaf} />
              </label>
              <label className="v-field">
                Prix promotionnel (facultatif)
                <input defaultValue={values.promotionalPriceXaf} inputMode="numeric" name="promotionalPriceXaf" onInput={cleanAmount} placeholder="Inférieur au prix" {...invalid("promotionalPriceXaf")} />
                <FieldError id="promotionalPriceXaf-error" message={errors.promotionalPriceXaf} />
              </label>
              <label className="v-field">
                Référence (facultative)
                <input defaultValue={values.sku} maxLength={40} name="sku" placeholder="Ex. Robe-001" {...invalid("sku")} />
                <FieldError id="sku-error" message={errors.sku} />
              </label>
            </div>
            {price && (
              <p aria-live="polite" className="price-preview">
                <span className="v-muted">Vos clients verront :</span>
                {discount !== null && promoPrice ? (
                  <>
                    <strong>{formatFcfa(promoPrice)}</strong>
                    <s>{formatFcfa(price)}</s>
                    <span className="price-preview-badge">−{discount} %</span>
                  </>
                ) : (
                  <strong>{formatFcfa(price)}</strong>
                )}
              </p>
            )}
          </section>

          {words.showVariants && (
            <section className="v-card">
              <ProductVariantsEditor error={errors.variants} initialOptionName={values.optionName} initialVariants={values.variants} />
            </section>
          )}
        </form>

        <div className="v-stack">
          <ProductNotices completion={completion} credits={aiEnabled ? credits : null} notices={notices} />

          <fieldset className="v-card v-fieldset">
            <legend className="v-card-title">Disponibilité</legend>
            {[
              ["AVAILABLE", words.availability[0]],
              ["SOLD_OUT", words.availability[1]],
              ["PREORDER", words.availability[2]],
            ].map(([value, label]) => (
              <label className="v-check v-radio" key={value}>
                <input defaultChecked={values.availability === value} form={formId} name="availability" onChange={() => setDirty(true)} type="radio" value={value} />
                {label}
              </label>
            ))}
          </fieldset>

          {words.showStock && (
            <section className="v-card">
              <h2 className="v-card-title">Stock</h2>
              <label className="v-check">
                <input checked={trackInventory} form={formId} name="trackInventory" onChange={(event) => { setTrackInventory(event.target.checked); setDirty(true); }} type="checkbox" />
                Suivre le stock
              </label>
              {trackInventory && (
                <label className="v-field stock-field">
                  Quantité en stock
                  <input defaultValue={values.stockQuantity} form={formId} inputMode="numeric" name="stockQuantity" placeholder="0" {...invalid("stockQuantity")} />
                  <span className="v-field-help">À 0, le produit passe automatiquement en « Épuisé ».</span>
                  <FieldError id="stockQuantity-error" message={errors.stockQuantity} />
                </label>
              )}
            </section>
          )}

          <section className="v-card">
            <h2 className="v-card-title">Publication</h2>
            {values.status === "ARCHIVED" ? (
              <p className="v-small v-muted">Ce produit est archivé : il n’apparaît pas dans la boutique. Restaurez-le depuis la liste des produits.</p>
            ) : (
              <label className="v-field">
                État
                <select defaultValue={values.status} form={formId} name="status">
                  <option value="ACTIVE">Actif (visible dans la boutique)</option>
                  <option value="DRAFT">Brouillon</option>
                </select>
              </label>
            )}
            <label className="v-check">
              <input defaultChecked={values.isFeatured} form={formId} name="isFeatured" type="checkbox" />
              Mettre en avant dans la boutique
            </label>
          </section>

          {sidePanel ?? (
            <section className="v-card">
              <h2 className="v-card-title">Conseils pour de belles photos</h2>
              <ul className="tips-list">
                <li>Photographiez à la lumière du jour</li>
                <li>Montrez le produit de face, puis de près</li>
                <li>Un fond simple met le produit en valeur</li>
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="v-sticky-actions product-form-bottom-actions">
        <Link className="btn btn-secondary" href="/dashboard/produits">Annuler</Link>
        <SubmitButton className="btn btn-primary" form={formId} loading={pending} pendingLabel="Enregistrement…">
          {isEdit ? "Enregistrer" : words.saveLabel}
        </SubmitButton>
      </div>
    </>
  );
}

/** Solde de crédits IA, sous le bouton de l'assistant. */
function AiCreditsLine({ credits }: { credits: AiCreditsInfo }) {
  if (credits.total <= 0) {
    const renewal = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Douala" }).format(new Date(credits.renewsAt));
    return <span className="ai-credits is-empty">Plus de crédits IA ce mois-ci : ils reviennent le {renewal}.</span>;
  }
  const plural = (count: number) => (count > 1 ? "s" : "");
  return (
    <span className="ai-credits">
      <strong>{credits.total}</strong> crédit{plural(credits.total)} IA restant{plural(credits.total)}
      {credits.bonus > 0 ? ` (dont ${credits.bonus} bonus)` : ""} · {credits.allowance} offert{plural(credits.allowance)} chaque mois
    </span>
  );
}
