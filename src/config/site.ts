// Coordonnées publiques de PrestAfrik (landing page, pied de page, e-mails).
export const site = {
  name: "PrestAfrik",
  email: "contact@prestafrik.com",
  /** Numéro WhatsApp de l'équipe au format international (+237…), sinon le contact passe par e-mail. */
  whatsapp: process.env.NEXT_PUBLIC_PRESTAFRIK_WHATSAPP?.trim() || null,
} as const;
