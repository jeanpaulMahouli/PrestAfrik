import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/modules/admin/context";
import { auth } from "@/modules/auth/server";
import { countUnreadSystemNotifications, listSystemNotifications, systemNotificationTypeLabels, type SystemNotificationType } from "@/modules/system/notifications";

// Cloche de l'administration : interrogée toutes les 60 secondes par le navigateur de l'administrateur.

async function adminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session && (await isPlatformAdmin(session.user.id)) ? session : null;
}

const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await adminSession())) return new NextResponse("Introuvable.", { status: 404 });
  const [unread, items] = await Promise.all([countUnreadSystemNotifications(), listSystemNotifications({ take: 8 })]);
  return NextResponse.json(
    {
      unread,
      items: items.map((item) => ({
        id: item.id,
        type: systemNotificationTypeLabels[item.type as SystemNotificationType] ?? item.type,
        severity: item.severity,
        message: item.message,
        occurrences: item.occurrences,
        lastSeenAt: item.lastSeenAt.toISOString(),
        read: Boolean(item.readAt),
      })),
    },
    { headers: noStore },
  );
}

const markSchema = z.object({ all: z.literal(true) }).or(z.object({ id: z.string().min(1).max(40) }));

/** Marque comme lue une notification, ou toutes. */
export async function POST(request: Request) {
  if (!(await adminSession())) return new NextResponse("Introuvable.", { status: 404 });
  const body = markSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  const now = new Date();
  if ("all" in body.data) await prisma.systemNotification.updateMany({ where: { readAt: null }, data: { readAt: now } });
  else await prisma.systemNotification.updateMany({ where: { id: body.data.id, readAt: null }, data: { readAt: now } });
  return NextResponse.json({ unread: await countUnreadSystemNotifications() }, { headers: noStore });
}
