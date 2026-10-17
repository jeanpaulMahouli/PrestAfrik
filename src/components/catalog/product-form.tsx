"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { PhotoManager, type ExistingPhoto } from "@/components/catalog/photo-manager";
import { ProductVariantsEditor, type VariantDraft } from "@/components/catalog/product-variants-editor";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProduct, type ActionResult } from "@/modules/catalog/actions";

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
};

type ProductFormProps = {
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  /** Carte « Zone sensible » (archivage, suppression), affichée en modification. */
  sidePanel?: ReactNode;
};

const formId = "product-form";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="v-field-error" id={id} role="alert">{message}</span> : null;
}

export function ProductForm({ values, categories, sidePanel }: ProductFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveProduct, null);
  const [dirty, setDirty] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [trackInventory, setTrackInventory] = useState(values.trackInventory);
  // Saisie gardée si la page est actualisée avant l'enregistrement.
  const formRef = useRef<HTMLFormElement>(null);
  useFormPersistence(formRef, `produit:${values.id ?? "nouveau"}`);
  const isEdit = Boolean(values.id);
  const errors = state && !state.ok ? state.error.fields ?? {} : {};
  const invalid = (name: string) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  useEffect(() => {
    if (state && !state.ok) setDirty(true);
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
          <h1 className="v-page-title">{isEdit ? `Modifier : ${values.name}` : "Ajouter un produit"}</h1>
          <p className="v-page-subtitle">
            {isEdit
              ? "Modifiez les informations de ce produit. Vos clients verront les changements dès l’enregistrement."
              : "Renseignez les informations de votre produit et ajoutez jusqu’à 5 photos. Vous pourrez tout modifier plus tard."}
          </p>
        </div>
        <div className="v-page-actions product-form-top-actions">
          <Link className="btn btn-secondary" href="/dashboard/produits">Annuler</Link>
          <SubmitButton className="btn btn-primary" form={formId} loading={pending} pendingLabel="Enregistrement…">
            {isEdit ? "Enregistrer les modifications" : "Enregistrer le produit"}
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

          <section className="v-card">
            <h2 className="v-card-title">Informations</h2>
            <label className="v-field">
              Nom du produit
              <input defaultValue={values.name} maxLength={120} name="name" placeholder="Ex. Robe wax Akwa" required {...invalid("name")} />
              <FieldError id="name-error" message={errors.name} />
            </label>
            <RichTextEditor
              defaultValue={values.description}
              describedBy={errors.description ? "description-error" : undefined}
              help="Gras, italique, sous-titres et listes. Texte simple, sans HTML."
              invalid={Boolean(errors.description)}
              label="Description (facultative)"
              name="description"
              placeholder="Décrivez votre produit en quelques mots"
            />
            <FieldError id="description-error" message={errors.description} />
            <label className="v-field">
              Catégorie
              {creatingCategory ? (
                <span className="inline-create">
                  <input autoFocus maxLength={80} name="newCategory" placeholder="Nom de la nouvelle catégorie" {...invalid("newCategory")} />
                  <button className="btn btn-secondary" onClick={() => setCreatingCategory(false)} type="button">Choisir dans la liste</button>
                </span>
              ) : (
                <select
                  defaultValue={values.categoryId}
                  name="categoryId"
                  onChange={(event) => {
                    if (event.target.value === "__new") {
                      event.target.value = "";
                      setCreatingCategory(true);
                    }
                  }}
                  {...invalid("categoryId")}
                >
                  <option value="">Choisir ou créer une catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                  <option value="__new">+ Créer une catégorie…</option>
                </select>
              )}
              <FieldError id="categoryId-error" message={errors.categoryId ?? errors.newCategory} />
            </label>
          </section>

          <section className="v-card">
            <PhotoManager error={errors.photos} initialPhotos={values.photos} />
          </section>

          <section className="v-card">
            <h2 className="v-card-title">Prix</h2>
            <div className="field-row-3">
              <label className="v-field">
                Prix (FCFA)
                <input defaultValue={values.priceXaf} inputMode="numeric" name="priceXaf" placeholder="0" required {...invalid("priceXaf")} />
                <span className="v-field-help">Nombre entier, sans espace.</span>
                <FieldError id="priceXaf-error" message={errors.priceXaf} />
              </label>
              <label className="v-field">
                Prix promotionnel (facultatif)
                <input defaultValue={values.promotionalPriceXaf} inputMode="numeric" name="promotionalPriceXaf" placeholder="Doit être inférieur au prix" {...invalid("promotionalPriceXaf")} />
                <FieldError id="promotionalPriceXaf-error" message={errors.promotionalPriceXaf} />
              </label>
              <label className="v-field">
                Référence (facultative)
                <input defaultValue={values.sku} maxLength={40} name="sku" placeholder="Ex. Robe-001" {...invalid("sku")} />
                <FieldError id="sku-error" message={errors.sku} />
              </label>
            </div>
          </section>

          <section className="v-card">
            <ProductVariantsEditor error={errors.variants} initialOptionName={values.optionName} initialVariants={values.variants} />
          </section>
        </form>

        <div className="v-stack">
          <fieldset className="v-card v-fieldset">
            <legend className="v-card-title">Disponibilité</legend>
            {[
              ["AVAILABLE", "Disponible"],
              ["SOLD_OUT", "Épuisé"],
              ["PREORDER", "Sur commande"],
            ].map(([value, label]) => (
              <label className="v-check v-radio" key={value}>
                <input defaultChecked={values.availability === value} form={formId} name="availability" onChange={() => setDirty(true)} type="radio" value={value} />
                {label}
              </label>
            ))}
          </fieldset>

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
          {isEdit ? "Enregistrer" : "Enregistrer le produit"}
        </SubmitButton>
      </div>
    </>
  );
}
