import "server-only";

import { redirect } from "next/navigation";
import { whatsappStepHref } from "@/config/routes";

/** Connexion avec Google disponible : identifiants OAuth renseignés sur le serveur (docs/google-oauth.md). */
export function googleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}


/**
 * Compte sans numéro WhatsApp (inscription avec Google, ou compte plus ancien que le numéro obligatoire) :
 * l'étape du numéro passe avant le tableau de bord et l'assistant. Aucune lecture en base.
 */
export async function requireWhatsappNumber(user: { id: string; phoneNumber?: string | null }) {
  if (!user.phoneNumber?.trim()) redirect(whatsappStepHref);
}
