"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { analyzeProductCsv, maxImportBytes, type ImportAnalysis } from "@/modules/catalog/import";
import { getStoreContext } from "@/modules/stores/context";
import { getSubscriptionAccessForTransaction } from "@/modules/subscriptions/service";

export type ImportState =
  | null
  | { step: "error"; message: string }
  | { step: "preview"; fileName: string; fileSize: number; analysis: ImportAnalysis; existingSkus: string[] }
  | { step: "done"; created: number; updated: number; skipped: number };

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);

/**
 * Étape 2 (aperçu) puis 3 (confirmation). Le fichier est renvoyé à la confirmation et revérifié :
 * rien n'est enregistré tant que le vendeur n'a pas confirmé.
 */
export async function importProducts(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const { store, membership } = await getStoreContext();
  if (!hasPermission(membership.role, "products.manage")) {
    return { step: "error", message: "Vous n’avez pas l’autorisation de modifier le catalogue." };
  }
  if (formData.get("mode") === "reset") return null;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { step: "error", message: "Choisissez un fichier CSV." };
  if (file.size > maxImportBytes)
    return { step: "error", message: "Le fichier dépasse 5 Mo. Découpez-le en plusieurs imports." };
  if (!/\.(csv|txt)$/i.test(file.name))
    return { step: "error", message: "Choisissez un fichier au format CSV (.csv)." };

  let analysis: ImportAnalysis;
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    analysis = analyzeProductCsv(content);
  } catch (error) {
    return {
      step: "error",
      message:
        error instanceof TypeError
          ? "Le fichier n’est pas encodé en UTF-8. Enregistrez-le en « CSV UTF-8 » depuis votre tableur."
          : error instanceof Error
            ? error.message
            : "Le fichier n’a pas pu être lu.",
    };
  }

  const existing = await prisma.product.findMany({
    where: { storeId: store.id, sku: { in: analysis.rows.map((row) => row.sku) } },
    select: { id: true, sku: true },
  });

  if (formData.get("mode") !== "confirm") {
    return {
      step: "preview",
      fileName: file.name.slice(0, 120),
      fileSize: file.size,
      analysis,
      existingSkus: existing.map((product) => product.sku),
    };
  }

  if (analysis.rows.length === 0) return { step: "error", message: "Aucune ligne valide à importer." };
  const bySku = new Map(existing.map((product) => [product.sku.toLowerCase(), product.id]));
  let created = 0;
  let updated = 0;

  try {
    await prisma.$transaction(
      async (transaction) => {
        const access = await getSubscriptionAccessForTransaction(transaction, store.id, new Date());
        const activeCount = await transaction.product.count({
          where: { storeId: store.id, status: { not: "ARCHIVED" } },
        });
        const newRows = analysis.rows.filter((row) => !bySku.has(row.sku.toLowerCase()));
        if (access.plan.productQuota !== null && activeCount + newRows.length > access.plan.productQuota) {
          throw new Error(
            `Votre offre permet ${access.plan.productQuota} produits : cet import en ajouterait ${newRows.length} de plus que la limite autorisée.`,
          );
        }

        const categoryIds = new Map<string, string>();
        for (const name of new Set(
          analysis.rows.map((row) => row.category).filter((value): value is string => Boolean(value)),
        )) {
          const category = await transaction.productCategory.upsert({
            where: { storeId_name: { storeId: store.id, name } },
            update: {},
            create: { storeId: store.id, name, slug: slugify(name) || `categorie-${categoryIds.size + 1}` },
            select: { id: true },
          });
          categoryIds.set(name, category.id);
        }

        const usedSlugs = new Set(
          (await transaction.product.findMany({ where: { storeId: store.id }, select: { slug: true } })).map(
            (product) => product.slug,
          ),
        );
        for (const row of analysis.rows) {
          const data = {
            name: row.name,
            description: row.description,
            categoryId: row.category ? (categoryIds.get(row.category) ?? null) : null,
            priceXaf: row.priceXaf,
            promotionalPriceXaf: row.promotionalPriceXaf,
            availability: row.availability,
            trackInventory: row.stockQuantity !== null,
            stockQuantity: row.stockQuantity,
          };
          const existingId = bySku.get(row.sku.toLowerCase());
          if (existingId) {
            await transaction.product.update({ where: { id: existingId }, data });
            updated += 1;
          } else {
            let slug = slugify(row.name) || "produit";
            for (let suffix = 2; usedSlugs.has(slug); suffix += 1) slug = `${slugify(row.name) || "produit"}-${suffix}`;
            usedSlugs.add(slug);
            await transaction.product.create({
              data: { ...data, storeId: store.id, sku: row.sku, slug, status: "ACTIVE" },
            });
            created += 1;
          }
        }
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    return {
      step: "error",
      message:
        error instanceof Error && error.message.startsWith("Votre offre")
          ? error.message
          : "L’import n’a pas pu aboutir. Aucun produit n’a été modifié. Réessayez dans un instant.",
    };
  }

  revalidatePath("/dashboard/produits");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  return {
    step: "done",
    created,
    updated,
    skipped: analysis.errors.length ? new Set(analysis.errors.map((error) => error.line)).size : 0,
  };
}
