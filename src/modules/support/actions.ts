"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminRole, logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { sendEmailQuietly } from "@/modules/email/server";

// Demandes d'aide (Alertes → Tickets) : réponse par e-mail, statut, administrateur assigné.

const ticketsPath = "/admin/alertes?onglet=tickets";
/** Pages qui affichent les messages reçus (retour après une action) : liste fermée, aucune adresse libre. */
const returnPaths = { tickets: ticketsPath, avis: "/admin/avis?" } as const;
const idSchema = z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/);
type Back = (message: string, kind?: "succes" | "erreur", ticketId?: string) => never;

/** Retour vers la page d'origine (champ « retour » du formulaire), avec le message et le ticket ouvert. */
function backTo(formData: FormData): Back {
  const returnTo: string = formData.get("retour") === "avis" ? returnPaths.avis : returnPaths.tickets;
  return (message: string, kind: "succes" | "erreur" = "succes", ticketId?: string): never => {
    const separator = returnTo.endsWith("?") ? "" : "&";
    redirect(`${returnTo}${ticketId ? `${separator}ticket=${ticketId}&` : separator}${kind}=${encodeURIComponent(message)}`);
  };
}

export async function replyToTicket(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const back: Back = backTo(formData);
  const ticketId = idSchema.safeParse(formData.get("ticketId"));
  const body = z.string().trim().min(5, "Votre réponse doit contenir au moins 5 caractères.").max(4000, "La réponse ne peut pas dépasser 4 000 caractères.").safeParse(formData.get("body"));
  if (!ticketId.success) back("Demande introuvable.", "erreur");
  if (!body.success) back(body.error.issues[0]?.message ?? "Réponse invalide.", "erreur", ticketId.data);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId.data }, select: { id: true, subject: true, requesterName: true, requesterEmail: true, status: true, assignedToId: true } });
  if (!ticket) back("Demande introuvable.", "erreur");

  await prisma.$transaction(async (tx) => {
    await tx.supportTicketMessage.create({ data: { ticketId: ticket.id, authorId: admin.id, body: body.data } });
    // Première réponse : la demande passe « en cours » et revient à l'administrateur qui répond.
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { ...(ticket.status === "OPEN" ? { status: "IN_PROGRESS" } : {}), ...(ticket.assignedToId ? {} : { assignedToId: admin.id }) },
    });
    await logAdminAction(admin.id, { action: "ticket.reply", targetType: "ticket", targetId: ticket.id }, tx);
  });
  // null = échec de l'envoi (les adresses de test et l'absence de SMTP en développement ne sont pas des échecs).
  const sent = null !== await sendEmailQuietly("E27", ticket.requesterEmail, { prenom: ticket.requesterName.split(/\s+/)[0], sujet: ticket.subject, reponse: body.data });
  revalidatePath("/admin", "layout");
  back(sent ? `Réponse envoyée à ${ticket.requesterEmail}.` : "Réponse enregistrée, mais l’e-mail n’a pas pu partir : vérifiez la configuration des e-mails.", sent ? "succes" : "erreur", ticket.id);
}

export async function updateTicket(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const back: Back = backTo(formData);
  const ticketId = idSchema.safeParse(formData.get("ticketId"));
  const status = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).safeParse(formData.get("status"));
  const assignee = z.string().max(64).safeParse(formData.get("assignedToId") ?? "");
  if (!ticketId.success || !status.success || !assignee.success) back("Demande invalide. Rechargez la page.", "erreur");
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId.data }, select: { id: true } });
  if (!ticket) back("Demande introuvable.", "erreur");
  let assignedToId: string | null = null;
  if (assignee.data) {
    const target = await prisma.user.findUnique({ where: { id: assignee.data }, select: { id: true, platformRole: true } });
    if (!target || !isAdminRole(target.platformRole)) back("Choisissez un administrateur.", "erreur", ticket.id);
    assignedToId = target.id;
  }
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticket.id }, data: { status: status.data, assignedToId } });
    await logAdminAction(admin.id, { action: "ticket.update", targetType: "ticket", targetId: ticket.id, details: { status: status.data, assignedToId } }, tx);
  });
  revalidatePath("/admin", "layout");
  back("Demande mise à jour.", "succes", ticket.id);
}
