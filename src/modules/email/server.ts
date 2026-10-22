import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { billingEnabled } from "@/config/billing";
import { site } from "@/config/site";
import type { EmailId } from "@/config/texts/emails";
import { getSmtpConfig, hasSmtpConfig } from "@/modules/email/config";
import { emailRequiresBilling, renderEmail, type EmailVariables } from "@/modules/email/templates";

let transporter: Transporter | undefined;

function applicationOrigin() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function assertSafeLink(url: string) {
  const link = new URL(url);
  if (!["http:", "https:"].includes(link.protocol)) throw new Error("Le lien du courriel doit utiliser HTTP ou HTTPS.");
  if (process.env.NODE_ENV === "production") {
    if (link.protocol !== "https:") throw new Error("Les liens des courriels de production doivent utiliser HTTPS.");
    if (new URL(applicationOrigin()).origin !== link.origin) throw new Error("Le lien du courriel ne correspond pas au domaine public PrestAfrik.");
  }
}

export type SendResult = { sent: true } | { sent: false; reason: "billing-disabled" | "test-address" | "no-smtp" };

/**
 * Envoie un e-mail du catalogue (E01 à E25). Garde-fous : e-mails d'abonnement bloqués pendant la
 * gratuité, aucun envoi réel vers les adresses de test (.test), lien vérifié, version texte jointe.
 */
export async function sendEmail(id: EmailId, to: string, variables: EmailVariables, actionUrl?: string): Promise<SendResult> {
  if (emailRequiresBilling(id) && !billingEnabled) return { sent: false, reason: "billing-disabled" };
  if (actionUrl) assertSafeLink(actionUrl);
  const email = renderEmail(id, variables, { baseUrl: applicationOrigin(), actionUrl, contactEmail: site.email });

  // Données de démonstration et tests : jamais d'envoi réel (document des modèles, §3).
  if (/\.test$/i.test(to.trim())) {
    if (process.env.NODE_ENV !== "production") console.info(`[e-mail ${id} non envoyé : adresse de test] ${email.subject}`);
    return { sent: false, reason: "test-address" };
  }
  if (process.env.NODE_ENV !== "production" && !hasSmtpConfig()) {
    console.info(`[e-mail ${id} non envoyé : SMTP non configuré] ${email.subject}`);
    return { sent: false, reason: "no-smtp" };
  }

  const result = await smtpTransport().sendMail({
    from: getSmtpConfig().from,
    replyTo: site.email,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  if (!result.accepted?.length || (result.rejected?.length ?? 0) > 0) {
    throw new Error("Le serveur SMTP n’a pas accepté le destinataire du courriel.");
  }
  return { sent: true };
}

function smtpTransport() {
  const config = getSmtpConfig();
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });
  return transporter;
}

/** Adresse qui reçoit les messages du formulaire de contact (CONTACT_INBOX, sinon l'adresse publique). */
export function teamInbox() {
  return process.env.CONTACT_INBOX?.trim() || site.email;
}

/**
 * Message interne à l'équipe PrestAfrik (formulaire de contact), en texte brut.
 * « Répondre » écrit directement à l'expéditeur.
 */
export async function sendTeamEmail({ subject, text, replyTo }: { subject: string; text: string; replyTo: string }): Promise<SendResult> {
  if (process.env.NODE_ENV !== "production" && !hasSmtpConfig()) {
    console.info(`[message de contact non envoyé : SMTP non configuré] ${subject}`);
    return { sent: false, reason: "no-smtp" };
  }
  const result = await smtpTransport().sendMail({ from: getSmtpConfig().from, to: teamInbox(), replyTo, subject, text });
  if (!result.accepted?.length) throw new Error("Le serveur SMTP n’a pas accepté le message de contact.");
  return { sent: true };
}

/** Envoi « au mieux » des notifications : une panne d'e-mail ne bloque jamais l'action du vendeur. */
export async function sendEmailQuietly(id: EmailId, to: string, variables: EmailVariables, actionUrl?: string) {
  try {
    return await sendEmail(id, to, variables, actionUrl);
  } catch (error) {
    console.error(`Échec de l’envoi de l’e-mail ${id}.`, error instanceof Error ? error.message : error);
    return null;
  }
}
