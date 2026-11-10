"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request-ip";
import { uuid } from "@/lib/uuid";
import { visitorCookie, type LikeSummary } from "./likes";

// 30 « j'aime » par adresse IP et par minute : largement assez pour un visiteur, dissuasif pour un robot.
const likeLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/**
 * « J'aime » (cœur) sur une fiche produit de la marketplace : ajoute le j'aime du visiteur, ou le retire
 * s'il l'avait déjà mis. Un seul par visiteur et par produit ; le produit doit être en vente dans une
 * boutique publiée et non suspendue.
 */
export async function toggleProductLike(productId: string): Promise<LikeSummary | { error: string }> {
  if (!z.cuid().safeParse(productId).success) return { error: "Produit introuvable." };
  if (!likeLimiter.consume(clientIpFrom(await headers())).allowed) return { error: "Trop de clics : réessayez dans une minute." };
  const product = await prisma.product.findFirst({ where: { id: productId, status: "ACTIVE", archivedAt: null, store: { isPublished: true, suspendedAt: null } }, select: { id: true } });
  if (!product) return { error: "Produit introuvable." };

  const jar = await cookies();
  let visitorId = jar.get(visitorCookie)?.value ?? "";
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    visitorId = uuid();
    jar.set(visitorCookie, visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 * 2 });
  }

  try {
    const key = { productId_visitorId: { productId, visitorId } };
    const existing = await prisma.productLike.findUnique({ where: key, select: { productId: true } });
    if (existing) await prisma.productLike.delete({ where: key });
    else await prisma.productLike.create({ data: { productId, visitorId } });
    const count = await prisma.productLike.count({ where: { productId } });
    return { count, liked: !existing };
  } catch {
    return { error: "Impossible d’enregistrer votre j’aime pour le moment." };
  }
}
