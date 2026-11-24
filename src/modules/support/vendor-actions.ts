"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStoreContext } from "@/modules/stores/context";

// Discussions du vendeur avec l'équipe PrestAfrik (questions, idées, avis). Le vendeur répond dans
// l'application ; sa réponse rouvre la conversation dans la boîte de réception de l'administration.

export type VendorReplyState = null | { ok: boolean; message: string };

const replySchema = z.object({
  ticketId: z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/),
  body: z.string().trim().min(2, "Écrivez votre message.").max(2000, "2 000 caractères au maximum."),
});

/** Au plus 20 réponses par conversation et par jour (protection contre les envois en rafale). */
const dailyRepliesLimit = 20;

export async function vendorReplyToTicket(_previous: VendorReplyState, formData: FormData): Promise<VendorReplyState> {
  const { session } = await getStoreContext();
  const parsed = replySchema.safeParse({ ticketId: formData.get("ticketId"), body: formData.get("body") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Message invalide." };
  const ticket = await prisma.supportTicket.findFirst({ where: { id: parsed.data.ticketId, requesterId: session.user.id }, select: { id: true } });
  if (!ticket) return { ok: false, message: "Conversation introuvable." };
  const recent = await prisma.supportTicketMessage.count({ where: { ticketId: ticket.id, authorId: session.user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (recent >= dailyRepliesLimit) return { ok: false, message: "Beaucoup de messages aujourd’hui : l’équipe vous répond au plus vite." };

  const now = new Date();
  await prisma.$transaction([
    prisma.supportTicketMessage.create({ data: { ticketId: ticket.id, authorId: session.user.id, body: parsed.data.body } }),
    // Le vendeur a répondu : la conversation revient « À traiter » pour l'équipe.
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN", lastMessageAt: now } }),
  ]);
  revalidatePath(`/dashboard/discussions/${ticket.id}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Message envoyé." };
}
