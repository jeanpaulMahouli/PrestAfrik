import {
  BadgeCheck,
  Eye,
  Package,
  Percent,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Store,
  Globe,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { dashboardPeriodKeys, dashboardPeriodLabels, resolveDashboardPeriod } from "@/lib/dashboard-periods";
import { formatFcfa, formatNumber } from "@/lib/format";
import { storePublicUrl } from "@/lib/urls";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { getPlatformStatistics } from "@/modules/admin/statistics";

export const metadata = { title: { absolute: "Statistiques · Administration PrestAfrik" } };

const percent = (value: number) => `${formatNumber(value)} %`;

/** Barres horizontales (classements, répartitions). */
function Bars({ rows, format = formatNumber, empty }: { rows: { label: string; value: number }[]; format?: (value: number) => string; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.some((row) => row.value > 0)) return <p className="v-muted">{empty}</p>;
  return (
    <ul className="city-bars">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="city-bars-label" title={row.label}>{row.label}</span>
          <span className="city-bars-track">
            <span className="city-bars-fill" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </span>
          <strong className="city-bars-value">{format(row.value)}</strong>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminStatisticsPage({ searchParams }: PageProps<"/admin/statistiques">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const period = resolveDashboardPeriod(typeof params.periode === "string" ? params.periode : "30j");
  const data = await getPlatformStatistics(period);
  const { kpis, series } = data;
  const per = period.bucket === "week" ? "semaine" : "jour";
  const label = dashboardPeriodLabels[period.key];

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Statistiques</h1>
          <p className="v-page-subtitle">
            Les indicateurs de performance de PrestAfrik sur les {label} derniers, comparés aux {label} précédents.
          </p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <nav aria-label="Période" className="segmented">
            {dashboardPeriodKeys.map((key) => (
              <Link aria-current={period.key === key ? "page" : undefined} href={`/admin/statistiques?periode=${key}`} key={key} scroll={false}>
                {dashboardPeriodLabels[key]}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ---------- Croissance ---------- */}
      <h2 className="stats-section-title">Croissance</h2>
      <section aria-label="Croissance" className="kpi-grid">
        <KpiCard evolution={kpis.newUsersEvolution} icon={UserPlus} info="Comptes créés sur la période." label="Nouveaux inscrits" value={formatNumber(kpis.newUsers)} />
        <KpiCard hint={`dont ${formatNumber(kpis.activeSellers)} actifs sur la période`} icon={Users} info="Tous les comptes ; « actifs » : ouverture de l’espace vendeur sur la période." label="Comptes au total" tone="navy" value={formatNumber(kpis.usersTotal)} />
        <KpiCard evolution={kpis.newStoresEvolution} icon={Store} info="Boutiques créées sur la période (fin de l’assistant)." label="Nouvelles boutiques" tone="violet" value={formatNumber(kpis.newStores)} />
        <KpiCard hint={`${percent(kpis.publicationRate)} des ${formatNumber(kpis.storesTotal)} boutiques`} icon={Globe} info="Boutiques en ligne (publiées et non suspendues)." label="Boutiques publiées" tone="green" value={formatNumber(kpis.storesPublished)} />
      </section>

      <div className="home-charts">
        <section aria-labelledby="chart-signups" className="v-card">
          <h3 className="v-card-title" id="chart-signups">Inscriptions par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="line" measure="Inscriptions" points={series.signups} unit="count" unitLabel={["inscription", "inscriptions"]} />
        </section>
        <section aria-labelledby="chart-stores" className="v-card">
          <h3 className="v-card-title" id="chart-stores">Boutiques créées par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="bar" measure="Boutiques créées" points={series.stores} unit="count" unitLabel={["boutique", "boutiques"]} />
        </section>
      </div>

      {/* ---------- Activité commerciale ---------- */}
      <h2 className="stats-section-title">Activité commerciale</h2>
      <section aria-label="Activité commerciale" className="kpi-grid">
        <KpiCard evolution={kpis.ordersEvolution} hint={`${formatNumber(kpis.storesWithOrders)} boutiques ont vendu`} icon={ShoppingBag} info="Commandes reçues par toutes les boutiques, quel que soit leur statut." label="Commandes" value={formatNumber(kpis.orders)} />
        <KpiCard evolution={kpis.gmvEvolution} icon={TrendingUp} info="Volume d’affaires : montant total des commandes non annulées (livraison comprise)." label="Volume d’affaires" tone="green" value={formatFcfa(kpis.gmv)} />
        <KpiCard evolution={kpis.collectedEvolution} icon={Wallet} info="Paiements enregistrés par les vendeurs, remboursements et annulations déduits." label="Argent encaissé par les vendeurs" tone="blue" value={formatFcfa(kpis.collected)} />
        <KpiCard evolution={kpis.averageBasketEvolution} icon={ShoppingCart} info="Montant moyen d’une commande non annulée." label="Panier moyen" tone="violet" value={formatFcfa(kpis.averageBasket)} />
        <KpiCard evolution={kpis.completedEvolution} hint={`${percent(kpis.validationRate)} des commandes · ${percent(kpis.cancelRate)} annulées`} icon={BadgeCheck} info="Commandes marquées « Validée » par le vendeur." label="Commandes validées" tone="green" value={formatNumber(kpis.completed)} />
        <KpiCard evolution={kpis.visitsEvolution} icon={Eye} info="Visites des boutiques publiques (les robots ne sont pas comptés)." label="Visites des boutiques" tone="navy" value={formatNumber(kpis.visits)} />
        <KpiCard hint={`${percent(kpis.conversionPrevious)} sur la période précédente`} icon={Percent} info="Commandes ÷ visites des boutiques sur la période." label="Taux de conversion" tone="orange" value={percent(kpis.conversion)} />
        <KpiCard hint={`+${formatNumber(kpis.newProducts)} ajoutés sur la période`} icon={Package} info="Produits actifs, visibles dans les boutiques." label="Produits en ligne" tone="violet" value={formatNumber(kpis.productsOnline)} />
      </section>

      <div className="home-charts">
        <section aria-labelledby="chart-orders" className="v-card">
          <h3 className="v-card-title" id="chart-orders">Commandes par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="line" measure="Commandes" points={series.orders} unit="orders" />
        </section>
        <section aria-labelledby="chart-gmv" className="v-card">
          <h3 className="v-card-title" id="chart-gmv">Volume d’affaires par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="bar" measure="Volume d’affaires" points={series.gmv} unit="fcfa" />
        </section>
        <section aria-labelledby="chart-visits" className="v-card">
          <h3 className="v-card-title" id="chart-visits">Visites des boutiques par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="line" measure="Visites" points={series.visits} unit="count" unitLabel={["visite", "visites"]} />
        </section>
        <section aria-labelledby="chart-collected" className="v-card">
          <h3 className="v-card-title" id="chart-collected">Argent encaissé par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="bar" measure="Argent encaissé" points={series.collected} unit="fcfa" />
        </section>
      </div>

      {/* ---------- Activation et engagement ---------- */}
      <h2 className="stats-section-title">Activation des vendeurs</h2>
      <div className="home-charts">
        <section aria-labelledby="funnel" className="v-card">
          <h3 className="v-card-title" id="funnel">Parcours des vendeurs</h3>
          <p className="v-small v-muted">Depuis le lancement : part des comptes inscrits arrivés à chaque étape.</p>
          <ol className="stats-funnel">
            {data.funnel.map((step) => (
              <li key={step.label}>
                <span className="stats-funnel-label">{step.label}</span>
                <span className="stats-funnel-track">
                  <span className="stats-funnel-fill" style={{ width: `${Math.max(2, step.percent)}%` }} />
                </span>
                <strong>{formatNumber(step.value)}</strong>
                <small>{percent(step.percent)}</small>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="order-status" className="v-card">
          <h3 className="v-card-title" id="order-status">Commandes par statut</h3>
          <p className="v-small v-muted">Commandes reçues sur la période.</p>
          <Bars empty="Aucune commande sur la période." rows={data.statusCounts} />
        </section>
      </div>

      <section aria-label="Engagement" className="kpi-grid">
        <KpiCard hint={`${formatNumber(kpis.usersWithoutPhone)} comptes sans numéro`} icon={MessageCircle} info="Part des comptes avec un numéro WhatsApp (obligatoire à l’inscription)." label="Comptes avec WhatsApp" tone="green" value={percent(kpis.whatsappCoverage)} />
        <KpiCard evolution={kpis.reviewsEvolution} hint={kpis.ratingAverage ? `Note moyenne ${String(kpis.ratingAverage).replace(".", ",")} / 5` : undefined} icon={Star} info="Avis clients publiés sur la période." label="Avis clients" tone="orange" value={formatNumber(kpis.reviews)} />
        <KpiCard hint={`${formatNumber(kpis.paying)} abonnements payants`} icon={UserCheck} info="Boutiques dans leur période gratuite (6 mois offerts)." label="Abonnements offerts en cours" tone="blue" value={formatNumber(kpis.trials)} />
      </section>

      {/* ---------- Application ---------- */}
      <h2 className="stats-section-title">Application mobile</h2>
      <section aria-label="Application" className="kpi-grid">
        <KpiCard hint={`${percent(kpis.appAdoption)} des comptes · +${formatNumber(kpis.appInstalledInPeriod)} sur la période`} icon={Smartphone} info="Comptes qui ont installé PrestAfrik sur leur écran d’accueil." label="Application installée" value={formatNumber(kpis.appInstalledTotal)} />
        <KpiCard evolution={kpis.appActiveEvolution} icon={Users} info="Comptes qui ont ouvert l’application depuis l’écran d’accueil sur la période." label="Utilisateurs de l’application" tone="green" value={formatNumber(kpis.appActiveUsers)} />
      </section>
      <div className="home-charts">
        <section aria-labelledby="chart-app" className="v-card">
          <h3 className="v-card-title" id="chart-app">Utilisateurs de l’application par {per}</h3>
          <TimeSeriesChart bucket={period.bucket} kind="line" measure="Utilisateurs de l’application" points={series.appUsers} unit="count" unitLabel={["utilisateur", "utilisateurs"]} />
        </section>
        <section aria-labelledby="app-platforms" className="v-card">
          <h3 className="v-card-title" id="app-platforms">Appareils utilisés</h3>
          <p className="v-small v-muted">
            Utilisateurs de l’application sur la période. <Link href="/admin/application">Voir qui l’utilise</Link>
          </p>
          <Bars empty="Aucune ouverture de l’application sur la période." rows={data.appPlatforms} />
        </section>
      </div>

      {/* ---------- Classements ---------- */}
      <h2 className="stats-section-title">Classements</h2>
      <div className="home-charts">
        <section aria-labelledby="top-stores" className="v-card">
          <h3 className="v-card-title" id="top-stores">Boutiques qui vendent le plus</h3>
          {data.topStores.length ? (
            <ol className="admin-ranking">
              {data.topStores.map((store) => (
                <li key={store.id}>
                  <span>
                    <a href={storePublicUrl(store.slug)} rel="noreferrer" target="_blank">{store.name}</a>
                    <small>
                      {store.city} · {formatNumber(store.orders)} commande{store.orders > 1 ? "s" : ""}
                    </small>
                  </span>
                  <strong>{formatFcfa(store.gmv)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="v-muted">Aucune commande sur la période.</p>
          )}
        </section>
        <section aria-labelledby="top-cities" className="v-card">
          <h3 className="v-card-title" id="top-cities">Villes de livraison</h3>
          <p className="v-small v-muted">Commandes reçues sur la période, par ville du client.</p>
          <Bars empty="Aucune commande sur la période." rows={data.topCities} />
        </section>
        <section aria-labelledby="top-activities" className="v-card">
          <h3 className="v-card-title" id="top-activities">Activités des boutiques</h3>
          <p className="v-small v-muted">Toutes les boutiques, par activité principale.</p>
          <Bars empty="Aucune boutique pour le moment." rows={data.topActivities} />
        </section>
      </div>
    </>
  );
}
