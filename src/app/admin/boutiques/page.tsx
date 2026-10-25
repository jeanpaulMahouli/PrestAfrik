import { Download } from "lucide-react";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatNumber, plural } from "@/lib/format";
import { storePublicUrl } from "@/lib/urls";
import { restoreStore, suspendStore } from "@/modules/admin/actions";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { storeStateDisplay } from "@/modules/admin/display";
import { adminPageSize, getPlatformStats, listAdminStores } from "@/modules/admin/queries";

export const metadata = { title: "Boutiques" };

export default async function AdminStoresPage({ searchParams }: PageProps<"/admin/boutiques">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q");
  const page = Math.max(1, Math.min(1000, Number(searchValue(params, "page")) || 1));
  const [stats, result] = await Promise.all([getPlatformStats(), listAdminStores({ query, page })]);
  const retour = currentPath("/admin/boutiques", params);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Boutiques</h1>
          <p className="v-page-subtitle">Supervisez toutes les boutiques de la plateforme : abonnement, activité et état de publication.</p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <a
            aria-label="Exporter les boutiques (fichier CSV)"
            className="icon-button"
            download
            href={`/api/admin/export?type=boutiques${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            title="Exporter les boutiques (CSV)"
          >
            <Download aria-hidden="true" size={18} />
          </a>
        </div>
      </div>
      <AdminFeedback params={params} />

      <div className="stat-grid admin-stats">
        <StatCard hint={`dont ${plural(stats.published, "publiée")}${stats.suspended ? `, ${plural(stats.suspended, "suspendue")}` : ""}`} label="Boutiques" value={formatNumber(stats.stores)} />
        <StatCard hint={stats.expired ? plural(stats.expired, "expiré") : "aucun expiré"} label="Essais en cours" value={formatNumber(stats.trials)} />
        <StatCard hint={stats.activePlans.join(", ") || "lancement gratuit"} label="Abonnements actifs" value={formatNumber(stats.activeSubscriptions)} />
      </div>

      <section className="v-card v-card-flush">
        <form className="admin-search" role="search">
          <label className="visually-hidden" htmlFor="admin-store-search">Rechercher une boutique ou un propriétaire</label>
          <input defaultValue={query} id="admin-store-search" maxLength={100} name="q" placeholder="Rechercher une boutique ou un propriétaire" type="search" />
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>

        {result.stores.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Propriétaire</th>
                <th scope="col">Offre</th>
                <th scope="col">Abonnement</th>
                <th scope="col">Boutique</th>
                <th scope="col">Commandes (30 j)</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.stores.map((store) => (
                <tr key={store.id}>
                  <td className="v-cell-primary">
                    <a className="admin-store-name" href={storePublicUrl(store.slug)} rel="noreferrer" target="_blank">{store.name}</a>
                    <span className="v-cell-sub">{[store.city, `créée le ${formatDate(store.createdAt)}`].filter(Boolean).join(" · ")}</span>
                    {store.suspendedAt && <span className="v-cell-sub admin-suspension">Suspendue le {formatDate(store.suspendedAt)} : {store.suspensionReason}</span>}
                  </td>
                  <td data-label="Propriétaire">
                    {store.owner ? (
                      <>
                        {store.owner.name}
                        <span className="v-cell-sub">{store.owner.email}</span>
                      </>
                    ) : "—"}
                  </td>
                  <td data-label="Offre">{store.subscriptionState.offer}</td>
                  <td className="v-cell-badges" data-label="Abonnement"><StatusBadge status={store.subscriptionState} /></td>
                  <td className="v-cell-badges" data-label="Boutique"><StatusBadge status={storeStateDisplay(store, store.paused)} /></td>
                  <td data-label="Commandes (30 j)">{formatNumber(store.orders30d)}</td>
                  <td className="admin-row-actions">
                    {store.suspendedAt ? (
                      <form action={restoreStore}>
                        <input name="storeId" type="hidden" value={store.id} />
                        <input name="retour" type="hidden" value={retour} />
                        <SubmitButton className="v-link-button admin-row-action" pendingLabel="Rétablissement…">Rétablir</SubmitButton>
                      </form>
                    ) : (
                      <ReasonDialog
                        action={suspendStore}
                        description={`${store.name} ne sera plus visible par ses clients et ne recevra plus de commandes. Le propriétaire sera prévenu par e-mail avec ce motif.`}
                        hiddenFields={{ storeId: store.id, retour }}
                        placeholder="Ex. : produits interdits signalés par plusieurs clients"
                        submitLabel="Suspendre la boutique"
                        title={`Suspendre ${store.name} ?`}
                        triggerLabel="Suspendre"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>{query ? "Aucune boutique ne correspond" : "Aucune boutique pour le moment"}</h2>
            <p>{query ? "Essayez avec le nom de la boutique, son adresse ou l’e-mail du propriétaire." : "Les boutiques apparaîtront ici dès leur création."}</p>
          </div>
        )}
      </section>
      {result.total > 0 && <p className="admin-count"><Badge>{plural(result.total, "boutique")}</Badge></p>}
      <Pagination
        href={(next) => `/admin/boutiques?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(next) }).toString()}`}
        page={page}
        pageSize={adminPageSize}
        total={result.total}
      />
    </>
  );
}
