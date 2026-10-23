import { randomBytes } from "node:crypto";
import { checkSlug, slugify } from "@/modules/stores/slug";

// Adresse d'une boutique après un changement de nom : l'adresse suit le nom ; si elle est déjà prise
// (ou réservée par PrestAfrik), on ajoute « -» et un identifiant court. Le nom, lui, n'est jamais modifié.

const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

/** Identifiant court sans caractères ambigus (ni 0/o, ni 1/l). */
export function shortId(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export type SlugProposal = { slug: string; base: string; suffixed: boolean; reason: "taken" | "reserved" | "format" | null };

/**
 * Adresse proposée pour un nom. `isTaken` dit si une adresse appartient déjà à une autre boutique.
 * Renvoie null quand le nom donne la même adresse qu'aujourd'hui (rien à changer).
 */
export async function slugForRenamedStore(
  name: string,
  currentSlug: string,
  isTaken: (slug: string) => Promise<boolean>,
  makeId = shortId,
  /** Adresse réservée autorisée malgré tout (ex. « prestafrik » pour l'administrateur). */
  allowReserved: (slug: string) => boolean = () => false,
): Promise<SlugProposal | null> {
  let base = slugify(name);
  if (base === currentSlug) return null;
  // Nom trop court ou sans lettres (ex. « A+ ») : on garde une base valide.
  if (base.length < 3) base = `${base || "boutique"}-shop`.replace(/^-/, "");
  const issue = allowReserved(base) ? null : checkSlug(base);
  if (!issue && !(await isTaken(base))) return { slug: base, base, suffixed: false, reason: null };

  const reason = issue ?? "taken";
  // Place pour « -xxxxxx » dans la limite de 40 caractères.
  const stem = slugify(base).slice(0, 33).replace(/-+$/g, "") || "boutique";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${stem}-${makeId()}`;
    if (!checkSlug(candidate) && !(await isTaken(candidate))) return { slug: candidate, base, suffixed: true, reason };
  }
  throw new Error("Impossible de trouver une adresse libre pour cette boutique.");
}
