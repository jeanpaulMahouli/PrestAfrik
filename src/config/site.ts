// Coordonnées publiques de PrestAfrik (landing page, pied de page, e-mails).
export const site = {
  name: "PrestAfrik",
  email: "contact@prestafrik.com",
  /** Téléphones de l'entreprise (pages légales). */
  phones: ["+237 6 98 95 57 41", "+237 6 91 69 88 48"],
  /** Numéro WhatsApp de l'équipe au format international (+237…), sinon le contact passe par e-mail. */
  whatsapp: process.env.NEXT_PUBLIC_PRESTAFRIK_WHATSAPP?.trim() || null,
  /** Chaîne WhatsApp « Club des 1000 » (actualités de PrestAfrik). */
  whatsappChannel: "https://whatsapp.com/channel/0029Vb9M5ZPEwEjzoo7OsM3y",
  /** Chaîne YouTube de PrestAfrik ; à défaut, la vidéo de présentation. */
  youtube: process.env.NEXT_PUBLIC_PRESTAFRIK_YOUTUBE?.trim() || "https://youtu.be/mqG-gLXfd5A",
} as const;
