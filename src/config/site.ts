// Coordonnées publiques de PrestAfrik (landing page, pied de page, e-mails).
export const site = {
  name: "PrestAfrik",
  email: "contact@prestafrik.com",
  /** Téléphones de l'entreprise (pages légales). */
  phones: ["+237 6 98 95 57 41", "+237 6 91 69 88 48"],
  /** Numéro WhatsApp de l'équipe au format international (+237…), sinon le contact passe par e-mail. */
  whatsapp: process.env.NEXT_PUBLIC_PRESTAFRIK_WHATSAPP?.trim() || null,
} as const;
