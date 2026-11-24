import "server-only";

import { brandIdentity, brandSlogan } from "@/lib/brand";
import { site } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { getShopCategories } from "@/modules/marketplace/shop";
import { getMostVisitedStores } from "@/modules/marketplace/search";

// Version Markdown de PrestAfrik pour les assistants IA (ChatGPT, Claude, Perplexity…) : servie à /llms.txt
// et à la place de la page d'accueil quand un agent demande « Accept: text/markdown ».

const shop = (path: string) => absoluteUrl(shopUrl(path));

/** Pages principales du site, avec une phrase courte chacune. */
const pages = [
  { title: "Accueil", path: "/", text: "Présentation de PrestAfrik pour les vendeurs." },
  { title: "Fonctionnalités", path: "/fonctionnalites", text: "Boutique en ligne, commandes WhatsApp, clients, livraisons, marketing." },
  { title: "Tarifs", path: "/tarifs", text: "Offres et prix (gratuit pendant le lancement)." },
  { title: "À propos", path: "/a-propos", text: "Qui sommes-nous, mission et engagements." },
  { title: "Contact", path: "/contact", text: "Écrire à l’équipe PrestAfrik." },
  { title: "Centre d’aide", path: "/aide", text: "Questions fréquentes des vendeurs et des acheteurs." },
  { title: "Blog", path: "/blog", text: "Conseils pour vendre en ligne au Cameroun." },
];

const legal = [
  { title: "Mentions légales", path: "/legal/mentions-legales" },
  { title: "Conditions générales", path: "/legal/conditions-generales" },
  { title: "Conditions de vente", path: "/legal/conditions-de-vente" },
  { title: "Politique de confidentialité", path: "/legal/politique-de-confidentialite" },
];

/** Document Markdown complet (titre H1, résumé, liens vers les contenus importants). */
export async function siteMarkdown() {
  const [categories, stores] = await Promise.all([getShopCategories({ city: null }).catch(() => []), getMostVisitedStores(15).catch(() => [])]);

  const lines = [
    "# PrestAfrik",
    "",
    `> ${brandIdentity} ${brandSlogan}.`,
    "",
    "PrestAfrik permet aux commerçants du Cameroun et de la zone CEMAC de créer leur boutique en ligne en 5 minutes. Les clients commandent sur la boutique ou sur la marketplace, la commande est confirmée sur WhatsApp et le paiement se fait à la livraison, en FCFA.",
    "",
    "## Pages principales",
    "",
    ...pages.map((page) => `- [${page.title}](${absoluteUrl(page.path)}) : ${page.text}`),
    "",
    "## Marketplace",
    "",
    `- [Marketplace PrestAfrik](${shop("/")}) : tous les produits des boutiques, paiement à la livraison.`,
    `- [Recherche de produits](${shop("/recherche")}) : ajoutez \`?q=mot\` (ex. \`?q=robe\`), \`&min=\` et \`&max=\` pour le budget en FCFA.`,
    `- [Promotions](${shop("/recherche?tri=promo&promo=1")})`,
    `- [Nouveautés](${shop("/recherche?tri=nouveautes")})`,
    "",
  ];

  if (categories.length) {
    lines.push("## Catégories", "", ...categories.map((category) => `- [${category.label}](${shop(`/recherche?categorie=${category.slug}`)}) : ${category.productCount} produit${category.productCount > 1 ? "s" : ""}`), "");
  }
  if (stores.length) {
    lines.push("## Boutiques les plus visitées", "", ...stores.map((store) => `- [${store.name}](${storePublicUrl(store.slug)})${store.city ? ` : ${store.city}` : ""}${store.activity ? `, ${store.activity}` : ""}`), "");
  }

  lines.push(
    "## Pour les agents",
    "",
    `- Serveur MCP (Streamable HTTP, lecture seule) : ${absoluteUrl("/api/mcp")} — outils \`search_products\` et \`search_stores\`.`,
    `- Carte du serveur MCP : ${absoluteUrl("/.well-known/mcp/server-card.json")}`,
    `- Plan du site : ${absoluteUrl("/sitemap.xml")}`,
    "",
    "## Pages légales",
    "",
    ...legal.map((page) => `- [${page.title}](${absoluteUrl(page.path)})`),
    "",
    "## Contact",
    "",
    `- E-mail : ${site.email}`,
    ...site.phones.map((phone) => `- Téléphone et WhatsApp : ${phone}`),
    "",
  );
  return lines.join("\n");
}

/** Réponse Markdown (Content-Type text/markdown, estimation du nombre de jetons). */
export function markdownResponse(markdown: string, contentType = "text/markdown; charset=utf-8") {
  return new Response(markdown, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=600",
      Vary: "Accept",
      "x-markdown-tokens": String(Math.ceil(markdown.length / 4)),
    },
  });
}
