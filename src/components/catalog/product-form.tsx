import { ProductAvailability, type Product, type ProductCategory, type ProductVariant } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ProductVariantsEditor } from "@/components/catalog/product-variants-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProduct, updateProduct } from "@/modules/catalog/actions";

type EditableProduct = Product & {
  variants: ProductVariant[];
  images: { url: string; altText: string | null }[];
};

type ProductFormProps = {
  categories: ProductCategory[];
  product?: EditableProduct;
  error?: string;
};

export function ProductForm({ categories, product, error }: ProductFormProps) {
  const isEdit = Boolean(product);

  return (
    <form action={isEdit ? updateProduct : createProduct} className="product-editor" encType="multipart/form-data">
      {product && <input name="productId" type="hidden" value={product.id} />}
      <div className="product-editor-header">
        <div>
          <h1 className="dashboard-heading">{isEdit ? "Modifier le produit" : "Ajouter un produit"}</h1>
          <p className="dashboard-copy">Les prix sont enregistrés en FCFA, sans centimes.</p>
        </div>
        <Link className="secondary-button" href="/dashboard/produits">
          Retour aux produits
        </Link>
      </div>

      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="surface-card product-form-card">
        {product?.images[0] && (
          <Image
            alt={product.images[0].altText ?? product.name}
            className="product-edit-image"
            height={640}
            src={product.images[0].url}
            width={640}
          />
        )}
        <label className="form-field">
          Nom du produit
          <input defaultValue={product?.name} maxLength={140} name="name" placeholder="Robe wax Akwa" required />
        </label>
        <label className="form-field">
          Référence
          <input
            defaultValue={product?.sku}
            maxLength={48}
            name="sku"
            pattern="[\p{L}\p{N}_-]+"
            placeholder="ROBE-001"
            required
          />
        </label>
        <label className="form-field">
          Description
          <textarea
            defaultValue={product?.description ?? ""}
            maxLength={4000}
            name="description"
            placeholder="Décris les détails importants de ton produit…"
            rows={4}
          />
        </label>
        <label className="form-field">
          Catégorie
          <select defaultValue={product?.categoryId ?? ""} name="categoryId">
            <option value="">Sans catégorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="product-price-grid">
          <label className="form-field">
            Prix (FCFA)
            <input
              defaultValue={product?.priceXaf}
              inputMode="numeric"
              max={1_000_000_000}
              min={1}
              name="priceXaf"
              placeholder="18 000"
              required
              type="number"
            />
          </label>
          <label className="form-field">
            Prix promotionnel (FCFA)
            <input
              defaultValue={product?.promotionalPriceXaf ?? ""}
              inputMode="numeric"
              max={1_000_000_000}
              min={1}
              name="promotionalPriceXaf"
              placeholder="Facultatif"
              type="number"
            />
          </label>
        </div>
        <label className="form-field">
          Disponibilité
          <select defaultValue={product?.availability ?? ProductAvailability.AVAILABLE} name="availability">
            <option value={ProductAvailability.AVAILABLE}>Disponible</option>
            <option value={ProductAvailability.SOLD_OUT}>Épuisé</option>
            <option value={ProductAvailability.PREORDER}>Sur commande</option>
          </select>
        </label>
        <label className="form-field">
          Photo du produit (PNG, JPG ou WebP, 2 Mo maximum)
          <input accept="image/png,image/jpeg,image/webp" name="image" type="file" />
        </label>
        <div className="product-price-grid">
          <label className="form-field form-field-checkbox">
            <input
              defaultChecked={product?.trackInventory ?? false}
              name="trackInventory"
              type="checkbox"
            />
            Je souhaite suivre mon stock
          </label>
          <label className="form-field">
            Quantité en stock
            <input
              defaultValue={product?.stockQuantity ?? ""}
              inputMode="numeric"
              max={1_000_000}
              min={0}
              name="stockQuantity"
              placeholder="Facultatif si tu ne suis pas le stock"
              type="number"
            />
          </label>
        </div>
        <label className="form-field form-field-checkbox">
          <input defaultChecked={product?.isFeatured ?? false} name="isFeatured" type="checkbox" />
          Mettre ce produit en avant
        </label>
        <ProductVariantsEditor
          initialVariants={product?.variants.map((variant) => ({
            sku: variant.sku,
            optionName: variant.optionName,
            optionValue: variant.optionValue,
            priceXaf: variant.priceXaf?.toString() ?? "",
            stockQuantity: variant.stockQuantity?.toString() ?? "",
          }))}
        />
        <SubmitButton
          className="primary-button"
          pendingLabel={isEdit ? "Enregistrement…" : "Ajout en cours…"}
        >
          {isEdit ? "Enregistrer les modifications" : "Ajouter le produit"}
        </SubmitButton>
      </section>
    </form>
  );
}
