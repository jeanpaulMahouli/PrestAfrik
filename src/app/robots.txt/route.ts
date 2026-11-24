import { absoluteUrl } from "@/lib/seo";

/**
 * robots.txt. Espaces privés (vendeurs, administration, API) fermés aux robots ; site et marketplace ouverts.
 * Les boutiques publiques restent lisibles par Google, mais en « noindex » (app/[slug]/layout.tsx, proxy.ts) :
 * les bloquer ici l'empêcherait de lire cette consigne.
 *
 * Content-Signal (contentsignals.org) : recherche et réponses des assistants IA autorisées (PrestAfrik veut être
 * cité et trouvé), entraînement des modèles refusé.
 */
const privateSections = ["/dashboard", "/admin", "/dev", "/invitations", "/commande", "/reinitialiser", "/mot-de-passe-oublie", "/boutiques"];

export const revalidate = 3600;

export function GET() {
  // Les règles sont des préfixes : « /dev$ » et « /dev/ » ne bloquent pas une boutique « /devshop ».
  const disallow = ["/api/", ...privateSections.flatMap((path) => [`${path}$`, `${path}/`])];
  const body = [
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    // Icônes des boutiques (affichées par Google) et serveur MCP (lecture seule) : lisibles.
    "Allow: /api/boutique/",
    "Allow: /api/mcp",
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
