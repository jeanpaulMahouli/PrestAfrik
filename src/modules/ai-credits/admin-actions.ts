"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { creditsLabel, defaultMonthlyAiCredits, maxBonusGrant, maxMonthlyAiCredits } from "@/modules/ai-credits/rules";

// Administration → Crédits IA : crédits bonus (ajout ou retrait) et crédits du mois d'une boutique.
// Chaque changement est journalisé (journal de l'administration et historique des crédits).

const page = "/admin/ia";
const storeId = z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/);

function back(formData: FormData, message: string, kind: "succes" | "erreur" = "succes"): never {
  const requested = String(formData.get("retour") ?? "");
  const target = /^\/admin\/ia(?:\?[^\s]*)?$/.test(requested) ? requested : page;
  const url = new URL(target, "http://local");
  url.searchParams.delete("succes");
  url.searchParams.delete("erreur");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

/** Ajoute (ou retire, avec « Retirer ») des crédits bonus à une boutique. */
export async function grantAiCredits(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = storeId.safeParse(formData.get("storeId"));
  const amount = z.coerce.number().int().min(1).max(maxBonusGrant).safeParse(formData.get("amount"));
  const direction = formData.get("direction") === "remove" ? -1 : 1;
  const reason = z.string().trim().max(200).safeParse(formData.get("reason") ?? "");
  if (!id.success || !amount.success || !reason.success) back(formData, `Indiquez un nombre de crédits entre 1 et ${maxBonusGrant}.`, "erreur");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai-credits:${id.data}`}))`;
    const store = await tx.store.findUnique({ where: { id: id.data }, select: { name: true, aiBonusCredits: true } });
    if (!store) return null;
    // Un retrait ne descend jamais sous zéro.
    const change = direction > 0 ? amount.data : -Math.min(amount.data, store.aiBonusCredits);
    if (change === 0) return { store, change };
    await tx.store.update({ where: { id: id.data }, data: { aiBonusCredits: { increment: change } } });
    await tx.aiCreditGrant.create({ data: { storeId: id.data, adminId: admin.id, amount: change, reason: reason.data || null } });
    await logAdminAction(admin.id, { action: change > 0 ? "ai-credits.grant" : "ai-credits.remove", targetType: "store", targetId: id.data, storeId: id.data, details: { amount: change, reason: reason.data || null } }, tx);
    return { store, change };
  });
  if (!result) back(formData, "Cette boutique est introuvable.", "erreur");
  revalidatePath(page);
  if (result.change === 0) back(formData, `${result.store.name} n’a aucun crédit bonus à retirer.`, "erreur");
  back(formData, result.change > 0 ? `${creditsLabel(result.change)} bonus ajouté${result.change > 1 ? "s" : ""} à ${result.store.name}.` : `${creditsLabel(-result.change)} bonus retiré${-result.change > 1 ? "s" : ""} à ${result.store.name}.`);
}

/** Règle les crédits offerts chaque mois à une boutique (vide : valeur par défaut, 5). */
export async function setMonthlyAiCredits(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = storeId.safeParse(formData.get("storeId"));
  const raw = String(formData.get("monthly") ?? "").trim();
  const monthly = raw === "" ? { success: true as const, data: null } : z.coerce.number().int().min(0).max(maxMonthlyAiCredits).safeParse(raw);
  if (!id.success || !monthly.success) back(formData, `Indiquez un nombre de crédits par mois entre 0 et ${maxMonthlyAiCredits}, ou laissez vide pour ${defaultMonthlyAiCredits}.`, "erreur");

  const store = await prisma.store.findUnique({ where: { id: id.data }, select: { name: true } });
  if (!store) back(formData, "Cette boutique est introuvable.", "erreur");
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: id.data }, data: { aiMonthlyCredits: monthly.data === defaultMonthlyAiCredits ? null : monthly.data } });
    await logAdminAction(admin.id, { action: "ai-credits.monthly", targetType: "store", targetId: id.data, storeId: id.data, details: { monthly: monthly.data } }, tx);
  });
  revalidatePath(page);
  const value = monthly.data ?? defaultMonthlyAiCredits;
  back(formData, `${store.name} reçoit désormais ${creditsLabel(value)} IA par mois.`);
}
