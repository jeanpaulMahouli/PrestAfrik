"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request-ip";

// Vérification du compte avant l'envoi du lien de réinitialisation (demande du porteur de projet) :
// le vendeur sait tout de suite s'il s'est trompé d'adresse. Contrepartie : la page révèle si une
// adresse a un compte ; la limitation par adresse IP rend l'énumération lente.
const limiter = createRateLimiter({ limit: 8, windowMs: 15 * 60_000 });

export type AccountCheck = { ok: true } | { ok: false; reason: "unknown" | "invalid" | "tooMany" };

export async function checkAccountForReset(email: string): Promise<AccountCheck> {
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (!limiter.consume(`reset:${clientIpFrom(await headers())}`).allowed) return { ok: false, reason: "tooMany" };
  const user = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true } });
  return user ? { ok: true } : { ok: false, reason: "unknown" };
}
