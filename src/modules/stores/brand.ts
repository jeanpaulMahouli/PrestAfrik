// Le nom et l'adresse « PrestAfrik » sont réservés à l'administrateur de la plateforme :
// personne d'autre ne peut créer (ou renommer) une boutique « PrestAfrik », « Presta Frik Shop », « prestafrik-officiel »…

export const brandSlug = "prestafrik";

export const brandNameMessage = "Le nom « PrestAfrik » est réservé à l’équipe PrestAfrik. Choisissez un autre nom pour votre boutique.";
export const brandSlugMessage = "Les adresses contenant « prestafrik » sont réservées à l’équipe PrestAfrik. Choisissez-en une autre.";

/** Lettres et chiffres seuls, sans accents : « Presta-Frik » et « PRESTAFRIK » donnent « prestafrik ». */
function compact(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Le nom utilise-t-il la marque PrestAfrik ? */
export function usesBrandName(name: string) {
  return compact(name).includes(brandSlug);
}

/** L'adresse utilise-t-elle la marque PrestAfrik ? */
export function usesBrandSlug(slug: string) {
  return slug.replace(/-/g, "").includes(brandSlug);
}
