import "server-only";

import { z } from "zod";
import { absoluteUrl } from "@/lib/seo";
import { exploreShop } from "@/modules/marketplace/shop";
import { suggestStores } from "@/modules/marketplace/search";

/**
 * Serveur MCP de PrestAfrik (Model Context Protocol, transport « Streamable HTTP », réponses JSON) : les
 * assistants IA cherchent des produits et des boutiques de la marketplace. Lecture seule, données publiques
 * seulement (aucun téléphone ni donnée client), 60 requêtes par minute et par adresse IP.
 * Carte du serveur : /.well-known/mcp/server-card.json.
 */
export const serverInfo = { name: "prestafrik", title: "PrestAfrik Marketplace", version: "1.0.0" };
const supportedVersions = ["2025-06-18", "2025-03-26", "2024-11-05"];

export const tools = [
  {
    name: "search_products",
    title: "Chercher des produits",
    description: "Cherche des produits sur la marketplace PrestAfrik (Cameroun). Prix en FCFA, paiement à la livraison, commande confirmée sur WhatsApp.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Ce que cherche l'acheteur (ex. « robe wax », « téléphone »)." },
        max_price: { type: "integer", minimum: 0, description: "Prix maximum en FCFA (facultatif)." },
        min_price: { type: "integer", minimum: 0, description: "Prix minimum en FCFA (facultatif)." },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "Nombre de résultats (10 par défaut)." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "search_stores",
    title: "Chercher des boutiques",
    description: "Cherche des boutiques PrestAfrik par nom, activité ou ville (ex. « Douala », « coiffure »).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nom, activité ou ville." },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "Nombre de résultats (6 par défaut)." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

const productArgs = z.object({
  query: z.string().trim().min(2).max(60),
  max_price: z.number().int().min(0).optional(),
  min_price: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});
const storeArgs = z.object({ query: z.string().trim().min(2).max(60), limit: z.number().int().min(1).max(20).default(6) });

export type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

export const result = (id: RpcRequest["id"], value: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result: value });
export const failure = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const textResult = (data: unknown, isError = false) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data, isError });

async function callTool(name: unknown, args: unknown) {
  if (name === "search_products") {
    const parsed = productArgs.safeParse(args ?? {});
    if (!parsed.success) return textResult({ error: "Paramètres invalides : « query » (2 à 60 caractères) est requis." }, true);
    const { query, max_price, min_price, limit } = parsed.data;
    const { products } = await exploreShop({ q: query, max: max_price, min: min_price }, { city: null });
    return textResult({
      results: products.slice(0, limit).map((product) => ({
        name: product.name,
        price_xaf: product.priceXaf,
        old_price_xaf: product.oldPriceXaf,
        discount_percent: product.discount,
        rating: product.rating,
        store: product.store.name,
        url: absoluteUrl(product.href),
        image: product.largeImageUrl ? absoluteUrl(product.largeImageUrl) : null,
      })),
    });
  }
  if (name === "search_stores") {
    const parsed = storeArgs.safeParse(args ?? {});
    if (!parsed.success) return textResult({ error: "Paramètres invalides : « query » (2 à 60 caractères) est requis." }, true);
    const stores = await suggestStores(parsed.data.query, parsed.data.limit);
    return textResult({ results: stores.map((store) => ({ name: store.name, city: store.city, country: store.country, activity: store.activity, url: store.href })) });
  }
  return null;
}

export async function handleMcpMessage(message: RpcRequest) {
  const { id, method, params } = message;
  // Notifications (sans id) : rien à répondre.
  if (id === undefined || id === null) return null;
  switch (method) {
    case "initialize": {
      const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : supportedVersions[0];
      return result(id, {
        protocolVersion: supportedVersions.includes(requested) ? requested : supportedVersions[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo,
        instructions: "Marketplace PrestAfrik (Cameroun) : cherchez des produits ou des boutiques. Les prix sont en FCFA ; la commande se fait sur la page du produit, paiement à la livraison.",
      });
    }
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools });
    case "tools/call": {
      const output = await callTool(params?.name, params?.arguments).catch(() => textResult({ error: "Recherche indisponible pour le moment." }, true));
      return output ? result(id, output) : failure(id, -32602, "Outil inconnu.");
    }
    default:
      return failure(id, -32601, "Méthode non prise en charge.");
  }
}

