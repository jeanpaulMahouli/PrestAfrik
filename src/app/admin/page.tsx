import { Store, Globe, Users, UserPlus } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatDateTime, formatNumber, plural } from "@/lib/format";
import { storePublicUrl } from "@/lib/urls";
import { getAdminDashboard } from "@/modules/admin/dashboard";
import { requirePlatformAdmin } from "@/modules/admin/context";

export const metadata = { title: { absolute: "Tableau de bord · Administration PrestAfrik" } };

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();
  const data = await getAdminDashboard();

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Tableau de bord</h1>
          <p className="v-page-subtitle">La plateforme en un coup d’œil : boutiques, utilisateurs, activité et visites des 30 derniers jours.</p>
        </div>
      </div>

      <section aria-label="Chiffres clés" className="kpi-grid">
        <KpiCard icon={Store} label="Boutiques créées" value={formatNumber(data.kpis.stores)} />
        <KpiCard hint={`${Math.round((data.kpis.publishedStores / Math.max(1, data.kpis.stores)) * 100)} % des boutiques`} icon={Globe} label="Boutiques publiées" tone="green" value={formatNumber(data.kpis.publishedStores)} />
        <KpiCard icon={Users} label="Utilisateurs" tone="navy" value={formatNumber(data.kpis.users)} />
        <KpiCard hint="sur les 7 derniers jours" icon={UserPlus} label="Nouveaux utilisateurs" tone="blue" value={formatNumber(data.kpis.newUsers)} />
      </section>

      <div className="home-charts">
        <CityBars
          empty="Aucun utilisateur pour le moment."
          help="Ville croisée avec les boutiques de chaque utilisateur : celle des boutiques dont il est propriétaire, sinon celle des boutiques où il travaille."
          id="users-by-city"
          rows={data.cities}
          title="Utilisateurs par ville"
        />
        <CityBars
          empty="Aucune réponse pour le moment."
          help={`Réponses à « Comment avez-vous connu PrestAfrik ? », posée à l’inscription (${formatNumber(data.acquisition.answered)} réponse${data.acquisition.answered > 1 ? "s" : ""}).`}
          id="acquisition"
          rows={data.acquisition.answered ? data.acquisition.rows : []}
          title="Comment ils ont connu PrestAfrik"
        />
        <CityBars empty="Aucune boutique pour le moment." help="Ville renseignée dans chaque boutique (même écriture que ci-contre)." id="stores-by-city" rows={data.storeCities} title="Boutiques par ville" />

        <section aria-labelledby="top-stores" className="v-card">
          <h2 className="v-card-title" id="top-stores">Top 10 des boutiques les plus visitées (30 jours)</h2>
          {data.topStores.length ? (
            <ol className="admin-ranking">
              {data.topStores.map((store) => (
                <li key={store.id}>
                  <span>
                    <a href={storePublicUrl(store.slug)} rel="noreferrer" target="_blank">{store.name}</a>
                    <small>{store.owner ?? "Propriétaire inconnu"}</small>
                  </span>
                  <strong>{plural(store.visits, "visite")}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="v-muted">Aucune visite enregistrée sur les 30 derniers jours.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="top-users" className="v-card v-card-flush">
        <h2 className="v-card-title admin-card-title" id="top-users">Top 10 des utilisateurs les plus actifs (30 jours)</h2>
        {data.topUsers.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Boutique</th>
                <th scope="col">Ville</th>
                <th scope="col">Activité</th>
                <th scope="col">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((user) => (
                <tr key={user.userId}>
                  <td className="v-cell-primary">
                    {user.name}
                    <span className="v-cell-sub">{user.email}</span>
                  </td>
                  <td data-label="Boutique">{user.storeName ?? "—"}</td>
                  <td data-label="Ville">{user.city ?? "—"}</td>
                  <td data-label="Activité">
                    {[plural(user.logins, "connexion"), plural(user.products, "produit ajouté", "produits ajoutés"), plural(user.orders, "commande traitée", "commandes traitées")].join(" · ")}
                  </td>
                  <td data-label="Dernière activité">{user.lastActivity ? formatDateTime(user.lastActivity) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <p>Aucune activité enregistrée sur les 30 derniers jours.</p>
          </div>
        )}
      </section>
    </>
  );
}

/** Barres horizontales « par ville » (villes déjà normalisées par le module geo). */
function CityBars({ id, title, help, empty, rows }: { id: string; title: string; help: string; empty: string; rows: { city: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section aria-labelledby={id} className="v-card">
      <h2 className="v-card-title" id={id}>{title}</h2>
      <p className="v-small v-muted">{help}</p>
      {rows.length ? (
        <ul className="city-bars">
          {rows.map((row) => (
            <li key={row.city}>
              <span className="city-bars-label">{row.city}</span>
              <span className="city-bars-track">
                <span className="city-bars-fill" style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }} />
              </span>
              <strong className="city-bars-value">{formatNumber(row.count)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="v-muted">{empty}</p>
      )}
    </section>
  );
}
