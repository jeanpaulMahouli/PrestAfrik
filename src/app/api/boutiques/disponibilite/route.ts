import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/modules/auth/server";
import { checkSlug, slugMessages, slugSuggestions } from "@/modules/stores/slug";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/** Vérification en direct de la disponibilité d'une adresse de boutique (assistant, étape 1). */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const { allowed, retryAfterSeconds } = limiter.consume(`${session.user.id}:${clientIp(request)}`);
  if (!allowed) return NextResponse.json({ error: "Trop de vérifications. Patientez quelques secondes." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });

  const params = new URL(request.url).searchParams;
  const slug = (params.get("slug") ?? "").trim().toLowerCase();
  const name = (params.get("nom") ?? slug).slice(0, 60);
  const city = params.get("ville");
  const excludeStoreId = params.get("boutique");
  const issue = checkSlug(slug);

  const candidates = slugSuggestions(name || slug, city);
  const taken = await prisma.store.findMany({
    where: { slug: { in: [slug, ...candidates] }, ...(excludeStoreId ? { id: { not: excludeStoreId } } : {}) },
    select: { slug: true },
  });
  const takenSet = new Set(taken.map((store) => store.slug));
  const suggestions = candidates.filter((candidate) => !takenSet.has(candidate)).slice(0, 3);

  if (issue) return NextResponse.json({ available: false, message: slugMessages[issue], suggestions });
  if (takenSet.has(slug)) return NextResponse.json({ available: false, message: slugMessages.taken, suggestions });
  return NextResponse.json({ available: true, suggestions });
}
