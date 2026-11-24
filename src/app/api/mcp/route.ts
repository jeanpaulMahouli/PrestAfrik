import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { failure, handleMcpMessage, type RpcRequest } from "@/modules/agents/mcp";

// Serveur MCP de PrestAfrik (lecture seule) : voir modules/agents/mcp.ts. 60 requêtes par minute et par IP.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = limiter.consume(clientIp(request));
  if (!allowed) return Response.json(failure(null, -32000, "Trop de requêtes."), { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(failure(null, -32700, "JSON invalide."), { status: 400 });
  }
  const messages = (Array.isArray(body) ? body : [body]) as RpcRequest[];
  const responses = (await Promise.all(messages.map(handleMcpMessage))).filter(Boolean);
  // Seulement des notifications : accusé de réception sans contenu.
  if (!responses.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0], { headers: { "Cache-Control": "no-store" } });
}

// Pas de flux SSE ouvert par le serveur : GET n'est pas proposé (spécification Streamable HTTP).
export function GET() {
  return new Response("Serveur MCP PrestAfrik : envoyez vos requêtes JSON-RPC en POST.", { status: 405, headers: { Allow: "POST" } });
}
