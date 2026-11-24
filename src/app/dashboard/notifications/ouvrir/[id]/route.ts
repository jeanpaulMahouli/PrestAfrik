import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

// Ouvrir une notification depuis la page « Notifications » : elle est marquée lue, puis sa page s'ouvre.
export async function GET(request: Request, { params }: RouteContext<"/dashboard/notifications/ouvrir/[id]">) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url));
  const notification = await prisma.vendorNotification.findFirst({ where: { id, userId: session.user.id }, select: { id: true, url: true, readAt: true } });
  if (!notification) return NextResponse.redirect(new URL("/dashboard/notifications", request.url));
  if (!notification.readAt) await prisma.vendorNotification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  return NextResponse.redirect(new URL(notification.url ?? "/dashboard/notifications", request.url));
}
