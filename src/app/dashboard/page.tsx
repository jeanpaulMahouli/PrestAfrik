import { Eye, Hourglass, ShoppingBag, ShoppingCart, Wallet } from "lucide-react";
import Link from "next/link";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ShareStoreButton } from "@/components/shared/share-store-button";
import { StarRating } from "@/components/storefront/star-rating";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { StoreImage } from "@/components/ui/store-image";
import { orderStageDisplay } from "@/config/statuses";
import { dashboardPeriodKeys, dashboardPeriodLabels, resolveDashboardPeriod } from "@/lib/dashboard-periods";
import { formatDateTime, formatFcfa, formatReference, plural } from "@/lib/format";
import { photoVariant } from "@/lib/product-photos";
import { storePublicUrl } from "@/lib/urls";
import { hasPermission } from "@/modules/auth/permissions";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { getDashboardStats } from "@/modules/dashboard/stats";
import { getStoreContext } from "@/modules/stores/context";
import { findDraft } from "@/modules/stores/draft";

export const metadata = { title: "Accueil" };

const stageOrder = ["NEW", "VALIDATED", "CANCELLED"] as const;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { session, store, membership } = await getStoreContext();
  const params = await searchParams;
  const period = resolveDashboardPeriod(params.periode);
  const [stats, overview, draft] = await Promise.all([
    getDashboardStats(store.id, period),
    getDashboardOverview(store.id, period.from, period.to),
    findDraft(session.user.id),
  ]);
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(membership.role, permission);
  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  const publicUrl = storePublicUrl(store.slug);
  const comparison = `vs les ${period.days} jours précédents`;
  const totalStages = stageOrder.reduce((total, stage) => total + stats.stages[stage], 0);
  const noOrdersYet = stats.latestOrders.length === 0;

  const tasks = [
    { count: overview.ordersToValidate, label: (n: number) => `${plural(n, "nouvelle commande", "nouvelles commandes")} à valider`, action: "Voir", href: "/dashboard/commandes?onglet=nouvelles", show: can("orders.read") },
    { count: overview.failedMessages, label: (n: number) => `${plural(n, "message")} WhatsApp échoué${n === 1 ? "" : "s"}`, action: "Réessayer", href: "/dashboard/boutique/whatsapp", show: can("store.manage") },
    { count: overview.soldOutProducts, label: (n: number) => `${plural(n, "produit")} épuisé${n === 1 ? "" : "s"}`, action: "Réapprovisionner", href: "/dashboard/produits?disponibilite=SOLD_OUT", show: can("products.read") },
    { count: overview.customersToRecontact, label: (n: number) => `${plural(n, "client")} à recontacter`, action: "Ouvrir la liste", href: "/dashboard/clients?segment=to-recontact", show: can("customers.read") },
  ].filter((task) => task.show && task.count > 0);

  const checklist = [
    { label: "Créer ma boutique", done: true, href: "/dashboard/boutique" },
    { label: "Ajouter mon premier produit", done: overview.activeProducts > 0, href: "/dashboard/produits/nouveau" },
    { label: "Régler mes zones de livraison", done: overview.activeZones > 0, href: "/dashboard/livraisons" },
    { label: "Connecter WhatsApp", done: overview.whatsappConnected, href: "/dashboard/boutique/whatsapp" },
    { label: "Partager ma boutique", done: store.isPublished, href: "/dashboard/boutique" },
  ];
  const doneSteps = checklist.filter((step) => step.done).length;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Bonjour {firstName} !</h1>
          <p className="v-page-subtitle">L’essentiel de {store.name} en un coup d’œil, sur les {dashboardPeriodLabels[period.key]} derniers.</p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <nav aria-label="Période" className="segmented">
            {dashboardPeriodKeys.map((key) => (
              <Link aria-current={period.key === key ? "page" : undefined} href={`/dashboard?periode=${key}`} key={key} scroll={false}>
                {dashboardPeriodLabels[key]}
              </Link>
            ))}
          </nav>
          <ShareStoreButton className="btn btn-primary" label="Partager" published={store.isPublished} storeName={store.name} storeUrl={publicUrl} />
        </div>
      </div>

      {params.succes === "boutique-supprimee" && (
        <p className="v-banner v-banner-success" role="status">
          La boutique a été supprimée définitivement. Vous êtes maintenant sur « {store.name} ».
        </p>
      )}

      {draft && (
        <p className="v-banner v-banner-info onboarding-resume" role="status">
          <span>
            La création de votre boutique{draft.data.name ? ` « ${draft.data.name} »` : ""} n’est pas terminée (étape {draft.step} sur 8). Tout ce que vous avez saisi est
            enregistré : la boutique sera créée à la dernière étape.
          </span>
          <Link className="btn btn-primary btn-sm" href={`/boutiques/nouvelle?brouillon=${draft.id}&etape=${draft.step}`}>
            Reprendre la création
          </Link>
        </p>
      )}

      <section aria-label="Chiffres clés" className="kpi-grid">
        <KpiCard comparison={comparison} evolution={stats.kpis.orders.evolution} icon={ShoppingBag} label="Commandes" value={String(stats.kpis.orders.value)} />
        {can("payments.read") && (
          <KpiCard comparison={comparison} evolution={stats.kpis.received.evolution} icon={Wallet} label="Argent encaissé" tone="green" value={formatFcfa(stats.kpis.received.value)} />
        )}
        <KpiCard
          hint={stats.kpis.pending.value ? "à valider dès maintenant" : "tout est à jour"}
          icon={Hourglass}
          label="En attente de confirmation"
          tone="navy"
          value={String(stats.kpis.pending.value)}
        />
        <KpiCard comparison={comparison} evolution={stats.kpis.visits.evolution} icon={Eye} label="Visites de la boutique" tone="blue" value={String(stats.kpis.visits.value)} />
        <KpiCard comparison={comparison} evolution={stats.kpis.basket.evolution} icon={ShoppingCart} label="Panier moyen" tone="violet" value={formatFcfa(stats.kpis.basket.value)} />
      </section>

      {noOrdersYet ? (
        <section aria-labelledby="first-orders" className="v-card v-empty home-empty">
          <h2 id="first-orders">Aucune commande pour l’instant</h2>
          <p>Partagez votre boutique sur WhatsApp pour recevoir vos premières commandes ! Vos courbes et vos chiffres apparaîtront ici dès la première vente.</p>
          <ShareStoreButton published={store.isPublished} storeName={store.name} storeUrl={publicUrl} />
        </section>
      ) : (
        <>
          <div className="home-charts">
            <section aria-labelledby="chart-orders" className="v-card">
              <h2 className="v-card-title" id="chart-orders">Commandes par {period.bucket === "week" ? "semaine" : "jour"}</h2>
              <TimeSeriesChart bucket={period.bucket} kind="line" measure="Commandes" points={stats.ordersSeries} unit="orders" />
            </section>
            {can("payments.read") && (
              <section aria-labelledby="chart-money" className="v-card">
                <h2 className="v-card-title" id="chart-money">Argent encaissé par {period.bucket === "week" ? "semaine" : "jour"}</h2>
                <TimeSeriesChart bucket={period.bucket} kind="bar" measure="Argent encaissé" points={stats.receivedSeries} unit="fcfa" />
              </section>
            )}
          </div>

          <div className="home-lists">
            <section aria-labelledby="chart-status" className="v-card">
              <h2 className="v-card-title" id="chart-status">Commandes par statut</h2>
              {totalStages ? (
                <ul className="stage-bars">
                  {stageOrder.map((stage) => {
                    const count = stats.stages[stage];
                    const percent = Math.round((count / totalStages) * 100);
                    return (
                      <li key={stage}>
                        <span className="stage-bars-label">
                          <StatusBadge status={orderStageDisplay[stage]} />
                          <strong>{count}</strong>
                          <small>{percent} %</small>
                        </span>
                        <span aria-hidden="true" className="stage-bars-track">
                          <span className="stage-bars-fill" style={{ width: `${percent}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="v-muted">Aucune commande sur cette période.</p>
              )}
              <p className="v-small v-muted">Une commande « Validée » est payée : son montant est compté dans l’argent encaissé.</p>
            </section>

            <section aria-labelledby="top-rated" className="v-card">
              <h2 className="v-card-title" id="top-rated">Produits les mieux notés</h2>
              {stats.topRated.length ? (
                <ol className="top-rated">
                  {stats.topRated.map((product) => (
                    <li key={product.id}>
                      <span className="top-rated-thumb">
                        {product.imageUrl ? <StoreImage alt="" height={96} sizes="48px" src={photoVariant(product.imageUrl, 320)} width={96} /> : null}
                      </span>
                      <span className="top-rated-text">
                        <strong>{product.name}</strong>
                        <span>
                          <StarRating size={14} value={product.average} /> {plural(product.count, "avis", "avis")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="v-muted">
                  Pas encore d’avis publié. Après une livraison, invitez vos clients à noter leur achat : les avis rassurent les nouveaux acheteurs.{" "}
                  <Link href="/dashboard/avis">Voir les avis</Link>
                </p>
              )}
            </section>

            {can("orders.read") && (
              <section aria-labelledby="latest-orders" className="v-card">
                <h2 className="v-card-title" id="latest-orders">Dernières commandes</h2>
                <ul className="latest-orders">
                  {stats.latestOrders.map((order) => (
                    <li key={order.id}>
                      <Link href={`/dashboard/commandes/${order.id}`}>
                        <span>
                          <strong>{formatReference(order.reference)}</strong> · {order.customerName}
                          <small>{formatDateTime(order.createdAt)}</small>
                        </span>
                        <span className="latest-orders-end">
                          <strong>{formatFcfa(order.amountXaf)}</strong>
                          <StatusBadge status={orderStageDisplay[order.stage]} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link className="v-link" href="/dashboard/commandes">Toutes les commandes</Link>
              </section>
            )}
          </div>
        </>
      )}

      <div className="v-split home-panels">
        <section aria-labelledby="todo-title" className="v-card">
          <h2 className="v-card-title" id="todo-title">À faire aujourd’hui</h2>
          {tasks.length ? (
            <ul className="todo-list">
              {tasks.map((task) => (
                <li key={task.href}>
                  <span>{task.label(task.count)}</span>
                  <Link href={task.href}>{task.action}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="todo-empty">Tout est à jour. Bravo ! Profitez-en pour ajouter de nouveaux produits ou partager votre boutique.</p>
          )}
        </section>

        {doneSteps < checklist.length && (
          <section aria-labelledby="onboarding-title" className="v-card">
            <h2 className="v-card-title" id="onboarding-title">Pour bien démarrer</h2>
            <p className="v-muted v-small onboarding-progress">
              {doneSteps} étape{doneSteps > 1 ? "s" : ""} sur {checklist.length} terminée{doneSteps > 1 ? "s" : ""}. Vos prochains clients vous attendent !
            </p>
            <ul className="onboarding-list">
              {checklist.map((step) => (
                <li className={step.done ? "is-done" : ""} key={step.label}>
                  <span aria-hidden="true" className="onboarding-dot" />
                  {step.done ? (
                    <span>
                      <span className="visually-hidden">Terminé : </span>
                      {step.label}
                    </span>
                  ) : (
                    <Link href={step.href}>{step.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </VendorShell>
  );
}
