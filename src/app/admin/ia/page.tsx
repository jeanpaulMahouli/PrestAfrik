import Link from "next/link";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ActionDialog } from "@/components/ui/action-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatNumber } from "@/lib/format";
import { productAiAvailable } from "@/lib/product-ai";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { grantAiCredits, setMonthlyAiCredits } from "@/modules/ai-credits/admin-actions";
import { aiCreditFilters, getAiCreditStats, listAiCreditStores, listRecentAiGrants, type AiCreditFilter } from "@/modules/ai-credits/admin-queries";
import { defaultMonthlyAiCredits, maxBonusGrant, maxMonthlyAiCredits, nextMonthStart } from "@/modules/ai-credits/rules";

export const metadata = { title: "Crédits IA" };

const filterLabels: Record<AiCreditFilter, string> = {
  all: "Toutes les boutiques",
  used: "Utilisé ce mois-ci",
  empty: "Plus de crédits",
  custom: "Réglages particuliers",
};

export default async function AdminAiCreditsPage({ searchParams }: PageProps<"/admin/ia">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q");
  const requested = searchValue(params, "filtre") as AiCreditFilter;
  const filter = aiCreditFilters.includes(requested) ? requested : "all";
  const [stats, stores, grants] = await Promise.all([getAiCreditStats(), listAiCreditStores(filter, query), listRecentAiGrants()]);
  const retour = currentPath("/admin/ia", params);
  const filterHref = (key: AiCreditFilter) => {
    const copy = new URLSearchParams({ ...(query ? { q: query } : {}), ...(key === "all" ? {} : { filtre: key }) });
    return copy.size ? `/admin/ia?${copy.toString()}` : "/admin/ia";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Crédits IA</h1>
          <p className="v-page-subtitle">
            L’assistant IA propose le nom et la description d’un produit à partir de ses photos. Chaque boutique reçoit {defaultMonthlyAiCredits} crédits par mois
            (1 crédit par proposition), renouvelés le 1er du mois ; les crédits bonus que vous donnez ne se périment pas.
          </p>
        </div>
      </div>
      <AdminFeedback params={params} />
      {!productAiAvailable() && (
        <p className="v-banner v-banner-info">
          L’assistant IA n’est pas activé sur ce serveur (variable ANTHROPIC_API_KEY absente, ou PRODUCT_AI=off) : les vendeurs ne voient pas le bouton.
        </p>
      )}

      <div className="stat-grid admin-stats">
        <StatCard hint={`depuis le 1er du mois, renouvellement le ${formatDate(nextMonthStart())}`} label="Propositions ce mois-ci" value={formatNumber(stats.requests)} />
        <StatCard hint="ont utilisé l’assistant ce mois-ci" label="Boutiques actives" value={formatNumber(stats.activeStores)} />
        <StatCard hint="ajoutés ce mois-ci" label="Crédits bonus donnés" value={formatNumber(stats.grantedThisMonth)} />
        <StatCard hint="pas encore utilisés, toutes boutiques" label="Crédits bonus en attente" value={formatNumber(stats.bonusOutstanding)} />
      </div>

      <nav aria-label="Filtrer les boutiques" className="pill-tabs">
        {aiCreditFilters.map((key) => (
          <Link aria-current={filter === key ? "page" : undefined} href={filterHref(key)} key={key}>{filterLabels[key]}</Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="admin-search" role="search">
          {filter !== "all" && <input name="filtre" type="hidden" value={filter} />}
          <label className="visually-hidden" htmlFor="admin-ai-search">Rechercher une boutique</label>
          <input defaultValue={query} id="admin-ai-search" maxLength={100} name="q" placeholder="Rechercher une boutique ou un propriétaire" type="search" />
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>
        {stores.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Crédits du mois</th>
                <th scope="col">Bonus</th>
                <th scope="col">Restants</th>
                <th scope="col">Utilisés</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="v-cell-primary">
                    {store.name}
                    {store.owner && <span className="v-cell-sub">{store.owner.name}</span>}
                  </td>
                  <td data-label="Crédits du mois">
                    {store.balance.monthly} / {store.balance.allowance}
                    {store.customMonthly && <span className="v-cell-sub">réglage particulier</span>}
                  </td>
                  <td data-label="Bonus">{store.balance.bonus}</td>
                  <td data-label="Restants">
                    <strong className={store.balance.total === 0 ? "ai-admin-empty" : undefined}>{store.balance.total}</strong>
                  </td>
                  <td data-label="Utilisés">
                    {store.usedThisMonth} ce mois-ci
                    <span className="v-cell-sub">{store.usedAllTime} au total</span>
                  </td>
                  <td className="admin-row-actions">
                    <ActionDialog
                      action={grantAiCredits}
                      description={`Les crédits bonus de ${store.name} s’ajoutent à ses ${store.balance.allowance} crédits du mois et ne se périment pas.`}
                      hiddenFields={{ storeId: store.id, retour, direction: "add" }}
                      submitLabel="Ajouter"
                      title="Ajouter des crédits IA"
                      triggerClassName="v-link-button admin-row-action"
                      triggerLabel="Ajouter des crédits"
                    >
                      <label className="form-field">
                        Nombre de crédits
                        <input defaultValue="10" inputMode="numeric" max={maxBonusGrant} min={1} name="amount" required type="number" />
                      </label>
                      <label className="form-field">
                        Motif (facultatif)
                        <input maxLength={200} name="reason" placeholder="Ex. geste commercial, lancement de la boutique" />
                      </label>
                    </ActionDialog>
                    {store.balance.bonus > 0 && (
                      <ActionDialog
                        action={grantAiCredits}
                        description={`${store.name} a ${store.balance.bonus} crédit${store.balance.bonus > 1 ? "s" : ""} bonus. Les crédits du mois ne sont pas touchés.`}
                        hiddenFields={{ storeId: store.id, retour, direction: "remove" }}
                        submitClassName="btn btn-danger"
                        submitLabel="Retirer"
                        title="Retirer des crédits bonus"
                        triggerClassName="v-link-button admin-row-action"
                        triggerLabel="Retirer"
                      >
                        <label className="form-field">
                          Nombre de crédits
                          <input defaultValue={String(store.balance.bonus)} inputMode="numeric" max={store.balance.bonus} min={1} name="amount" required type="number" />
                        </label>
                        <label className="form-field">
                          Motif (facultatif)
                          <input maxLength={200} name="reason" placeholder="Ex. crédits donnés par erreur" />
                        </label>
                      </ActionDialog>
                    )}
                    <ActionDialog
                      action={setMonthlyAiCredits}
                      description={`Nombre de crédits offerts à ${store.name} le 1er de chaque mois. Laissez vide pour revenir à ${defaultMonthlyAiCredits} ; 0 coupe les crédits du mois (les bonus restent utilisables).`}
                      hiddenFields={{ storeId: store.id, retour }}
                      submitLabel="Enregistrer"
                      title="Crédits du mois"
                      triggerClassName="v-link-button admin-row-action"
                      triggerLabel="Crédits du mois"
                    >
                      <label className="form-field">
                        Crédits par mois
                        <input defaultValue={store.customMonthly ? String(store.balance.allowance) : ""} inputMode="numeric" max={maxMonthlyAiCredits} min={0} name="monthly" placeholder={`${defaultMonthlyAiCredits} (par défaut)`} type="number" />
                      </label>
                    </ActionDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucune boutique dans cette catégorie</h2>
            <p>Changez de filtre ou de recherche pour voir les autres boutiques.</p>
          </div>
        )}
      </section>

      {grants.length > 0 && (
        <section aria-labelledby="ai-grants-title" className="v-card">
          <h2 className="v-card-title" id="ai-grants-title">Derniers crédits donnés ou retirés</h2>
          <ul className="ai-grant-list">
            {grants.map((grant) => (
              <li key={grant.id}>
                <strong className={grant.amount > 0 ? "ai-grant-plus" : "ai-grant-minus"}>{grant.amount > 0 ? `+${grant.amount}` : grant.amount}</strong>
                <span>
                  {grant.store.name}
                  {grant.reason && <small> · {grant.reason}</small>}
                </span>
                <time dateTime={grant.createdAt.toISOString()}>{formatDate(grant.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
