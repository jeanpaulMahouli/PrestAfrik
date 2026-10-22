import Link from "next/link";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { notifyFailedMessages } from "@/modules/admin/actions";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { failureReasonLabels, type FailureReason } from "@/modules/admin/display";
import { listFailedMessages } from "@/modules/admin/queries";

export const metadata = { title: "Messages échoués" };

const periods = { "24h": { label: "Dernières 24 h", hours: 24 }, "7j": { label: "7 derniers jours", hours: 168 }, "30j": { label: "30 derniers jours", hours: 720 } } as const;
type Period = keyof typeof periods;
const reasons = Object.keys(failureReasonLabels) as FailureReason[];

export default async function AdminFailedMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const period: Period = Object.hasOwn(periods, searchValue(params, "periode")) ? (searchValue(params, "periode") as Period) : "24h";
  const reason = reasons.includes(searchValue(params, "raison") as FailureReason) ? (searchValue(params, "raison") as FailureReason) : undefined;
  const query = searchValue(params, "q").toLowerCase();
  const result = await listFailedMessages(periods[period].hours, reason);
  const messages = query ? result.messages.filter((message) => message.storeSlug.includes(query) || message.storeName.toLowerCase().includes(query)) : result.messages;
  const perStore = new Map<string, number>();
  for (const message of messages) perStore.set(message.storeId, (perStore.get(message.storeId) ?? 0) + 1);
  const retour = currentPath("/admin/messages", params);
  const href = (changes: Record<string, string | undefined>) => {
    const copy = new URLSearchParams(Object.entries({ periode: period === "24h" ? undefined : period, raison: reason, q: query || undefined, ...changes }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return copy.size ? `/admin/messages?${copy.toString()}` : "/admin/messages";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Messages échoués</h1>
          <p className="v-page-subtitle">Repérez les messages WhatsApp qui n’ont pas pu partir, pour aider les vendeurs à les corriger.</p>
        </div>
        <form className="v-page-actions">
          {reason && <input name="raison" type="hidden" value={reason} />}
          {query && <input name="q" type="hidden" value={query} />}
          <label className="visually-hidden" htmlFor="failed-period">Période</label>
          <select className="admin-select" defaultValue={period} id="failed-period" name="periode">
            {Object.entries(periods).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <button className="btn btn-secondary" type="submit">Afficher</button>
        </form>
      </div>
      <AdminFeedback params={params} />
      <p className="v-banner v-banner-info">
        <strong>Vie privée respectée.</strong> Pour protéger les clients, le contenu des messages et les numéros complets ne sont jamais affichés ici.
      </p>

      <nav aria-label="Filtrer par raison" className="pill-tabs">
        <Link aria-current={!reason ? "page" : undefined} href={href({ raison: undefined })}>Tous ({result.counts.all})</Link>
        {reasons.map((key) => (
          <Link aria-current={reason === key ? "page" : undefined} href={href({ raison: key })} key={key}>
            {failureReasonLabels[key]}{result.counts[key] ? ` (${result.counts[key]})` : ""}
          </Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        {query && (
          <p className="admin-filter-note">
            Boutique : <Badge>{query}</Badge> <Link href={href({ q: undefined })}>Voir toutes les boutiques</Link>
          </p>
        )}
        {messages.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Mode</th>
                <th scope="col">Raison</th>
                <th scope="col">Tentatives</th>
                <th scope="col">Heure</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className="v-cell-primary">{message.storeName}</td>
                  <td data-label="Mode">{message.mode}</td>
                  <td className="v-cell-badges" data-label="Raison"><Badge tone={message.reason === "other" ? "neutral" : "danger"}>{failureReasonLabels[message.reason]}</Badge></td>
                  <td data-label="Tentatives">{message.attempts}</td>
                  <td data-label="Heure">{period === "24h" ? formatTime(message.at) : formatRelativeDay(message.at)}</td>
                  <td className="admin-row-actions">
                    <form action={notifyFailedMessages}>
                      <input name="storeId" type="hidden" value={message.storeId} />
                      <input name="reasonLabel" type="hidden" value={failureReasonLabels[message.reason]} />
                      <input name="count" type="hidden" value={perStore.get(message.storeId) ?? 1} />
                      <input name="retour" type="hidden" value={retour} />
                      <SubmitButton className="v-link-button admin-row-action" pendingLabel="Envoi…">Prévenir le vendeur</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucun message échoué</h2>
            <p>Tous les messages de cette période sont partis. Rien à signaler.</p>
          </div>
        )}
      </section>
    </>
  );
}
