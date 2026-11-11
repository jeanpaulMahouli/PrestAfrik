"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

// Abonnement de l'appareil du vendeur connecté aux notifications push (bouton « Activer les notifications »).

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Plafond d'appareils par compte : les plus anciens sont retirés au-delà. */
const maxDevicesPerUser = 10;

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const parsed = subscriptionSchema.safeParse(input);
  if (!session || !parsed.success) return { ok: false };
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { endpoint, keys } = parsed.data;
  // Un appareil n'appartient qu'à un compte : la dernière personne connectée sur ce navigateur le reprend.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id, userAgent },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id, userAgent, failureCount: 0 },
  });
  const extra = await prisma.pushSubscription.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, skip: maxDevicesPerUser, select: { id: true } });
  if (extra.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
  return { ok: true };
}

export async function removePushSubscription(endpoint: unknown): Promise<{ ok: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  const value = z.string().url().max(1000).safeParse(endpoint);
  if (!session || !value.success) return { ok: false };
  await prisma.pushSubscription.deleteMany({ where: { endpoint: value.data, userId: session.user.id } });
  return { ok: true };
}
