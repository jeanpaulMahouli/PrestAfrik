"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { clearShopCache } from "@/modules/marketplace/shop";
import { notifyStoreTeam } from "@/modules/notifications/vendor";

// Administration → Produits : masquer un produit de la marketplace (ou le réafficher). Le produit reste en
// vente dans la boutique du vendeur ; seule sa présence sur la marketplace change.
// Règle : l'équipe de la boutique est prévenue dans son application, avec le motif s'il est donné.

const listPath = "/admin/produits";
const idSchema = z.string().min(10).max(40).regex(/^[a-z0-9]+$/);
/** Au plus 100 produits par action groupée. */
const maxBatch = 100;

function back(formData: FormData, message: string, kind: "succes" | "erreur" = "succes"): never {
  const raw = formData.get("retour");
  const base = typeof raw === "string" && raw.startsWith(listPath) ? raw : listPath;
  redirect(`${base}${base.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(message)}`);
}

/** Produits visés : le bouton d'une ligne (« single »), sinon les cases cochées. */
function selectedIds(formData: FormData) {
  const single = formData.get("single");
  const values = single ? [single] : formData.getAll("productId");
  return [...new Set(values.flatMap((value) => (typeof value === "string" && idSchema.safeParse(value).success ? [value] : [])))].slice(0, maxBatch);
}

async function setHidden(formData: FormData, hide: boolean) {
  const admin = await requirePlatformAdmin();
  const ids = selectedIds(formData);
  if (!ids.length) back(formData, "Cochez au moins un produit.", "erreur");
  const reason = z.string().trim().max(200).safeParse(formData.get("motif") ?? "");
  const motif = reason.success && reason.data ? reason.data : null;

  const products = await prisma.product.findMany({ where: { id: { in: ids }, marketplaceHiddenAt: hide ? null : { not: null } }, select: { id: true, name: true, storeId: true } });
  if (!products.length) back(formData, hide ? "Ces produits sont déjà masqués." : "Ces produits sont déjà visibles.", "erreur");
  await prisma.product.updateMany({
    where: { id: { in: products.map((product) => product.id) } },
    data: hide ? { marketplaceHiddenAt: new Date(), marketplaceHiddenBy: admin.name.slice(0, 120), marketplaceHiddenReason: motif } : { marketplaceHiddenAt: null, marketplaceHiddenBy: null, marketplaceHiddenReason: null },
  });
  await logAdminAction(admin.id, { action: hide ? "marketplace.product.hide" : "marketplace.product.show", targetType: "marketplace", targetId: products[0].id, details: { products: products.map((product) => product.id), reason: motif } });

  // Une notification par boutique concernée.
  const byStore = new Map<string, string[]>();
  for (const product of products) byStore.set(product.storeId, [...(byStore.get(product.storeId) ?? []), product.name]);
  for (const [storeId, names] of byStore) {
    const label = names.length > 1 ? `${names.length} produits` : `« ${names[0]} »`;
    await notifyStoreTeam(storeId, {
      kind: "ALERT",
      title: hide ? `${label} retiré${names.length > 1 ? "s" : ""} de la marketplace` : `${label} de nouveau sur la marketplace`,
      body: hide
        ? `${motif ? `Motif : ${motif}. ` : ""}Toujours en vente dans votre boutique. Une question ? Écrivez à l’équipe.`
        : "Vos clients le retrouvent sur la marketplace PrestAfrik.",
      url: "/dashboard/produits",
    });
  }

  clearShopCache();
  revalidatePath(listPath);
  back(formData, hide ? `${products.length} produit${products.length > 1 ? "s" : ""} masqué${products.length > 1 ? "s" : ""} de la marketplace.` : `${products.length} produit${products.length > 1 ? "s" : ""} réaffiché${products.length > 1 ? "s" : ""}.`);
}

export async function hideProducts(formData: FormData) {
  await setHidden(formData, true);
}

export async function showProducts(formData: FormData) {
  await setHidden(formData, false);
}
