"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { parseCsvRows, parseVariants, productSchema, type ProductInput } from "@/modules/catalog/validation";
import { requireStorePermission } from "@/modules/stores/context";
import {
  assertCanCreateProduct,
  SubscriptionLimitError,
} from "@/modules/subscriptions/service";

const maxImageBytes = 2 * 1024 * 1024;
const maxCsvBytes = 5 * 1024 * 1024;
const formNumber = (value: FormDataEntryValue | null) =>
  value === null || value === "" ? null : Number(value);

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

function readProductForm(formData: FormData) {
  const trackInventory = formData.get("trackInventory") === "on";
  const product = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    priceXaf: Number(formData.get("priceXaf")),
    promotionalPriceXaf: formNumber(formData.get("promotionalPriceXaf")),
    availability: formData.get("availability"),
    trackInventory,
    stockQuantity: trackInventory ? formNumber(formData.get("stockQuantity")) : null,
    isFeatured: formData.get("isFeatured") === "on",
  });

  if (!product.success) {
    throw new Error(product.error.issues[0]?.message ?? "Vérifie les informations du produit.");
  }
  return { product: product.data, variants: parseVariants(formData.get("variants")) };
}

async function saveProductImage(file: FormDataEntryValue | null, storeId: string) {
  if (file === null || (file instanceof File && file.size === 0)) return null;
  if (!(file instanceof File)) throw new Error("Le fichier image est invalide.");
  if (file.size > maxImageBytes) throw new Error("La photo ne peut pas dépasser 2 Mo.");

  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { failOn: "error", limitInputPixels: 25_000_000 });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Choisis une image PNG, JPG ou WebP.");
  }
  if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000) {
    throw new Error("L’image ne peut pas dépasser 5 000 pixels de côté.");
  }

  const imageId = randomUUID();
  const directory = join(process.cwd(), "public", "uploads", storeId);
  const filename = `${imageId}.webp`;
  const temporaryFile = join(directory, `${imageId}.tmp`);
  const finalFile = join(directory, filename);
  await mkdir(directory, { recursive: true });
  await image.rotate().webp({ quality: 82, effort: 4 }).toFile(temporaryFile);
  await rename(temporaryFile, finalFile);
  return { path: finalFile, url: `/uploads/${storeId}/${filename}` };
}

function categoryError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Un produit utilise déjà cette référence.";
  }
  return null;
}

export async function createCategory(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  const parsed = z
    .string()
    .trim()
    .min(2, "Le nom de la catégorie doit contenir au moins 2 caractères.")
    .max(80)
    .safeParse(formData.get("name"));
  if (!parsed.success) redirect(`/dashboard/produits?erreur=${encodeURIComponent(parsed.error.issues[0]?.message ?? "")}`);

  const slug = slugify(parsed.data);
  if (!slug) redirect("/dashboard/produits?erreur=Choisis%20un%20nom%20de%20cat%C3%A9gorie%20valide.");

  try {
    await prisma.productCategory.create({ data: { storeId: store.id, name: parsed.data, slug } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/dashboard/produits?erreur=${encodeURIComponent("Cette catégorie existe déjà.")}`);
    }
    throw error;
  }
  revalidatePath("/dashboard/produits");
  invalidateStorefrontCache(store.id, store.slug);
}

export async function createProduct(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");

  let productInput: ProductInput;
  let variants: ReturnType<typeof parseVariants>;
  try {
    ({ product: productInput, variants } = readProductForm(formData));
  } catch (error) {
    if (error instanceof Error) {
      redirect(`/dashboard/produits/nouveau?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  if (productInput.categoryId) {
    const category = await prisma.productCategory.findFirst({
      where: { id: productInput.categoryId, storeId: store.id },
      select: { id: true },
    });
    if (!category) redirect("/dashboard/produits/nouveau?erreur=Cat%C3%A9gorie%20introuvable.");
  }

  const uniqueSkus = new Set([productInput.sku.toLowerCase(), ...variants.map(({ sku }) => sku.toLowerCase())]);
  if (uniqueSkus.size !== variants.length + 1) {
    redirect("/dashboard/produits/nouveau?erreur=Les%20r%C3%A9f%C3%A9rences%20des%20variantes%20doivent%20%C3%AAtre%20uniques.");
  }

  let image;
  try {
    image = await saveProductImage(formData.get("image"), store.id);
  } catch (error) {
    if (error instanceof Error) {
      redirect(`/dashboard/produits/nouveau?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  const slug = slugify(productInput.name);
  if (!slug) {
    if (image) await unlink(image.path);
    redirect("/dashboard/produits/nouveau?erreur=Le%20nom%20du%20produit%20doit%20contenir%20des%20lettres%20ou%20des%20chiffres.");
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await assertCanCreateProduct(transaction, store.id);
      await transaction.product.create({
        data: {
          ...productInput,
          storeId: store.id,
          slug,
          stockQuantity: productInput.trackInventory ? productInput.stockQuantity : null,
          variants: variants.length ? { create: variants } : undefined,
          images: image ? { create: { url: image.url, altText: productInput.name } } : undefined,
        },
      });
    });
  } catch (error) {
    if (image) await unlink(image.path);
    if (error instanceof SubscriptionLimitError) {
      redirect(`/dashboard/produits/nouveau?erreur=abonnement&raison=${encodeURIComponent(error.message)}`);
    }
    const message = categoryError(error);
    if (message) redirect(`/dashboard/produits/nouveau?erreur=${encodeURIComponent(message)}`);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect("/dashboard/produits/nouveau?erreur=Cat%C3%A9gorie%20introuvable.");
    }
    throw error;
  }

  revalidatePath("/dashboard/produits");
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/produits?succes=produit");
}

export async function updateProduct(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  const productId = z.cuid().safeParse(formData.get("productId"));
  if (!productId.success) throw new Error("Produit introuvable.");

  const existing = await prisma.product.findFirst({
    where: { id: productId.data, storeId: store.id, isArchived: false },
  });
  if (!existing) throw new Error("Produit introuvable.");

  let productInput: ProductInput;
  let variants: ReturnType<typeof parseVariants>;
  try {
    ({ product: productInput, variants } = readProductForm(formData));
  } catch (error) {
    if (error instanceof Error) {
      redirect(`/dashboard/produits/${existing.id}?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  if (
    existing.trackInventory &&
    productInput.trackInventory &&
    productInput.stockQuantity !== null &&
    productInput.stockQuantity < existing.reservedQuantity
  ) {
    redirect(`/dashboard/produits/${existing.id}?erreur=Ce%20stock%20est%20d%C3%A9j%C3%A0%20r%C3%A9serv%C3%A9%20pour%20des%20commandes.`);
  }

  const category = productInput.categoryId
    ? await prisma.productCategory.findFirst({
        where: { id: productInput.categoryId, storeId: store.id },
        select: { id: true },
      })
    : null;
  if (productInput.categoryId && !category) {
    redirect(`/dashboard/produits/${existing.id}?erreur=Cat%C3%A9gorie%20introuvable.`);
  }

  let image;
  try {
    image = await saveProductImage(formData.get("image"), store.id);
  } catch (error) {
    if (error instanceof Error) {
      redirect(`/dashboard/produits/${existing.id}?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: existing.id },
        data: {
          ...productInput,
          categoryId: category?.id ?? null,
          slug: slugify(productInput.name),
          stockQuantity: productInput.trackInventory ? productInput.stockQuantity : null,
          images: image
            ? { create: { url: image.url, altText: productInput.name } }
            : undefined,
        },
      });
      await transaction.productVariant.updateMany({
        where: { productId: existing.id },
        data: { isArchived: true },
      });
      if (variants.length) {
        await transaction.productVariant.createMany({
          data: variants.map((variant) => ({ ...variant, productId: existing.id })),
        });
      }
    });
  } catch (error) {
    if (image) await unlink(image.path);
    const message = categoryError(error);
    if (message) redirect(`/dashboard/produits/${existing.id}?erreur=${encodeURIComponent(message)}`);
    throw error;
  }

  revalidatePath("/dashboard/produits");
  revalidatePath(`/dashboard/produits/${existing.id}`);
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/produits?succes=produit");
}

export async function archiveProduct(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  const productId = z.cuid().safeParse(formData.get("productId"));
  if (!productId.success) throw new Error("Produit introuvable.");

  const result = await prisma.product.updateMany({
    where: {
      id: productId.data,
      storeId: store.id,
      isArchived: false,
      reservations: { none: { releasedAt: null, expiresAt: { gt: new Date() } } },
    },
    data: { isArchived: true },
  });
  if (result.count === 0) {
    throw new Error("Ce produit a déjà été archivé ou est réservé dans une commande en cours.");
  }

  revalidatePath("/dashboard/produits");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

export async function importProductsCsv(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxCsvBytes) {
    redirect("/dashboard/produits?erreur=Choisis%20un%20fichier%20CSV%20de%205%20Mo%20maximum.");
  }

  let parsedCsv: ReturnType<typeof parseCsvRows>;
  try {
    parsedCsv = parseCsvRows(await file.text());
  } catch (error) {
    redirect(`/dashboard/produits?erreur=${encodeURIComponent(error instanceof Error ? error.message : "Fichier CSV invalide.")}`);
  }

  const requiredHeaders = ["name", "sku", "pricexaf"];
  if (requiredHeaders.some((header) => !parsedCsv.headers.includes(header))) {
    redirect("/dashboard/produits?erreur=Le%20CSV%20doit%20contenir%20les%20colonnes%20name%2Csku%2CpriceXaf.");
  }

  const categories = await prisma.productCategory.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true },
  });
  const categoryByName = new Map(categories.map((category) => [category.name.toLocaleLowerCase("fr-FR"), category.id]));
  const errors: string[] = [];
  const products: { storeId: string; name: string; slug: string; sku: string; description?: string; priceXaf: number; categoryId?: string }[] = [];

  for (const [index, row] of parsedCsv.rows.entries()) {
    const values = Object.fromEntries(parsedCsv.headers.map((header, column) => [header, row[column] ?? ""]));
    const parsedProduct = productSchema.safeParse({
      name: values.name,
      sku: values.sku,
      description: values.description || undefined,
      priceXaf: Number(values.pricexaf),
      promotionalPriceXaf: values.promotionalpricexaf ? Number(values.promotionalpricexaf) : null,
      availability: values.availability || "AVAILABLE",
      trackInventory: values.trackinventory === "true",
      stockQuantity: values.trackinventory === "true" ? Number(values.stockquantity) : null,
      isFeatured: false,
    });

    if (!parsedProduct.success) {
      errors.push(`Ligne ${index + 2} : ${parsedProduct.error.issues[0]?.message ?? "données invalides"}`);
      continue;
    }
    const categoryId = values.category
      ? categoryByName.get(values.category.toLocaleLowerCase("fr-FR"))
      : undefined;
    if (values.category && !categoryId) {
      errors.push(`Ligne ${index + 2} : catégorie « ${values.category} » inconnue.`);
      continue;
    }

    products.push({
      storeId: store.id,
      name: parsedProduct.data.name,
      slug: slugify(parsedProduct.data.name),
      sku: parsedProduct.data.sku,
      description: parsedProduct.data.description,
      priceXaf: parsedProduct.data.priceXaf,
      categoryId,
    });
  }

  const duplicateSkus = products.filter(
    (product, index) =>
      products.findIndex(({ sku }) => sku.toLocaleLowerCase("fr-FR") === product.sku.toLocaleLowerCase("fr-FR")) !== index,
  );
  for (const duplicate of duplicateSkus) errors.push(`Référence répétée : ${duplicate.sku}.`);
  const rejectedSkus = new Set(duplicateSkus.map(({ sku }) => sku.toLocaleLowerCase("fr-FR")));
  const importable = products.filter(({ sku }) => !rejectedSkus.has(sku.toLocaleLowerCase("fr-FR")));
  if (errors.length) {
    redirect(`/dashboard/produits?erreur=${encodeURIComponent(`Import interrompu : ${errors.slice(0, 3).join(" ")}`)}`);
  }
  if (importable.length === 0) redirect("/dashboard/produits?erreur=Aucun%20produit%20%C3%A0%20importer.");

  try {
    await prisma.product.createMany({ data: importable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/dashboard/produits?erreur=Le%20CSV%20contient%20une%20r%C3%A9f%C3%A9rence%20ou%20un%20nom%20d%C3%A9j%C3%A0%20utilis%C3%A9.");
    }
    throw error;
  }

  revalidatePath("/dashboard/produits");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`/dashboard/produits?succes=import-${importable.length}`);
}
