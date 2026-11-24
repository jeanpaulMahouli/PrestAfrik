import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/modules/auth/server";
import { countUnreadNotifications, listNotifications, markNotificationsRead } from "@/modules/notifications/vendor";

// Cloche du tableau de bord : notifications de la personne connectée (lecture et « lu »).

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Non connecté" }, { status: 401 });
  const [unread, items] = await Promise.all([countUnreadNotifications(userId), listNotifications(userId, { take: 8 })]);
  return Response.json({ unread, items }, { headers: { "Cache-Control": "no-store" } });
}

const bodySchema = z.union([z.object({ all: z.literal(true) }), z.object({ id: z.string().min(10).max(40) })]);

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Non connecté" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requête invalide" }, { status: 400 });
  const unread = await markNotificationsRead(userId, "id" in parsed.data ? parsed.data.id : undefined);
  return Response.json({ unread });
}
