import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/urls";
import { auth } from "@/modules/auth/server";
import { activeStoreCookie, activeStoreCookieOptions, activeStoreCookieValue } from "@/modules/stores/context";

/**
 * Change la boutique active puis ouvre une page de l'espace vendeur. Sert aux liens qui visent une
 * autre boutique que celle ouverte (ex. « Voir la commande » d'un e-mail, vendeur à plusieurs boutiques).
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("boutique");
  const next = request.nextUrl.searchParams.get("suite") ?? "";
  const target = /^\/dashboard(\/[\w-]+)*$/.test(next) ? next : "/dashboard";

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL(`/connexion?next=${encodeURIComponent(target)}`, appBaseUrl()));

  const response = NextResponse.redirect(new URL(target, appBaseUrl()));
  const membership = storeId
    ? await prisma.storeMembership.findUnique({ where: { storeId_userId: { storeId, userId: session.user.id } }, select: { storeId: true } })
    : null;
  if (membership) {
    response.cookies.set(activeStoreCookie, activeStoreCookieValue(membership.storeId, session.session.id), activeStoreCookieOptions);
    await prisma.user.update({ where: { id: session.user.id }, data: { lastActiveStoreId: membership.storeId } });
  }
  return response;
}
