import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AdminFeedback, searchValue } from "@/components/admin/admin-feedback";
import { InboxReply } from "@/components/admin/inbox-reply";
import { ConversationThread } from "@/components/support/conversation-thread";
import { Badge } from "@/components/ui/badge";
import { Star } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/config/statuses";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { updateTicket } from "@/modules/support/actions";
import { conversationOf, teamStatusLabels, ticketKindLabels, type TicketKind, type TicketStatus } from "@/modules/support/conversation";

export const metadata = { title: "Messagerie" };

/**
 * Messagerie de l'équipe : toutes les conversations (questions, idées et avis des vendeurs, formulaire de
 * contact du site) dans une seule boîte. Liste à gauche, conversation à droite.
 * Règles : une réponse de l'équipe met la conversation « En attente du vendeur » ; une réponse du vendeur la
 * remet « À traiter » ; sans réponse du vendeur pendant 14 jours, elle passe « Traitée » d'elle-même ;
 * un avis 4 ou 5 étoiles sans commentaire est « Traité » dès son arrivée.
 */
const views = {
  "a-traiter": { label: "À traiter", where: { status: "OPEN" } },
  attente: { label: "En attente du vendeur", where: { status: "IN_PROGRESS" } },
  traitees: { label: "Traitées", where: { status: "RESOLVED" } },
  toutes: { label: "Toutes", where: {} },
} as const satisfies Record<string, { label: string; where: Prisma.SupportTicketWhereInput }>;
type View = keyof typeof views;
const statusTones: Record<TicketStatus, Tone> = { OPEN: "warning", IN_PROGRESS: "info", RESOLVED: "success" };
const kinds = Object.keys(ticketKindLabels) as TicketKind[];

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} sur 5`} className="admin-stars" role="img">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star aria-hidden="true" key={step} size={13} weight={step <= value ? "fill" : "regular"} />
      ))}
    </span>
  );
}

export default async function AdminInboxPage({ searchParams }: PageProps<"/admin/avis">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const view: View = Object.hasOwn(views, searchValue(params, "vue")) ? (searchValue(params, "vue") as View) : "a-traiter";
  const kindParam = searchValue(params, "type") as TicketKind;
  const kind = kinds.includes(kindParam) ? kindParam : undefined;
  const query = searchValue(params, "q", 60);
  const selectedId = searchValue(params, "ticket", 64);

  const where: Prisma.SupportTicketWhereInput = {
    ...views[view].where,
    ...(kind ? { kind } : {}),
    ...(query
      ? { OR: [{ subject: { contains: query, mode: "insensitive" } }, { requesterName: { contains: query, mode: "insensitive" } }, { requesterEmail: { contains: query, mode: "insensitive" } }, { store: { name: { contains: query, mode: "insensitive" } } }] }
      : {}),
  };
  const [items, statusCounts, average, admins] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 80,
      select: { id: true, kind: true, status: true, subject: true, message: true, rating: true, requesterName: true, lastMessageAt: true, store: { select: { name: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.supportTicket.aggregate({ where: { kind: "REVIEW" }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.user.findMany({ where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] }, suspendedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const selected = selectedId
    ? await prisma.supportTicket.findUnique({
        where: { id: selectedId },
        include: {
          store: { select: { name: true, slug: true } },
          assignedTo: { select: { id: true, name: true } },
          replies: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true } } } },
        },
      })
    : null;
  const countOf = (status: TicketStatus) => statusCounts.find((row) => row.status === status)?._count._all ?? 0;
  const viewCount: Record<View, number> = { "a-traiter": countOf("OPEN"), attente: countOf("IN_PROGRESS"), traitees: countOf("RESOLVED"), toutes: statusCounts.reduce((sum, row) => sum + row._count._all, 0) };
  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(Object.entries({ vue: view === "a-traiter" ? undefined : view, type: kind, q: query || undefined, ...changes }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return next.size ? `/admin/avis?${next.toString()}` : "/admin/avis";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Messagerie</h1>
          <p className="v-page-subtitle">
            Note des vendeurs : {average._count.rating ? `${(average._avg.rating ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5 (${average._count.rating} avis)` : "pas encore d’avis"}
          </p>
        </div>
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Conversations" className="pill-tabs">
        {(Object.keys(views) as View[]).map((key) => (
          <Link aria-current={view === key ? "page" : undefined} href={href({ vue: key === "a-traiter" ? undefined : key, ticket: undefined })} key={key}>
            {views[key].label} ({viewCount[key]})
          </Link>
        ))}
      </nav>

      <div className={`inbox${selected ? " has-selection" : ""}`}>
        <section aria-label="Liste des conversations" className="v-card v-card-flush inbox-list">
          <form className="inbox-filters" role="search">
            {view !== "a-traiter" && <input name="vue" type="hidden" value={view} />}
            <label className="visually-hidden" htmlFor="inbox-q">
              Rechercher
            </label>
            <input defaultValue={query} id="inbox-q" maxLength={60} name="q" placeholder="Nom, boutique, sujet…" type="search" />
            <label className="visually-hidden" htmlFor="inbox-type">
              Type
            </label>
            <select defaultValue={kind ?? ""} id="inbox-type" name="type">
              <option value="">Tous les types</option>
              {kinds.map((value) => (
                <option key={value} value={value}>
                  {ticketKindLabels[value]}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" type="submit">
              Filtrer
            </button>
          </form>
          {items.length ? (
            <ul className="inbox-items">
              {items.map((item) => (
                <li key={item.id}>
                  <Link aria-current={selected?.id === item.id ? "true" : undefined} className={`inbox-item${item.status === "OPEN" ? " is-open" : ""}`} href={href({ ticket: item.id })}>
                    <span className="inbox-item-top">
                      <strong>{item.store?.name ?? item.requesterName}</strong>
                      <small>{formatDateTime(item.lastMessageAt)}</small>
                    </span>
                    <span className="inbox-item-subject">
                      <Badge>{ticketKindLabels[item.kind as TicketKind] ?? item.kind}</Badge>
                      {item.rating ? <Stars value={item.rating} /> : null}
                      <span>{item.subject}</span>
                    </span>
                    <span className="inbox-item-snippet">{item.message}</span>
                    {item.assignedTo && <small className="inbox-item-owner">Suivi par {item.assignedTo.name}</small>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="v-empty">
              <h2>{view === "a-traiter" ? "Tout est traité" : "Aucune conversation"}</h2>
              <p>{view === "a-traiter" ? "Aucun message n’attend de réponse." : "Essayez un autre filtre."}</p>
            </div>
          )}
        </section>

        <section aria-label="Conversation" className="v-card inbox-detail">
          {selected ? (
            <>
              <header className="inbox-detail-head">
                <Link className="v-back-link inbox-back" href={href({ ticket: undefined })}>
                  ← Retour à la liste
                </Link>
                <div className="inbox-detail-title">
                  <h2>{selected.subject}</h2>
                  <Badge tone={statusTones[selected.status]}>{teamStatusLabels[selected.status]}</Badge>
                </div>
                <p className="v-small v-muted">
                  {selected.requesterName} · <a href={`mailto:${selected.requesterEmail}`}>{selected.requesterEmail}</a>
                  {selected.store && (
                    <>
                      {" "}· <a href={`/${selected.store.slug}`} rel="noopener noreferrer" target="_blank">{selected.store.name}</a>
                    </>
                  )}
                  {selected.rating ? (
                    <>
                      {" "}· <Stars value={selected.rating} />
                    </>
                  ) : null}
                </p>
              </header>
              <ConversationThread messages={conversationOf(selected)} viewer="team" />
              <InboxReply email={selected.requesterEmail} firstName={selected.requesterName.split(/\s+/)[0] ?? selected.requesterName} ticketId={selected.id} view={view} />
              <form action={updateTicket} className="inbox-settings">
                <input name="ticketId" type="hidden" value={selected.id} />
                <input name="retour" type="hidden" value="avis" />
                <input name="vue" type="hidden" value={view} />
                <label className="v-field">
                  Statut
                  <select defaultValue={selected.status} name="status">
                    {(Object.keys(teamStatusLabels) as TicketStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {teamStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="v-field">
                  Suivi par
                  <select defaultValue={selected.assignedTo?.id ?? ""} name="assignedToId">
                    <option value="">Personne</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton className="btn btn-secondary" pendingLabel="…">
                  Mettre à jour
                </SubmitButton>
              </form>
            </>
          ) : (
            <div className="v-empty inbox-placeholder">
              <h2>Choisissez une conversation</h2>
              <p>Le fil des messages et la réponse s’affichent ici.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
