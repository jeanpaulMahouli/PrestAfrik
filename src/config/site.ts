// Coordonnées publiques de PrestAfrik (landing page, pied de page, e-mails).
export const site = {
  name: "PrestAfrik",
  email: "contact@prestafrik.com",
  /** Téléphones de l'entreprise (pages légales). */
  phones: ["+237 6 71 08 31 42", "+237 6 98 95 57 41"],
  /** Numéro WhatsApp du support au format international ; NEXT_PUBLIC_PRESTAFRIK_WHATSAPP peut le remplacer. */
  whatsapp: process.env.NEXT_PUBLIC_PRESTAFRIK_WHATSAPP?.trim() || "+237671083142",
  /** Chaîne WhatsApp « Club des 1000 » (actualités de PrestAfrik). */
  whatsappChannel: "https://whatsapp.com/channel/0029Vb9M5ZPEwEjzoo7OsM3y",
  /** Chaîne YouTube de PrestAfrik (pied de page, fiche Google). */
  youtube: process.env.NEXT_PUBLIC_PRESTAFRIK_YOUTUBE?.trim() || "https://www.youtube.com/@prestafrik",
} as const;
