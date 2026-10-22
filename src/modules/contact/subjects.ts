// Sujets du formulaire de contact (partagés par le formulaire et l'action serveur).
export const contactSubjects = {
  question: "Une question sur PrestAfrik",
  demo: "Réserver une démo personnalisée",
  aide: "Aide pour ma boutique",
  partenariat: "Partenariat ou presse",
  autre: "Autre demande",
} as const;

export type ContactSubject = keyof typeof contactSubjects;

export function isContactSubject(value: unknown): value is ContactSubject {
  return typeof value === "string" && Object.hasOwn(contactSubjects, value);
}
