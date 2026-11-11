import type { PushNotificationKind } from "@prisma/client";

// Textes des notifications push envoyées aux vendeurs. L'administration peut les modifier
// (Administration → Notifications push) ; sans modification, ces textes par défaut s'appliquent.
// Les variables entre accolades sont remplacées à l'envoi ; une variable inconnue reste vide.

export type PushTemplate = { kind: PushNotificationKind; enabled: boolean; title: string; body: string; url: string };

export const pushKinds = ["INACTIVITY", "NEW_ORDER", "NEW_MESSAGE", "NEWS"] as const satisfies readonly PushNotificationKind[];

/** Nombre de jours sans connexion avant le rappel « Vous nous manquez ». */
export const inactivityDays = 2;

export const pushKindInfo: Record<PushNotificationKind, { label: string; when: string; variables: string[] }> = {
  INACTIVITY: {
    label: "Rappel d’absence",
    when: `Envoyé une fois quand le vendeur ne s’est pas connecté depuis ${inactivityDays} jours (puis à nouveau après sa prochaine visite).`,
    variables: ["prenom", "boutique", "activite"],
  },
  NEW_ORDER: {
    label: "Nouvelle commande",
    when: "Envoyé à l’équipe de la boutique dès qu’un client passe commande.",
    variables: ["prenom", "boutique", "reference", "client", "total"],
  },
  NEW_MESSAGE: {
    label: "Nouveau message",
    when: "Envoyé quand l’équipe PrestAfrik répond à un message du vendeur.",
    variables: ["prenom", "sujet"],
  },
  NEWS: {
    label: "Nouveauté",
    when: "Envoyé à la main depuis cette page, à tous les vendeurs abonnés (texte proposé par défaut).",
    variables: ["prenom", "boutique"],
  },
};

export const defaultPushTemplates: Record<PushNotificationKind, PushTemplate> = {
  INACTIVITY: {
    kind: "INACTIVITY",
    enabled: true,
    title: "Vous nous manquez, {prenom} !",
    body: "{activite} Passez voir ce qui se passe dans {boutique}.",
    url: "/dashboard",
  },
  NEW_ORDER: {
    kind: "NEW_ORDER",
    enabled: true,
    title: "Nouvelle commande {reference}",
    body: "{client} vient de commander pour {total} dans {boutique}. Confirmez-la vite !",
    url: "/dashboard/commandes",
  },
  NEW_MESSAGE: {
    kind: "NEW_MESSAGE",
    enabled: true,
    title: "Nouveau message de PrestAfrik",
    body: "L’équipe a répondu à « {sujet} ». Consultez vos e-mails pour lire la réponse.",
    url: "/dashboard",
  },
  NEWS: {
    kind: "NEWS",
    enabled: true,
    title: "Du nouveau sur PrestAfrik",
    body: "Découvrez la nouveauté qui vous aide à vendre plus avec {boutique}.",
    url: "/dashboard",
  },
};

/** Remplace {variable} par sa valeur ; espaces en trop retirés (variable vide en début de phrase, etc.). */
export function renderPushText(text: string, vars: Record<string, string | null | undefined>) {
  return text
    .replace(/\{(\w+)\}/g, (_, name: string) => vars[name]?.trim() ?? "")
    .replace(/\s+([,.!?;:])/g, (_, mark: string) => ([";", ":", "!", "?"].includes(mark) ? ` ${mark}` : mark))
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Adresse ouverte au clic : uniquement un chemin de l'espace PrestAfrik (jamais un site extérieur). */
export function safePushUrl(url: string) {
  const value = url.trim();
  return /^\/(?!\/)[\w\-./?=&%#]*$/.test(value) ? value : "/dashboard";
}

/** Phrase « activité » du rappel d'absence, selon les commandes reçues depuis la dernière visite. */
export function inactivitySentence(newOrders: number) {
  if (newOrders <= 0) return "Vos clients passent peut-être par votre boutique.";
  return newOrders === 1 ? "1 nouvelle commande vous attend." : `${newOrders} nouvelles commandes vous attendent.`;
}
