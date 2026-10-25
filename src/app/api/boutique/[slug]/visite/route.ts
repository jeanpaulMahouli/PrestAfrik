import { prisma } from "@/lib/prisma";
import { dayColumn } from "@/lib/dashboard-periods";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/modules/auth/server";

// Compteur de visites de la boutique publique (une par visite et par onglet, envoyée par la vitrine).
// Rien n'est enregistré sur le visiteur : seulement +1 sur le jour de la boutique.

const botPattern = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|headless|lighthouse|curl|wget|python|node-fetch|axios/i;
// Au plus 30 visites comptées par adresse IP et par heure (protège le compteur contre les envois en boucle).
const limiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

export async function POST(request: Request, { params }: RouteContext<"/api/boutique/[slug]/visite">) {
  const { slug } = await params;
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || botPattern.test(userAgent) || !/^[a-z0-9-]{1,60}$/.test(slug)) return new Response(null, { status: 204 });
  if (!limiter.consume(clientIp(request)).allowed) return new Response(null, { status: 204 });

  const store = await prisma.store.findFirst({ where: { slug, isPublished: true, suspendedAt: null }, select: { id: true } });
  if (!store) return new Response(null, { status: 204 });

  // Le vendeur et son équipe qui regardent leur boutique ne sont pas comptés.
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (session && (await prisma.storeMembership.findUnique({ where: { storeId_userId: { storeId: store.id, userId: session.user.id } }, select: { id: true } }))) {
    return new Response(null, { status: 204 });
  }

  const day = dayColumn(new Date());
  await prisma.$executeRaw`
    INSERT INTO "StoreVisitDay" ("storeId", "day", "visits") VALUES (${store.id}, ${day}::date, 1)
    ON CONFLICT ("storeId", "day") DO UPDATE SET "visits" = "StoreVisitDay"."visits" + 1
  `;
  return new Response(null, { status: 204 });
}
