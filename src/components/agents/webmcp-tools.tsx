"use client";

import { useEffect } from "react";

// WebMCP (webmachinelearning.github.io/webmcp) : les agents intégrés au navigateur peuvent chercher des
// produits et des boutiques de la marketplace sans lire la page. Les outils appellent le serveur MCP du
// site (/api/mcp), en lecture seule. Rien ne se passe dans les navigateurs sans cette API.

type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};
type ModelContext = { registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => unknown };

const tools = [
  {
    name: "search_products",
    description: "Chercher des produits sur la marketplace PrestAfrik (Cameroun). Prix en FCFA, paiement à la livraison.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Ce que cherche l'acheteur (ex. « robe wax »)." },
        max_price: { type: "integer", minimum: 0, description: "Prix maximum en FCFA." },
        min_price: { type: "integer", minimum: 0, description: "Prix minimum en FCFA." },
      },
      required: ["query"],
    },
  },
  {
    name: "search_stores",
    description: "Chercher des boutiques PrestAfrik par nom, activité ou ville.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Nom, activité ou ville." } }, required: ["query"] },
  },
];

async function callServer(name: string, input: Record<string, unknown>) {
  // Le navigateur ne vérifie pas les paramètres : le serveur les valide (zod) et renvoie une erreur lisible.
  const response = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: input } }),
  });
  const data = (await response.json()) as { result?: { structuredContent?: unknown }; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result?.structuredContent ?? null;
}

export function WebMcpTools() {
  useEffect(() => {
    const context = ((document as unknown as { modelContext?: ModelContext }).modelContext ?? (navigator as unknown as { modelContext?: ModelContext }).modelContext) as ModelContext | undefined;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool({ ...tool, execute: (input) => callServer(tool.name, input ?? {}) }, { signal: controller.signal })).catch(() => undefined);
      } catch {
        // Outil déjà enregistré (navigation interne) : rien à faire.
      }
    }
    return () => controller.abort();
  }, []);
  return null;
}
