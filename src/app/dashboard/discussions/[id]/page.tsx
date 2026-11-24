import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ConversationThread } from "@/components/support/conversation-thread";
import { VendorReplyForm } from "@/components/support/vendor-reply-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { conversationOf, ticketKindLabels, vendorStatusLabels, type TicketKind } from "@/modules/support/conversation";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Discussion" };

/** Une discussion avec l'équipe : le fil des messages et la réponse du vendeur. */
export default async function DiscussionPage({ params }: PageProps<"/dashboard/discussions/[id]">) {
  const { id } = await params;
  const { session } = await getStoreContext();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, requesterId: session.user.id },
    include: { replies: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true } } } } },
  });
  if (!ticket) notFound();
  // Ouvrir la discussion vaut lecture de ses notifications « réponse de l'équipe ».
  await prisma.vendorNotification.updateMany({ where: { userId: session.user.id, readAt: null, url: `/dashboard/discussions/${ticket.id}` }, data: { readAt: new Date() } }).catch(() => undefined);

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <Link className="v-back-link" href="/dashboard/discussions">
            ← Mes discussions
          </Link>
          <h1 className="v-page-title">{ticket.subject}</h1>
          <p className="v-page-subtitle">
            {ticketKindLabels[ticket.kind as TicketKind] ?? ticket.kind} · <Badge>{vendorStatusLabels[ticket.status]}</Badge>
          </p>
        </div>
      </div>
      <section className="v-card conv-card">
        <ConversationThread messages={conversationOf(ticket)} viewer="vendor" />
        <VendorReplyForm ticketId={ticket.id} />
      </section>
    </VendorShell>
  );
}
