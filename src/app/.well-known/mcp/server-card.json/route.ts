import { absoluteUrl } from "@/lib/seo";
import { serverInfo, tools } from "@/modules/agents/mcp";

// Carte du serveur MCP (SEP-1649 / SEP-2127) : où le trouver et ce qu'il propose.
export const revalidate = 3600;

export function GET() {
  const endpoint = absoluteUrl("/api/mcp");
  return Response.json(
    {
      $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
      version: "1.0",
      protocolVersion: "2025-06-18",
      serverInfo,
      description: "Recherche de produits et de boutiques sur la marketplace PrestAfrik (Cameroun), en lecture seule.",
      documentationUrl: absoluteUrl("/llms.txt"),
      endpoint,
      transport: { type: "streamable-http", url: endpoint },
      remotes: [{ type: "streamable-http", url: endpoint }],
      capabilities: { tools: { listChanged: false } },
      authentication: { required: false },
      tools: tools.map(({ name, title, description }) => ({ name, title, description })),
    },
    { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
