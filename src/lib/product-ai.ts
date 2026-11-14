import "server-only";

import sharp from "sharp";
import { Anthropic, anthropicConfigured, getAnthropic } from "@/lib/anthropic";

// Assistant produit : à partir des photos, Claude propose un nom et une description. Rien n'est
// enregistré : le vendeur relit, modifie et valide avant d'enregistrer.
//
// Réglé pour consommer le moins de crédits possible : modèle Haiku (le moins cher), réflexion
// désactivée, 2 photos au maximum réduites à 512 px, consigne courte, réponse JSON courte.

/** category : une catégorie de la boutique (nom exact) ou une nouvelle catégorie courte ; null si rien ne convient. */
export type ProductAiSuggestion = { name: string; description: string; category: string | null };

export class ProductAiError extends Error {}

/** Photos envoyées à l'IA (la principale + une autre) et taille maximale : chaque photo coûte des jetons. */
export const maxAiPhotos = 2;
const aiImageSide = 512;

const outputSchema = {
  type: "object",
  properties: { name: { type: "string" }, description: { type: "string" }, category: { type: "string" } },
  required: ["name", "description", "category"],
  additionalProperties: false,
} as const;

const systemPrompt = `Tu rédiges des fiches produit pour des boutiques en ligne africaines (prix en FCFA). À partir des photos d'UN produit, réponds en français :
- name : nom court et vendeur (3 à 8 mots, 60 caractères max) : type, couleur, matière, marque si visible. Pas d'emoji, pas de prix, pas tout en majuscules.
- description : 40 à 90 mots. Une phrase d'accroche, puis une ligne vide et 3 à 5 lignes "- **Caractéristique** : détail", chacune sur sa propre ligne. Seul format permis : **gras** et listes "- ". N'invente rien d'invisible (taille, composition, garantie, autonomie). Pas d'HTML, d'emoji ni de prix.
- category : la catégorie du produit dans la boutique. Si une catégorie de la liste fournie convient, recopie son nom EXACT ; sinon propose un nom court et général (1 à 3 mots, au pluriel, ex. « Parfums », « Robes », « Ordinateurs portables »).`;

export function productAiAvailable() {
  return anthropicConfigured() && process.env.PRODUCT_AI !== "off";
}

const clean = (value: string, max: number) => value.trim().replace(/<[^>]*>/g, "").slice(0, max);

/** Remet chaque élément de liste sur sa propre ligne (le modèle les colle parfois à la suite). */
export function formatDescription(text: string) {
  const lines = text.replace(/[ \t]+- (?=\*\*)/g, "\n- ").split("\n").map((line) => line.trimEnd());
  // Une ligne vide entre l'accroche et le début de la liste, pas à l'intérieur de la liste.
  const firstItem = lines.findIndex((line) => line.startsWith("- "));
  if (firstItem > 0 && lines[firstItem - 1] !== "") lines.splice(firstItem, 0, "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Catégorie proposée : le nom exact d'une catégorie existante (casse et accents ignorés), sinon un nom court. */
export function matchCategory(proposed: string, categories: string[]) {
  const value = clean(proposed, 80).replace(/^[«"\s]+|[»"\s.]+$/g, "");
  if (value.length < 2) return null;
  const key = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return categories.find((item) => key(item) === key(value)) ?? value;
}

/** Réduit chaque photo (512 px, JPEG) : environ 350 jetons par image au lieu de 850 à 800 px. */
async function shrink(image: Buffer) {
  return sharp(image, { failOn: "none" })
    .resize({ width: aiImageSide, height: aiImageSide, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 75 })
    .toBuffer();
}

export async function suggestProductDetails(images: Buffer[], typedName: string, categories: string[] = []): Promise<ProductAiSuggestion> {
  if (!productAiAvailable()) throw new ProductAiError("L’assistant IA n’est pas activé sur cette plateforme.");
  if (!images.length) throw new ProductAiError("Ajoutez d’abord au moins une photo du produit.");

  const photos = await Promise.all(images.slice(0, maxAiPhotos).map(shrink)).catch(() => {
    throw new ProductAiError("Ces photos ne peuvent pas être lues. Réessayez avec une autre photo.");
  });
  const nameHint = typedName.trim() ? `Nom saisi par le vendeur (à améliorer) : ${typedName.trim().slice(0, 120)}` : "Propose le nom et la description.";
  const list = categories.slice(0, 40).map((item) => item.slice(0, 80));
  const hint = `${nameHint}
Catégories de la boutique : ${list.length ? list.join(" | ") : "aucune pour l’instant"}`;

  let response;
  try {
    response = await getAnthropic().messages.create({
      model: process.env.PRODUCT_AI_MODEL || "claude-haiku-5-5",
      max_tokens: 700,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: outputSchema } },
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            ...photos.map((photo) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: "image/jpeg" as const, data: photo.toString("base64") },
            })),
            { type: "text", text: hint },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new ProductAiError("L’assistant IA est très sollicité. Réessayez dans une minute.");
    }
    console.error("[assistant produit] erreur API :", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
    throw new ProductAiError("L’assistant IA ne répond pas pour le moment. Réessayez dans quelques instants.");
  }

  if (response.stop_reason === "refusal") {
    throw new ProductAiError("L’assistant IA ne peut pas décrire ces photos. Remplissez les informations vous-même.");
  }
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new ProductAiError("L’assistant IA n’a pas pu répondre. Réessayez.");
  try {
    const raw = JSON.parse(text.text) as { name: string; description: string; category?: string };
    return { name: clean(raw.name, 120), description: formatDescription(clean(raw.description, 2000)), category: matchCategory(raw.category ?? "", list) };
  } catch {
    throw new ProductAiError("L’assistant IA n’a pas pu répondre. Réessayez.");
  }
}
