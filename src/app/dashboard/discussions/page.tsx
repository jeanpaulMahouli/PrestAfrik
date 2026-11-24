import Link from "next/link";
import { NewDiscussionButton } from "@/components/dashboard/community";
import { timeAgo } from "@/components/dashboard/vendor-bell";
import { VendorShell } from "@/components/layout/vendor-shell";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ticketKindLabels, vendorStatusLabels, type TicketKind } from "@/modules/support/conversation";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Mes discussions" };

const tones = { OPEN: "neutral", IN_PROGRESS: "success", RESOLVED: "neutral" } as const;

/** Les échanges du vendeur avec l'équipe PrestAfrik : questions, idées, avis. */
export default async function DiscussionsPage() {
  const { session } = await getStoreContext();
  const tickets = await prisma.supportTicket.findMany({
    where: { requesterId: session.user.id },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: { id: true, kind: true, subject: true, status: true, lastMessageAt: true, _count: { select: { replies: true } } },
  });

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Mes discussions</h1>
          <p className="v-page-subtitle">Vos échanges avec l’équipe PrestAfrik.</p>
        </div>
        <div className="v-page-actions">
          <NewDiscussionButton>Nouvelle question</NewDiscussionButton>
        </div>
      </div>
      {tickets.length ? (
        <ul className="v-card v-card-flush conv-list">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link className={`conv-row${ticket.status === "IN_PROGRESS" ? " is-unread" : ""}`} href={`/dashboard/discussions/${ticket.id}`}>
                <span className="conv-row-main">
                  <strong>{ticket.subject}</strong>
                  <small>
                    {ticketKindLabels[ticket.kind as TicketKind] ?? ticket.kind} · {ticket._count.replies} réponse{ticket._count.replies > 1 ? "s" : ""} · {timeAgo(ticket.lastMessageAt)}
                  </small>
                </span>
                <Badge tone={tones[ticket.status]}>{vendorStatusLabels[ticket.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="v-card v-empty">
          <h2>Aucune discussion</h2>
          <p>Une question, une idée ? L’équipe vous répond ici.</p>
          <NewDiscussionButton>Poser une question</NewDiscussionButton>
        </div>
      )}
    </VendorShell>
  );
}
