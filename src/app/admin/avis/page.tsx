import { Star } from "lucide-react";
import Link from "next/link";
import { AdminFeedback, searchValue } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/config/statuses";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { replyToTicket, updateTicket } from "@/modules/support/actions";

export const metadata = { title: "Messages et avis" };

const kinds = { REVIEW: "Avis", SUGGESTION: "Suggestions", QUESTION: "Questions" } as const;
type Kind = keyof typeof kinds;
const statusLabels = { OPEN: "Nouveau", IN_PROGRESS: "En cours", RESOLVED: "Traité" } as const;
const statusTones: Record<keyof typeof statusLabels, Tone> = { OPEN: "warning", IN_PROGRESS: "info", RESOLVED: "success" };

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} sur 5`} className="admin-stars" role="img">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star aria-hidden="true" fill={step <= value ? "currentColor" : "none"} key={step} size={15} />
      ))}
    </span>
  );
}

/** Messages des vendeurs (bloc Communauté du tableau de bord) : avis notés, suggestions et questions. */
export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/avis">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const kindParam = searchValue(params, "type") as Kind;
  const kind = Object.hasOwn(kinds, kindParam) ? kindParam : undefined;
  const selected = searchValue(params, "ticket");
  const where = { kind: kind ?? { in: ["REVIEW", "SUGGESTION", "QUESTION"] as Kind[] } };
  const [items, counts, average, admins] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        store: { select: { name: true, slug: true } },
        assignedTo: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      },
    }),
    prisma.supportTicket.groupBy({ by: ["kind"], where: { kind: { in: ["REVIEW", "SUGGESTION", "QUESTION"] } }, _count: { _all: true } }),
    prisma.supportTicket.aggregate({ where: { kind: "REVIEW" }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.user.findMany({ where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const count = (value: Kind) => counts.find((row) => row.kind === value)?._count._all ?? 0;
  const total = (Object.keys(kinds) as Kind[]).reduce((sum, value) => sum + count(value), 0);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Messages et avis</h1>
          <p className="v-page-subtitle">Ce que les vendeurs pensent de PrestAfrik, leurs idées et leurs questions. Votre réponse leur est envoyée par e-mail.</p>
        </div>
      </div>
      <AdminFeedback params={params} />

      <section aria-label="Note moyenne" className="kpi-grid">
        <article className="kpi-card">
          <Star aria-hidden="true" className="kpi-icon kpi-icon-orange" size={26} />
          <p className="kpi-value">{average._count.rating ? `${(average._avg.rating ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5` : "—"}</p>
          <p className="kpi-label">Note moyenne ({average._count.rating} avis)</p>
        </article>
      </section>

      <nav aria-label="Type de message" className="pill-tabs">
        <Link aria-current={!kind ? "page" : undefined} href="/admin/avis">
          Tous ({total})
        </Link>
        {(Object.keys(kinds) as Kind[]).map((value) => (
          <Link aria-current={kind === value ? "page" : undefined} href={`/admin/avis?type=${value}`} key={value}>
            {kinds[value]} ({count(value)})
          </Link>
        ))}
      </nav>

      {items.length ? (
        <ul className="admin-alerts">
          {items.map((item) => (
            <li className="v-card ticket" key={item.id}>
              <details open={selected === item.id || items.length === 1}>
                <summary className="ticket-summary">
                  <Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge>
                  <Badge>{kinds[item.kind as Kind] ?? item.kind}</Badge>
                  {item.rating ? <Stars value={item.rating} /> : null}
                  <strong>{item.store?.name ?? item.requesterName}</strong>
                  <span className="v-muted v-small">
                    {item.requesterName} · {formatDateTime(item.createdAt)}
                  </span>
                </summary>
                <div className="ticket-body">
                  <p className="v-small v-muted">
                    De {item.requesterName} (<a href={`mailto:${item.requesterEmail}`}>{item.requesterEmail}</a>)
                    {item.store && (
                      <>
                        {" "}· boutique <a href={`/${item.store.slug}`} rel="noopener noreferrer" target="_blank">{item.store.name}</a>
                      </>
                    )}
                  </p>
                  <blockquote className="ticket-message">{item.message}</blockquote>
                  {item.replies.map((reply) => (
                    <div className="ticket-reply" key={reply.id}>
                      <small>
                        Réponse de {reply.author?.name ?? "l’équipe"} le {formatDateTime(reply.createdAt)}
                      </small>
                      <p>{reply.body}</p>
                    </div>
                  ))}
                  <form action={replyToTicket} className="ticket-form">
                    <input name="ticketId" type="hidden" value={item.id} />
                    <input name="retour" type="hidden" value="avis" />
                    <label className="v-field">
                      Répondre par e-mail à {item.requesterName}
                      <textarea maxLength={4000} minLength={5} name="body" placeholder="Bonjour, merci pour votre message…" required rows={4} />
                    </label>
                    <SubmitButton className="btn btn-primary" pendingLabel="Envoi…">
                      Envoyer la réponse
                    </SubmitButton>
                  </form>
                  <form action={updateTicket} className="ticket-settings">
                    <input name="ticketId" type="hidden" value={item.id} />
                    <input name="retour" type="hidden" value="avis" />
                    <label className="v-field">
                      Statut
                      <select defaultValue={item.status} name="status">
                        {(Object.keys(statusLabels) as (keyof typeof statusLabels)[]).map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="v-field">
                      Suivi par
                      <select defaultValue={item.assignedTo?.id ?? ""} name="assignedToId">
                        <option value="">Personne</option>
                        {admins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">
                      Enregistrer
                    </SubmitButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <div className="v-card v-empty">
          <h2>Aucun message pour le moment</h2>
          <p>Les avis, suggestions et questions envoyés depuis le bloc « Communauté » du tableau de bord des vendeurs arrivent ici.</p>
        </div>
      )}
    </>
  );
}
