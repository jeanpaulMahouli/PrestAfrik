// Libellés et règles d'une conversation (demande d'aide, question, idée ou avis), partagés entre l'espace
// vendeur et l'administration. Fichier sans dépendance serveur.

export const ticketKindLabels = { CONTACT: "Contact", REVIEW: "Avis", SUGGESTION: "Idée", QUESTION: "Question" } as const;
export type TicketKind = keyof typeof ticketKindLabels;

/** Statut vu par le vendeur : qui doit parler maintenant. */
export const vendorStatusLabels = { OPEN: "En attente de l’équipe", IN_PROGRESS: "Réponse reçue", RESOLVED: "Terminée" } as const;

/** Statut vu par l'équipe. */
export const teamStatusLabels = { OPEN: "À traiter", IN_PROGRESS: "En attente du vendeur", RESOLVED: "Traitée" } as const;
export type TicketStatus = keyof typeof teamStatusLabels;

/** Message de la conversation : la demande d'origine, puis chaque réponse (équipe ou vendeur). */
export type ConversationMessage = { id: string; fromTeam: boolean; author: string; body: string; at: Date };

export function conversationOf(ticket: {
  id: string;
  message: string;
  requesterName: string;
  requesterId: string | null;
  createdAt: Date;
  replies: { id: string; body: string; createdAt: Date; authorId: string | null; author: { name: string } | null }[];
}): ConversationMessage[] {
  return [
    { id: `${ticket.id}-0`, fromTeam: false, author: ticket.requesterName, body: ticket.message, at: ticket.createdAt },
    ...ticket.replies.map((reply) => {
      const fromVendor = Boolean(reply.authorId && reply.authorId === ticket.requesterId);
      return { id: reply.id, fromTeam: !fromVendor, author: fromVendor ? ticket.requesterName : (reply.author?.name ?? "Équipe PrestAfrik"), body: reply.body, at: reply.createdAt };
    }),
  ];
}
