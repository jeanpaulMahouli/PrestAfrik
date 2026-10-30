import "server-only";

import { redirect } from "next/navigation";
import { whatsappStepHref } from "@/config/routes";
import { prisma } from "@/lib/prisma";

/** Connexion avec Google disponible : identifiants OAuth renseignés sur le serveur (docs/google-oauth.md). */
export function googleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}


/**
 * Compte Google sans numéro WhatsApp : l'étape du numéro passe avant le tableau de bord et l'assistant.
 * Une seule lecture en base, et seulement quand le numéro manque.
 */
export async function requireWhatsappNumber(user: { id: string; phoneNumber?: string | null }) {
  if (user.phoneNumber) return;
  const google = await prisma.account.findFirst({ where: { userId: user.id, providerId: "google" }, select: { id: true } });
  if (google) redirect(whatsappStepHref);
}
