import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { PeriodFilter } from "@/components/shared/period-filter";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatFcfa, formatReference } from "@/lib/format";
import { resolvePeriod } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Argent reçu" };

const pageSize = 50;

/** Argent reçu = montant des commandes validées ; une commande annulée après validation est retirée. */
export default async function MoneyPage({ searchParams }: PageProps<"/dashboard/argent">) {
  const { store } = await requireStorePermission("payments.read");
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const period = resolvePeriod({ periode: value("periode") ?? "7-jours", du: value("du"), au: value("au") });
  const page = Math.max(1, Math.min(500, Number(value("page")) || 1));
  const where = { storeId: store.id, receivedAt: { gte: period.from, lt: period.to } };

  const [overview, entries, total] = await Promise.all([
    getDashboardOverview(store.id, period.from, period.to),
    prisma.payment.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        amountXaf: true,
        receivedAt: true,
        order: { select: { id: true, reference: true, customerName: true } },
        reverses: { select: { amountXaf: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  const hrefPage = (next: number) => {
    const query = new URLSearchParams({ periode: period.key, ...(period.key === "personnalisee" ? { du: period.fromInput, au: period.toInput } : {}), page: String(next) });
    return `/dashboard/argent?${query.toString()}`;
  };
  const when = period.key === "aujourdhui" ? "aujourd’hui" : "sur la période";

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Argent reçu</h1>
          <p className="v-page-subtitle">Chaque commande validée est comptée ici automatiquement.</p>
        </div>
        <div className="v-page-actions">
          <PeriodFilter basePath="/dashboard/argent" period={period} />
        </div>
      </div>

      <section aria-label="Résumé" className="stat-grid money-stats">
        <StatCard hint={when} label="Argent reçu" value={formatFcfa(overview.receivedXaf)} />
        <StatCard hint={when} label="Commandes validées" value={String(overview.validatedOrders)} />
      </section>

      <section aria-label="Détail de l’argent reçu" className="v-card v-card-flush">
        {entries.length ? (
          <table className="v-table money-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Commande</th>
                <th scope="col">Client</th>
                <th className="v-num" scope="col">Montant</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const negative = entry.type === "REVERSAL" || entry.type === "REFUND";
                const amount = entry.type === "REVERSAL" ? entry.reverses?.amountXaf ?? entry.amountXaf : entry.amountXaf;
                return (
                  <tr key={entry.id}>
                    <td data-label="Date">{formatDate(entry.receivedAt)}</td>
                    <td className="v-cell-primary">
                      <Link className="v-ref v-ref-dark" href={`/dashboard/commandes/${entry.order.id}`}>{formatReference(entry.order.reference)}</Link>
                      {negative && <span className="v-cell-sub">Commande annulée</span>}
                    </td>
                    <td data-label="Client">{entry.order.customerName}</td>
                    <td className={`v-num ${negative ? "text-danger" : ""}`} data-label="Montant">
                      {negative ? "−" : ""}
                      {formatFcfa(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Rien sur cette période</h2>
            <p>Touchez « Valider » sur une commande payée : son montant apparaîtra ici.</p>
            <Link className="btn btn-primary" href="/dashboard/commandes?onglet=nouvelles">Voir les nouvelles commandes</Link>
          </div>
        )}
      </section>
      <Pagination href={hrefPage} page={page} pageSize={pageSize} total={total} />
    </VendorShell>
  );
}
