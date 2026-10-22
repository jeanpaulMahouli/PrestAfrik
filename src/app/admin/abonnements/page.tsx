import Link from "next/link";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ActionDialog } from "@/components/ui/action-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { billingEnabled } from "@/config/billing";
import { formatDate, formatNumber, plural } from "@/lib/format";
import { extendTrial } from "@/modules/admin/actions";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { getPlatformStats, listAdminSubscriptions, subscriptionFilters, type SubscriptionFilter } from "@/modules/admin/queries";

export const metadata = { title: "Abonnements" };

const filterLabels: Record<SubscriptionFilter, string> = { all: "Tous", active: "Actifs", trial: "Essais", expired: "Expirés", canceled: "Annulés" };
const periodLabels = { MONTHLY: "Mensuel", YEARLY: "Annuel" } as const;

export default async function AdminSubscriptionsPage({ searchParams }: PageProps<"/admin/abonnements">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q");
  const requested = searchValue(params, "statut") as SubscriptionFilter;
  const filter = subscriptionFilters.includes(requested) ? requested : "all";
  const [stats, subscriptions] = await Promise.all([getPlatformStats(), listAdminSubscriptions(filter, query)]);
  const retour = currentPath("/admin/abonnements", params);
  const filterHref = (key: SubscriptionFilter) => {
    const copy = new URLSearchParams({ ...(query ? { q: query } : {}), ...(key === "all" ? {} : { statut: key }) });
    return copy.size ? `/admin/abonnements?${copy.toString()}` : "/admin/abonnements";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Abonnements</h1>
          <p className="v-page-subtitle">Suivez les essais et les abonnements de toutes les boutiques, et repérez ceux qui arrivent à échéance.</p>
        </div>
        <div className="v-page-actions">
          <a className="btn btn-secondary" download href={`/api/admin/export?type=abonnements${filter === "all" ? "" : `&statut=${filter}`}`}>Exporter</a>
        </div>
      </div>
      <AdminFeedback params={params} />
      {!billingEnabled && (
        <p className="v-banner v-banner-info">
          Lancement gratuit : les abonnements payants sont désactivés (ADR-014). Aucune boutique n’est mise en pause à la fin de son essai ; les dates restent suivies ici.
        </p>
      )}

      <div className="stat-grid admin-stats">
        <StatCard hint={stats.activePlans.join(", ") || "aucune offre payée"} label="Abonnements actifs" value={formatNumber(stats.activeSubscriptions)} />
        <StatCard hint={stats.trialsEndingSoon ? `${plural(stats.trialsEndingSoon, "se termine", "se terminent")} sous 7 jours` : "aucun ne se termine cette semaine"} label="Essais en cours" value={formatNumber(stats.trials)} />
        <StatCard hint={billingEnabled ? "boutiques mises en pause" : "sans effet pendant la gratuité"} label="Essais expirés" tone={stats.expired && billingEnabled ? "danger" : undefined} value={formatNumber(stats.expired)} />
        <StatCard hint="à surveiller" label="Échéances sous 7 jours" value={formatNumber(stats.dueWithin7Days)} />
      </div>

      <nav aria-label="Filtrer les abonnements" className="pill-tabs">
        {subscriptionFilters.map((key) => (
          <Link aria-current={filter === key ? "page" : undefined} href={filterHref(key)} key={key}>{filterLabels[key]}</Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="admin-search" role="search">
          {filter !== "all" && <input name="statut" type="hidden" value={filter} />}
          <label className="visually-hidden" htmlFor="admin-subscription-search">Rechercher une boutique</label>
          <input defaultValue={query} id="admin-subscription-search" maxLength={100} name="q" placeholder="Rechercher une boutique ou un propriétaire" type="search" />
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>
        {subscriptions.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Offre</th>
                <th scope="col">Période</th>
                <th scope="col">Statut</th>
                <th scope="col">Échéance</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => {
                const canExtend = subscription.status === "TRIAL" || (subscription.status === "EXPIRED" && !subscription.currentPeriodEnd);
                return (
                  <tr key={subscription.storeId}>
                    <td className="v-cell-primary">
                      {subscription.store.name}
                      {subscription.owner && <span className="v-cell-sub">{subscription.owner.name}</span>}
                    </td>
                    <td data-label="Offre">{subscription.state.group === "trial" ? "Essai gratuit" : subscription.state.offer}</td>
                    <td data-label="Période">{subscription.billingPeriod ? periodLabels[subscription.billingPeriod] : "—"}</td>
                    <td className="v-cell-badges" data-label="Statut"><StatusBadge status={subscription.state} /></td>
                    <td data-label="Échéance">{subscription.state.dueAt ? formatDate(subscription.state.dueAt) : "—"}</td>
                    <td className="admin-row-actions">
                      {canExtend ? (
                        <ActionDialog
                          action={extendTrial}
                          description={`L’essai de ${subscription.store.name} sera prolongé à partir de ${subscription.state.dueAt && subscription.state.dueAt > new Date() ? `sa fin actuelle (${formatDate(subscription.state.dueAt)})` : "aujourd’hui"}.`}
                          hiddenFields={{ storeId: subscription.storeId, retour }}
                          submitLabel="Prolonger"
                          title="Prolonger l’essai"
                          triggerClassName="v-link-button admin-row-action"
                          triggerLabel="Prolonger l’essai"
                        >
                          <label className="form-field">
                            Durée
                            <select defaultValue="14" name="days">
                              <option value="7">7 jours</option>
                              <option value="14">14 jours</option>
                              <option value="30">30 jours</option>
                            </select>
                          </label>
                        </ActionDialog>
                      ) : null}
                      {subscription.owner && (
                        <a className="v-link-button admin-row-action" href={`mailto:${subscription.owner.email}?subject=${encodeURIComponent(`Votre boutique ${subscription.store.name} sur PrestAfrik`)}`}>
                          Contacter le vendeur
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucun abonnement dans cette catégorie</h2>
            <p>Changez de filtre pour voir les autres boutiques.</p>
          </div>
        )}
      </section>
    </>
  );
}
