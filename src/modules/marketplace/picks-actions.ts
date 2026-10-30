"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { clearShopCache } from "@/modules/marketplace/shop";

// Administration → Marketplace : ventes flash, offres exclusives et boutiques à la une de
// shop.prestafrik.com. Seule l'administration choisit ; les prix restent ceux fixés par les vendeurs.

const listPath = "/admin/marketplace";
const sections = ["FLASH", "EXCLUSIVE", "FEATURED_STORE"] as const;
const maxPerSection = { FLASH: 12, EXCLUSIVE: 12, FEATURED_STORE: 10 } as const;
const idSchema = z.string().min(10).max(40).regex(/^[a-z0-9]+$/);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/;

function back(message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${listPath}?${kind}=${encodeURIComponent(message)}`);
}

function refresh() {
  clearShopCache();
  revalidatePath(listPath);
  revalidatePath("/nos-boutiques");
}

/**
 * Adresse de boutique et de produit dans un lien collé par l'administrateur :
 * « https://mboa-style.prestafrik.com/robe-wax », « prestafrik.com/mboa-style/robe-wax »,
 * « /mboa-style/robe-wax » ou simplement « mboa-style » (boutique).
 */
function parseLink(raw: string): { storeSlug: string; productSlug: string | null } | null {
  const value = raw.trim();
  if (!value) return null;
  let host = "";
  let path = value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://placeholder.invalid/${value.replace(/^\/+/, "")}`);
    host = url.hostname === "placeholder.invalid" ? "" : url.hostname.toLowerCase();
    path = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const segments = path.split("/").filter(Boolean);
  const root = (process.env.STORE_ROOT_DOMAIN ?? "prestafrik.com").toLowerCase();
  const sub = host.endsWith(`.${root}`) ? host.slice(0, -root.length - 1) : "";
  // Sous-domaine de boutique : « mboa-style.prestafrik.com/robe-wax ».
  if (sub && !["www", "shop"].includes(sub)) segments.unshift(sub);
  const [storeSlug, productSlug = null] = segments;
  if (!storeSlug || !slugPattern.test(storeSlug) || (productSlug && !slugPattern.test(productSlug))) return null;
  return { storeSlug, productSlug };
}

/** « 2026-11-02T20:00 » saisi à l'heure d'Afrique centrale (UTC+1, sans heure d'été). */
function parseEndsAt(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}:00+01:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function addMarketplacePick(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const section = z.enum(sections).safeParse(formData.get("section"));
  if (!section.success) back("Rubrique inconnue.", "erreur");
  const link = parseLink(String(formData.get("link") ?? ""));
  if (!link) back("Collez le lien de la boutique ou du produit, tel qu’il s’affiche dans le navigateur.", "erreur");
  const endsAt = parseEndsAt(formData.get("endsAt"));
  if (endsAt === undefined) back("Date de fin invalide.", "erreur");
  if (section.data === "FLASH" && !endsAt) back("Indiquez la fin de la vente flash : le compte à rebours s’arrête à cette date.", "erreur");
  if (endsAt && endsAt.getTime() <= Date.now()) back("La date de fin est déjà passée.", "erreur");
  if ((await prisma.marketplacePick.count({ where: { section: section.data } })) >= maxPerSection[section.data]) {
    back(`${maxPerSection[section.data]} éléments au plus dans cette rubrique : retirez-en un d’abord.`, "erreur");
  }

  const store = await prisma.store.findUnique({ where: { slug: link.storeSlug }, select: { id: true, name: true, isPublished: true, suspendedAt: true } });
  if (!store) back(`Aucune boutique à l’adresse « ${link.storeSlug} ».`, "erreur");
  if (!store.isPublished || store.suspendedAt) back(`« ${store.name} » n’est pas en ligne : elle n’apparaîtrait pas sur la marketplace.`, "erreur");

  let productId: string | null = null;
  let label = store.name;
  if (section.data !== "FEATURED_STORE") {
    if (!link.productSlug) back("Collez le lien d’un produit (ouvrez le produit dans la boutique, puis copiez l’adresse).", "erreur");
    const product = await prisma.product.findFirst({ where: { storeId: store.id, slug: link.productSlug }, select: { id: true, name: true, status: true, archivedAt: true } });
    if (!product) back(`Produit introuvable dans « ${store.name} ».`, "erreur");
    if (product.status !== "ACTIVE" || product.archivedAt) back(`« ${product.name} » n’est pas en ligne.`, "erreur");
    productId = product.id;
    label = product.name;
  }

  const duplicate = await prisma.marketplacePick.findFirst({ where: { section: section.data, ...(productId ? { productId } : { storeId: store.id }) }, select: { id: true } });
  if (duplicate) back(`« ${label} » est déjà dans cette rubrique.`, "erreur");

  const position = await prisma.marketplacePick.count({ where: { section: section.data } });
  const created = await prisma.marketplacePick.create({
    data: { section: section.data, productId, storeId: productId ? null : store.id, endsAt, position },
  });
  await logAdminAction(admin.id, { action: "marketplace.pick.add", targetType: "marketplace", targetId: created.id, storeId: store.id, details: { section: section.data, label } });
  refresh();
  back(`« ${label} » ajouté : déjà visible sur la marketplace.`);
}

export async function removeMarketplacePick(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) back("Élément introuvable.", "erreur");
  const pick = await prisma.marketplacePick.findUnique({ where: { id: id.data }, select: { id: true, section: true } });
  if (!pick) back("Élément introuvable.", "erreur");
  await prisma.marketplacePick.delete({ where: { id: pick.id } });
  // Positions recalculées sans trou.
  const rest = await prisma.marketplacePick.findMany({ where: { section: pick.section }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await prisma.$transaction(rest.map((row, index) => prisma.marketplacePick.update({ where: { id: row.id }, data: { position: index } })));
  await logAdminAction(admin.id, { action: "marketplace.pick.remove", targetType: "marketplace", targetId: pick.id, details: { section: pick.section } });
  refresh();
  back("Retiré de la marketplace.");
}

export async function moveMarketplacePick(formData: FormData) {
  await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id.success) back("Élément introuvable.", "erreur");
  const pick = await prisma.marketplacePick.findUnique({ where: { id: id.data }, select: { id: true, section: true } });
  if (!pick) back("Élément introuvable.", "erreur");
  const siblings = await prisma.marketplacePick.findMany({ where: { section: pick.section }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const ids = siblings.map((row) => row.id);
  const index = ids.indexOf(pick.id);
  const target = index + direction;
  if (target < 0 || target >= ids.length) back("Déjà à cette place.");
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await prisma.$transaction(ids.map((rowId, position) => prisma.marketplacePick.update({ where: { id: rowId }, data: { position } })));
  refresh();
  back("Ordre mis à jour.");
}
