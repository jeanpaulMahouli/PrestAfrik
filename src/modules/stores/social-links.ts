// Réseaux sociaux de la boutique (Ma boutique → Réseaux sociaux), affichés dans le pied de page de la vitrine.
// Module sans dépendance serveur : validé à l'enregistrement et testé unitairement.

export const socialNetworks = [
  { key: "facebookUrl", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"], example: "facebook.com/maboutique" },
  { key: "instagramUrl", label: "Instagram", hosts: ["instagram.com", "instagr.am"], example: "instagram.com/maboutique" },
  { key: "tiktokUrl", label: "TikTok", hosts: ["tiktok.com"], example: "tiktok.com/@maboutique" },
  { key: "youtubeUrl", label: "YouTube", hosts: ["youtube.com", "youtu.be"], example: "youtube.com/@maboutique" },
  { key: "xUrl", label: "X (Twitter)", hosts: ["x.com", "twitter.com"], example: "x.com/maboutique" },
] as const;

export type SocialKey = (typeof socialNetworks)[number]["key"];
export type SocialLinks = Record<SocialKey, string | null>;

const handleOnly = /^@?[\w.-]{2,60}$/;

/**
 * Lien saisi par le vendeur → adresse https complète, ou message d'erreur.
 * Accepte « https://… », « facebook.com/… » ou un simple identifiant (« @maboutique »).
 */
export function normalizeSocialUrl(key: SocialKey, raw: string): { ok: true; url: string | null } | { ok: false; message: string } {
  const network = socialNetworks.find((item) => item.key === key)!;
  const value = raw.trim();
  if (!value) return { ok: true, url: null };
  if (handleOnly.test(value)) {
    const handle = value.replace(/^@/, "");
    const host = network.hosts[0];
    const path = key === "tiktokUrl" || key === "youtubeUrl" ? `@${handle}` : handle;
    return { ok: true, url: `https://www.${host}/${path}` };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, message: `Le lien ${network.label} n’est pas valide (ex. ${network.example}).` };
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile|web|vm)\./, "");
  if (!network.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return { ok: false, message: `Ce lien n’est pas une adresse ${network.label} (ex. ${network.example}).` };
  }
  url.protocol = "https:";
  const text = url.toString();
  if (text.length > 300) return { ok: false, message: `Le lien ${network.label} est trop long.` };
  return { ok: true, url: text };
}
