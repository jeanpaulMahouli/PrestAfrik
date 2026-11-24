import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { getProspectionMessages, listProspects, parseProspectionFilters, prospectWhatsappUrl } from "@/modules/admin/prospection";

/**
 * Bouton WhatsApp de la Prospection : la prise de contact est enregistrée (qui, quand), puis WhatsApp s'ouvre
 * avec le message adapté au filtre. L'équipe voit ainsi qui a déjà été contacté et quand relancer.
 */
export async function GET(request: Request) {
  const admin = await requirePlatformAdmin();
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const filters = parseProspectionFilters(url.searchParams.getAll("filtre"));
  const [{ rows }, messages] = await Promise.all([listProspects({ filters: [] }), getProspectionMessages()]);
  const row = rows.find((item) => item.id === userId);
  const target = row ? prospectWhatsappUrl(row, filters, messages) : null;
  if (!row || !target) return NextResponse.redirect(new URL("/admin/prospection?erreur=Aucun%20num%C3%A9ro%20WhatsApp%20pour%20cette%20personne.", request.url));
  await prisma.prospectContact.create({ data: { userId: row.id, adminId: admin.id, channel: "whatsapp" } }).catch(() => undefined);
  return NextResponse.redirect(target);
}
