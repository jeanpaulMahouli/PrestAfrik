import { fr } from "@/config/texts/fr";

/** Textes de l'interface. Une seule langue pour l'instant ; `en` reprendra la même forme. */
export const texts = fr;

/** Remplace les variables `{nom}` d'un texte. Les variables inconnues sont laissées telles quelles. */
export function format(template: string, params: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
