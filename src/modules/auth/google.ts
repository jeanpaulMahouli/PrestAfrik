import "server-only";

import { redirect } from "next/navigation";
import { whatsappStepHref } from "@/config/routes";
import { prisma } from "@/lib/prisma";

/** Connexion avec Google disponible : identifiants OAuth renseignés sur le serveur (docs/google-oauth.md). */
export function googleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const e164 = /^\+\d{8,15}$/;

/**
 * Compte sans numéro WhatsApp mais propriétaire d'une boutique qui en a un : ce numéro devient celui du compte.
 * Seules les boutiques dont la personne est propriétaire comptent (jamais celles où elle a été invitée).
 * Numéro déjà pris par un autre compte : ignoré, la personne le saisira elle-même. Vrai si un numéro a été repris.
 */
export async function adoptOwnedStoreWhatsappNumber(userId: string) {
  const owned = await prisma.storeMembership.findMany({
    where: { userId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { store: { select: { phoneE164: true, whatsappSettings: { select: { businessNumber: true } } } } },
  });
  const candidates = [...new Set(owned.flatMap(({ store }) => [store.phoneE164, store.whatsappSettings?.businessNumber]).filter((phone): phone is string => Boolean(phone && e164.test(phone))))];
  for (const phoneNumber of candidates) {
    const holder = await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } });
    if (holder && holder.id !== userId) continue;
    const updated = await prisma.user
      .updateMany({ where: { id: userId, phoneNumber: null }, data: { phoneNumber } })
      .catch(() => ({ count: 0 }));
    if (updated.count > 0 || holder?.id === userId) return true;
  }
  return false;
}

/**
 * Compte sans numéro WhatsApp (inscription avec Google, ou compte plus ancien que le numéro obligatoire) :
 * le numéro de sa propre boutique est repris s'il existe, sinon l'étape du numéro passe avant le tableau de
 * bord et l'assistant. Aucune lecture en base quand le numéro est déjà là.
 */
export async function requireWhatsappNumber(user: { id: string; phoneNumber?: string | null }) {
  if (user.phoneNumber?.trim()) return;
  if (await adoptOwnedStoreWhatsappNumber(user.id)) return;
  redirect(whatsappStepHref);
}
