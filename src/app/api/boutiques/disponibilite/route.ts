import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { isPlatformAdmin } from "@/modules/admin/context";
import { auth } from "@/modules/auth/server";
import { brandSlug, brandSlugMessage, usesBrandSlug } from "@/modules/stores/brand";
import { checkSlug, slugMessages, slugSuggestions } from "@/modules/stores/slug";
import { takenSlugs } from "@/modules/stores/slug-availability";

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
  // L'adresse « prestafrik » (et celles qui la contiennent) est réservée à l'administrateur de la plateforme.
  const admin = await isPlatformAdmin(session.user.id);
  const brandIssue = usesBrandSlug(slug) && !admin;
  const issue = admin && slug === brandSlug ? null : checkSlug(slug);

  const candidates = slugSuggestions(name || slug, city).filter((candidate) => admin || !usesBrandSlug(candidate));
  const takenSet = await takenSlugs([slug, ...candidates], excludeStoreId);
  const suggestions = candidates.filter((candidate) => !takenSet.has(candidate)).slice(0, 3);

  if (brandIssue) return NextResponse.json({ available: false, message: brandSlugMessage, suggestions });
  if (issue) return NextResponse.json({ available: false, message: slugMessages[issue], suggestions });
  if (takenSet.has(slug)) return NextResponse.json({ available: false, message: slugMessages.taken, suggestions });
  return NextResponse.json({ available: true, suggestions });
}
