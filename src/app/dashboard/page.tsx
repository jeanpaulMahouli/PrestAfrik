import { Eye, ShoppingBag, ShoppingCart, Wallet } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnnouncementBanner, AnnouncementCarousel } from "@/components/dashboard/announcements";
import { CommunityBlock } from "@/components/dashboard/community";
import { DayMomentIcon, dayMoment, greetingWord } from "@/components/dashboard/greeting";
import { WelcomeNoStore } from "@/components/dashboard/welcome-no-store";
import { InstallAppCard } from "@/components/pwa/install-app";
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
import { requireWhatsappNumber } from "@/modules/auth/google";
import { auth } from "@/modules/auth/server";
import { isPlatformAdmin } from "@/modules/admin/context";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { getDashboardAnnouncements } from "@/modules/announcements/queries";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { setupChecklist } from "@/modules/dashboard/setup-checklist";
import { getDashboardStats } from "@/modules/dashboard/stats";
import { getStoreContext } from "@/modules/stores/context";
import { findDraft } from "@/modules/stores/draft";

export const metadata = { title: "Accueil" };


export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  // Compte sans boutique (juste après l'inscription, ou boutique pas encore créée) : une seule prochaine étape.
  const account = await auth.api.getSession({ headers: await headers() });
  if (!account) redirect("/connexion");
  await requireWhatsappNumber(account.user);
  const hasStore = await prisma.storeMembership.findFirst({ where: { userId: account.user.id }, select: { id: true } });
  if (!hasStore) {
    const [pendingDraft, adminLink] = await Promise.all([findDraft(account.user.id), isPlatformAdmin(account.user.id)]);
    return (
      <WelcomeNoStore
        adminLink={adminLink}
        createHref={pendingDraft ? `/boutiques/nouvelle?brouillon=${pendingDraft.id}&etape=${pendingDraft.step}` : "/boutiques/nouvelle"}
        emailVerified={account.user.emailVerified}
        firstName={account.user.name.trim().split(/\s+/)[0] || account.user.name}
        justSignedUp={params.bienvenue === "1"}
        userEmail={account.user.email}
        userImage={account.user.image ?? null}
        userName={account.user.name}
      />
    );
  }

  const { session, store, membership } = await getStoreContext();
  const period = resolveDashboardPeriod(params.periode);
  const [stats, overview, draft, announcements] = await Promise.all([
    getDashboardStats(store.id, period),
    getDashboardOverview(store.id, period.from, period.to),
    findDraft(session.user.id),
    getDashboardAnnouncements(),
  ]);
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(membership.role, permission);
  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  const moment = dayMoment();
  const publicUrl = storePublicUrl(store.slug);
  const noOrdersYet = stats.latestOrders.length === 0;

  const checklist = setupChecklist({ store, activeProducts: overview.activeProducts, activeZones: overview.activeZones, whatsappNumber: overview.whatsappConnected });
  const doneSteps = checklist.filter((step) => step.done).length;

  return (
    <VendorShell>
      <AnnouncementCarousel items={announcements.carousel} />
      <AnnouncementBanner item={announcements.banner} />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title greeting">
            <DayMomentIcon moment={moment} />
            {greetingWord(moment)} {firstName} !
          </h1>
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

      <InstallAppCard />

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
        <KpiCard icon={ShoppingBag} info="Toutes les commandes reçues sur la période, quel que soit leur statut." label="Commandes" value={String(stats.kpis.orders.value)} />
        {can("payments.read") && (
          <KpiCard
            icon={Wallet}
            info="Somme des commandes validées (payées) sur la période. Une annulation est déduite automatiquement."
            label="Argent encaissé"
            tone="green"
            value={formatFcfa(stats.kpis.received.value)}
          />
        )}
        <KpiCard icon={Eye} info="Nombre de visites de votre boutique publique sur la période (les robots ne sont pas comptés)." label="Visites de la boutique" tone="blue" value={String(stats.kpis.visits.value)} />
        <KpiCard icon={ShoppingCart} info="Montant moyen d’une commande sur la période, commandes annulées exclues." label="Panier moyen" tone="violet" value={formatFcfa(stats.kpis.basket.value)} />
      </section>

      {noOrdersYet ? (
        <section aria-labelledby="first-orders" className="v-card v-empty home-empty">
          <h2 id="first-orders">Aucune commande pour l’instant</h2>
          <p>Partagez votre boutique sur WhatsApp pour recevoir vos premières commandes ! Vos courbes et vos chiffres apparaîtront ici dès la première vente.</p>
          <ShareStoreButton published={store.isPublished} storeName={store.name} storeUrl={publicUrl} />
        </section>
      ) : (
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
      )}

      <div className="home-lists">
        {!noOrdersYet && (
          <>
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
          </>
        )}

        {doneSteps < checklist.length && (
          <section aria-labelledby="onboarding-title" className="v-card">
            <h2 className="v-card-title" id="onboarding-title">Pour bien démarrer</h2>
            <p className="v-muted v-small onboarding-progress">
              {doneSteps} étape{doneSteps > 1 ? "s" : ""} sur {checklist.length} terminée{doneSteps > 1 ? "s" : ""}. Vos prochains clients vous attendent !
            </p>
            <ul className="onboarding-list">
              {checklist.map((step) => (
                <li className={step.done ? "is-done" : ""} key={step.key}>
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

      <CommunityBlock whatsappChannel={site.whatsappChannel} youtube={site.youtube} />
    </VendorShell>
  );
}
