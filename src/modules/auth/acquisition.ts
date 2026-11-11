import type { AcquisitionSource } from "@prisma/client";

// « Comment avez-vous connu PrestAfrik ? » : question posée une fois, juste après l'inscription
// (après le numéro WhatsApp). Les réponses s'affichent dans l'administration (tableau de bord, utilisateurs).

export const acquisitionSources = ["FACEBOOK", "YOUTUBE", "TIKTOK", "WHATSAPP", "GOOGLE", "WORD_OF_MOUTH"] as const satisfies readonly AcquisitionSource[];

export const acquisitionOptions: Record<AcquisitionSource, { label: string; icon: string | null }> = {
  FACEBOOK: { label: "Facebook", icon: "/landing/icons/facebook.svg" },
  YOUTUBE: { label: "YouTube", icon: "/landing/icons/youtube.svg" },
  TIKTOK: { label: "TikTok", icon: "/landing/icons/tiktok.svg" },
  WHATSAPP: { label: "WhatsApp", icon: "/landing/icons/whatsapp.svg" },
  GOOGLE: { label: "Google", icon: null },
  WORD_OF_MOUTH: { label: "Bouche à oreille", icon: null },
};

export function acquisitionLabel(source: AcquisitionSource | null | undefined) {
  return source ? acquisitionOptions[source].label : null;
}
