import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dayColumn } from "@/lib/dashboard-periods";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-guards";
import { auth } from "@/modules/auth/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  event: z.enum(["install", "open"]),
  platform: z.enum(["android", "ios", "desktop"]),
});

/**
 * Application PrestAfrik (PWA) : installation détectée (« appinstalled ») ou ouverture depuis l'écran d'accueil
 * (une fois par jour et par appareil, components/pwa/install-app.tsx). Sert à l'administration (Application,
 * Statistiques). Sans session, rien n'est enregistré.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse(null, { status: 204 });

  const now = new Date();
  const userId = session.user.id;
  const { event, platform } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { appInstalledAt: true } });
  if (!user) return new NextResponse(null, { status: 204 });

  // Une ouverture depuis l'écran d'accueil prouve aussi l'installation (iPhone ne signale pas « appinstalled »).
  await prisma.user.update({
    where: { id: userId },
    data: {
      appInstalledAt: user.appInstalledAt ?? now,
      appPlatform: platform,
      ...(event === "open" ? { appLastOpenedAt: now } : {}),
    },
  });
  if (event === "open") {
    const day = dayColumn(now);
    await prisma.appUsageDay.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, platform },
      update: { opens: { increment: 1 }, platform },
    });
  }
  return new NextResponse(null, { status: 204 });
}
