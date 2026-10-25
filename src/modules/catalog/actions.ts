"use server";

import { Prisma, ProductAvailability } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PhotoError,
  attachedPhotoUrl,
  checkTemporaryPhotos,
  deleteProductPhoto,
  deleteProductPhotoFolder,
  maxProductPhotos,
  moveTemporaryPhotos,
} from "@/lib/product-photos";
import { hasPermission } from "@/modules/auth/permissions";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import {
  parseJsonField,
  photosSchema,
  productFormSchema,
  reservedProductSlugs,
  variantsSchema,
  type ProductVariantInput,
} from "@/modules/catalog/validation";
import { getStoreContext } from "@/modules/stores/context";
import { assertCanCreateProduct, SubscriptionLimitError } from "@/modules/subscriptions/service";

export type ActionError = { code: string; message: string; fields?: Record<string, string> };
export type ActionResult = { ok: true; message?: string } | { ok: false; error: ActionError } | null;

class CatalogProblem extends Error {
  constructor(message: string, readonly code = "INVALID", readonly fields?: Record<string, string>) {
    super(message);
  }
}

const fail = (message: string, code = "INVALID", fields?: Record<string, string>): ActionResult => ({
  ok: false,
  error: { code, message, fields },
});

async function catalogContext() {
  const context = await getStoreContext();
  if (!hasPermission(context.membership.role, "products.manage")) {
    throw new CatalogProblem("Vous n’avez pas l’autorisation de modifier le catalogue.", "FORBIDDEN");
  }
  return context;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function refreshCatalog(store: { id: string; slug: string }) {
  revalidatePath("/dashboard/produits");
  revalidatePath("/dashboard");
  revalidatePath(`/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

async function uniqueSlug(transaction: Prisma.TransactionClient, storeId: string, name: string, excludeId?: string) {
  const base = slugify(name) || "produit";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await transaction.product.findFirst({ where: { storeId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!taken && !reservedProductSlugs.has(slug)) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function generateSku(transaction: Prisma.TransactionClient, storeId: string, storeName: string) {
  const prefix = storeName.normalize("NFKD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PRD";
  const count = await transaction.product.count({ where: { storeId } });
  for (let next = count + 1; next < count + 200; next += 1) {
    const sku = `${prefix}-${String(next).padStart(3, "0")}`;
    if (!(await transaction.product.findUnique({ where: { storeId_sku: { storeId, sku } }, select: { id: true } }))) return sku;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function syncVariants(transaction: Prisma.TransactionClient, productId: string, productSku: string, variants: ProductVariantInput[]) {
  const existing = await transaction.productVariant.findMany({ where: { productId } });
  const keep = new Set<string>();
  for (const [index, variant] of variants.entries()) {
    const match = existing.find((item) => item.optionName === variant.optionName && item.optionValue === variant.optionValue);
    const sku = variant.sku || match?.sku || `${productSku}-${index + 1}`.slice(0, 48);
    const data = { sku, optionName: variant.optionName, optionValue: variant.optionValue, priceXaf: variant.priceXaf, stockQuantity: variant.stockQuantity, isArchived: false };
    if (match) {
      keep.add(match.id);
      await transaction.productVariant.update({ where: { id: match.id }, data });
    } else {
      await transaction.productVariant.create({ data: { ...data, productId } });
    }
  }
  const removed = existing.filter((item) => !keep.has(item.id) && !item.isArchived).map((item) => item.id);
  if (removed.length) {
    // Une variante retirée est archivée : l'historique des commandes qui la mentionnent reste intact.
    await transaction.productVariant.updateMany({ where: { id: { in: removed } }, data: { isArchived: true } });
  }
}

/** Création et modification d'un produit (formulaires « Ajouter un produit » et « Formulaire produit »). */
export async function saveProduct(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof catalogContext>>;
  try {
    context = await catalogContext();
  } catch (error) {
    if (error instanceof CatalogProblem) return fail(error.message, error.code);
    throw error;
  }
  const { store } = context;
  const productId = text(formData, "productId") || null;

  const parsed = productFormSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    categoryId: text(formData, "categoryId"),
    newCategory: text(formData, "newCategory"),
    priceXaf: text(formData, "priceXaf"),
    promotionalPriceXaf: text(formData, "promotionalPriceXaf"),
    sku: text(formData, "sku"),
    availability: text(formData, "availability"),
    trackInventory: formData.get("trackInventory") === "on",
    stockQuantity: formData.get("trackInventory") === "on" ? text(formData, "stockQuantity") : "",
    status: text(formData, "status"),
    isFeatured: formData.get("isFeatured") === "on",
  });
  const variants = parseJsonField(formData.get("variants"), variantsSchema, []);
  const photos = parseJsonField(formData.get("photos"), photosSchema, []);
  if (!parsed.success || !variants.success || !photos.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.success ? [] : parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    if (!variants.success) fields.variants = variants.error.issues[0]?.message ?? "Vérifiez les variantes.";
    if (!photos.success) fields.photos = photos.error.issues[0]?.message ?? "Vérifiez les photos.";
    return fail("Certaines informations sont à corriger. Vos saisies sont conservées.", "VALIDATION", fields);
  }
  const input = parsed.data;
  if (photos.data.length > maxProductPhotos) return fail("Vous avez atteint la limite de 5 photos par produit.", "PHOTO_LIMIT", { photos: "5 photos au maximum." });
  const variantKeys = variants.data.map((variant) => `${variant.optionName.toLowerCase()}=${variant.optionValue.toLowerCase()}`);
  if (new Set(variantKeys).size !== variantKeys.length) return fail("Deux variantes portent la même valeur.", "VALIDATION", { variants: "Chaque valeur de variante doit être unique." });

  const availability: ProductAvailability =
    input.trackInventory && input.stockQuantity === 0 && input.availability !== "PREORDER" ? "SOLD_OUT" : input.availability;
  const removedPhotoUrls: string[] = [];
  let savedId = productId;
  // Nouvelles photos : vérifiées avant la transaction, déplacées après (voir src/lib/product-photos.ts).
  const newPhotoKeys = photos.data.flatMap((photo) => (!photo.id && photo.key ? [photo.key] : []));

  try {
    await checkTemporaryPhotos(store.id, newPhotoKeys);
    await prisma.$transaction(async (transaction) => {
      const existing = productId
        ? await transaction.product.findFirst({
            where: { id: productId, storeId: store.id },
            select: { id: true, sku: true, updatedAt: true, status: true, images: { select: { id: true, url: true, altText: true, width: true, height: true } } },
          })
        : null;
      if (productId && !existing) throw new CatalogProblem("Ce produit est introuvable.", "NOT_FOUND");
      // Contrôle de concurrence optimiste : refuse d'écraser une modification faite entre-temps.
      if (existing && text(formData, "expectedUpdatedAt") && existing.updatedAt.toISOString() !== text(formData, "expectedUpdatedAt")) {
        throw new CatalogProblem("Ce produit a été modifié par quelqu’un d’autre pendant que vous le modifiiez. Rechargez la page pour voir la dernière version.", "CONFLICT");
      }

      let categoryId: string | null = null;
      if (input.newCategory) {
        const category = await transaction.productCategory.upsert({
          where: { storeId_name: { storeId: store.id, name: input.newCategory } },
          update: {},
          create: { storeId: store.id, name: input.newCategory, slug: slugify(input.newCategory) || `categorie-${Date.now()}`, sortOrder: await transaction.productCategory.count({ where: { storeId: store.id } }) },
          select: { id: true },
        });
        categoryId = category.id;
      } else if (input.categoryId) {
        const category = await transaction.productCategory.findFirst({ where: { id: input.categoryId, storeId: store.id }, select: { id: true } });
        if (!category) throw new CatalogProblem("Cette catégorie n’existe pas dans votre boutique.", "VALIDATION", { categoryId: "Choisissez une catégorie de la liste." });
        categoryId = category.id;
      }

      if (!existing) await assertCanCreateProduct(transaction, store.id);
      const sku = input.sku || existing?.sku || (await generateSku(transaction, store.id, store.name));
      const data = {
        name: input.name,
        description: input.description || null,
        categoryId,
        priceXaf: input.priceXaf,
        promotionalPriceXaf: input.promotionalPriceXaf,
        sku,
        availability,
        trackInventory: input.trackInventory,
        stockQuantity: input.trackInventory ? input.stockQuantity : null,
        isFeatured: input.isFeatured,
        slug: await uniqueSlug(transaction, store.id, input.name, existing?.id),
        ...(existing?.status === "ARCHIVED" ? {} : { status: input.status }),
      };
      const product = existing
        ? await transaction.product.update({ where: { id: existing.id }, data, select: { id: true } })
        : await transaction.product.create({ data: { ...data, storeId: store.id }, select: { id: true } });
      savedId = product.id;

      await syncVariants(transaction, product.id, sku, variants.data);

      // Photos : l'ordre envoyé fait foi (0 = principale). Les positions sont réécrites en bloc.
      const kept = new Map((existing?.images ?? []).map((image) => [image.id, image]));
      const rows: Prisma.ProductImageCreateManyInput[] = [];
      for (const [position, photo] of photos.data.entries()) {
        if (photo.id) {
          const image = kept.get(photo.id);
          if (!image) throw new CatalogProblem("Une photo ne correspond pas à ce produit. Rechargez la page.", "VALIDATION");
          kept.delete(photo.id);
          rows.push({ productId: product.id, url: image.url, altText: photo.alt || null, position, width: image.width, height: image.height });
        } else if (photo.key) {
          rows.push({ productId: product.id, url: attachedPhotoUrl(store.id, `products/${product.id}`, photo.key), altText: photo.alt || null, position });
        }
      }
      removedPhotoUrls.push(...[...kept.values()].map((image) => image.url));
      await transaction.productImage.deleteMany({ where: { productId: product.id } });
      if (rows.length) await transaction.productImage.createMany({ data: rows });
    });
  } catch (error) {
    if (error instanceof CatalogProblem) return fail(error.message, error.code, error.fields);
    if (error instanceof PhotoError) return fail(error.message, "PHOTO", { photos: error.message });
    if (error instanceof SubscriptionLimitError) return fail(`${error.message} Vous pouvez enregistrer ce produit plus tard ou changer d’offre.`, "QUOTA");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Cette référence est déjà utilisée par un autre produit de votre boutique.", "VALIDATION", { sku: "Référence déjà utilisée." });
    }
    throw error;
  }

  if (savedId && newPhotoKeys.length) {
    const failed = await moveTemporaryPhotos(store.id, `products/${savedId}`, newPhotoKeys);
    // Une photo qui n'a pas pu être déplacée est retirée du produit plutôt que d'afficher une image cassée.
    if (failed.length) await prisma.productImage.deleteMany({ where: { productId: savedId, url: { in: failed } } });
  }
  await Promise.all(removedPhotoUrls.map((url) => deleteProductPhoto(url)));
  refreshCatalog(store);
  redirect(`/dashboard/produits?succes=${productId ? "modifie" : "ajoute"}&produit=${savedId}`);
}

function selectedIds(formData: FormData) {
  return formData
    .getAll("productIds")
    .filter((value): value is string => typeof value === "string" && /^c[a-z0-9]{20,}$/.test(value))
    .slice(0, 200);
}

function backToList(formData: FormData, query: string): never {
  const tab = text(formData, "onglet");
  redirect(`/dashboard/produits?${tab ? `onglet=${encodeURIComponent(tab)}&` : ""}${query}`);
}

export async function archiveProducts(formData: FormData) {
  const { store } = await catalogContext().catch(() => redirect("/dashboard/produits?erreur=non-autorise"));
  const ids = selectedIds(formData);
  if (!ids.length) backToList(formData, "erreur=selection-vide");
  const result = await prisma.product.updateMany({
    where: { id: { in: ids }, storeId: store.id, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED", archivedAt: new Date(), isFeatured: false },
  });
  refreshCatalog(store);
  backToList(formData, `succes=archive&n=${result.count}`);
}

/** Action rapide de la liste : met un produit en avant sur l’accueil de la boutique, ou l’en retire. */
export async function toggleFeaturedProduct(formData: FormData) {
  const { store } = await catalogContext().catch(() => redirect("/dashboard/produits?erreur=non-autorise"));
  const productId = text(formData, "productId");
  const featured = formData.get("featured") === "1";
  const result = await prisma.product.updateMany({
    where: { id: productId, storeId: store.id, status: { not: "ARCHIVED" } },
    data: { isFeatured: featured },
  });
  refreshCatalog(store);
  backToList(formData, result.count ? `succes=${featured ? "mis-en-avant" : "retire-avant"}` : "erreur=selection-vide");
}

export async function restoreProducts(formData: FormData) {
  const { store } = await catalogContext().catch(() => redirect("/dashboard/produits?erreur=non-autorise"));
  const ids = selectedIds(formData);
  const result = await prisma.product.updateMany({
    where: { id: { in: ids }, storeId: store.id, status: "ARCHIVED" },
    data: { status: "DRAFT", archivedAt: null },
  });
  refreshCatalog(store);
  backToList(formData, `succes=restaure&n=${result.count}`);
}

/**
 * Suppression définitive réservée aux produits jamais commandés ; les autres sont archivés à la place
 * pour que l'historique reste exact (brief §6.4, maquette « Supprimer ou archiver un produit »).
 */
export async function deleteProducts(formData: FormData) {
  const { store } = await catalogContext().catch(() => redirect("/dashboard/produits?erreur=non-autorise"));
  const ids = selectedIds(formData);
  if (!ids.length) backToList(formData, "erreur=selection-vide");
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, storeId: store.id },
    select: { id: true, images: { select: { url: true } }, _count: { select: { orderItems: true } } },
  });
  const deletable = products.filter((product) => product._count.orderItems === 0);
  const ordered = products.filter((product) => product._count.orderItems > 0);

  await prisma.$transaction(async (transaction) => {
    if (deletable.length) {
      await transaction.product.deleteMany({ where: { id: { in: deletable.map(({ id }) => id) }, storeId: store.id } });
    }
    if (ordered.length) {
      await transaction.product.updateMany({
        where: { id: { in: ordered.map(({ id }) => id) }, storeId: store.id },
        data: { status: "ARCHIVED", archivedAt: new Date(), isFeatured: false },
      });
    }
  });
  await Promise.all(deletable.map((product) => deleteProductPhotoFolder(store.id, product.id)));
  await Promise.all(deletable.flatMap((product) => product.images.map((image) => deleteProductPhoto(image.url))));
  refreshCatalog(store);
  backToList(formData, `succes=supprime&n=${deletable.length}&archives=${ordered.length}`);
}

/** Copie en brouillon, sans photos ni stock (brief §6.4). */
export async function duplicateProduct(formData: FormData) {
  const { store } = await catalogContext().catch(() => redirect("/dashboard/produits?erreur=non-autorise"));
  const productId = text(formData, "productId");
  let copyId = "";
  try {
    copyId = await prisma.$transaction(async (transaction) => {
      const source = await transaction.product.findFirst({
        where: { id: productId, storeId: store.id },
        include: { variants: { where: { isArchived: false } } },
      });
      if (!source) throw new CatalogProblem("Ce produit est introuvable.");
      await assertCanCreateProduct(transaction, store.id);
      const name = `Copie de ${source.name}`.slice(0, 120);
      const sku = await generateSku(transaction, store.id, store.name);
      const copy = await transaction.product.create({
        data: {
          storeId: store.id,
          categoryId: source.categoryId,
          name,
          slug: await uniqueSlug(transaction, store.id, name),
          sku,
          description: source.description,
          priceXaf: source.priceXaf,
          promotionalPriceXaf: source.promotionalPriceXaf,
          availability: source.availability === "SOLD_OUT" ? "AVAILABLE" : source.availability,
          trackInventory: source.trackInventory,
          stockQuantity: source.trackInventory ? 0 : null,
          status: "DRAFT",
          variants: {
            create: source.variants.map((variant, index) => ({
              sku: `${sku}-${index + 1}`,
              optionName: variant.optionName,
              optionValue: variant.optionValue,
              priceXaf: variant.priceXaf,
              stockQuantity: variant.stockQuantity === null ? null : 0,
            })),
          },
        },
        select: { id: true },
      });
      return copy.id;
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) redirect(`/dashboard/produits?erreur=${encodeURIComponent(error.message)}`);
    if (error instanceof CatalogProblem) redirect(`/dashboard/produits?erreur=${encodeURIComponent(error.message)}`);
    throw error;
  }
  refreshCatalog(store);
  redirect(`/dashboard/produits/${copyId}?succes=copie`);
}
