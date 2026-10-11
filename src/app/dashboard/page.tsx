import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getStoreContext } from "@/modules/stores/context";
import { prisma } from "@/lib/prisma";
import { getPaymentDashboardMetrics } from "@/modules/payments/dashboard";
import { hasPermission } from "@/modules/auth/permissions";

export default async function DashboardPage() {
  const { session, store, memberships, membership } = await getStoreContext();
  const todayStart = new Date(Date.now() + 60 * 60 * 1000);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setTime(todayStart.getTime() - 60 * 60 * 1000);
  const [ordersToReview, activeProducts, soldOutProducts, deliveriesToOrganize, deliveryZones, paymentMetrics, customersToRecontact] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, processingStatus: "TO_REVIEW" } }),
    prisma.product.count({ where: { storeId: store.id, isArchived: false } }),
    prisma.product.count({ where: { storeId: store.id, isArchived: false, availability: "SOLD_OUT" } }),
    prisma.order.count({
      where: {
        storeId: store.id,
        processingStatus: "COMPLETED",
        deliveryStatus: "TO_ORGANIZE",
      },
    }),
    prisma.deliveryZone.count({ where: { storeId: store.id, isActive: true } }),
    getPaymentDashboardMetrics(store.id, todayStart),
    hasPermission(membership.role, "customers.read")
      ? prisma.customerReminder.count({
          where: { storeId: store.id, completedAt: null, remindAt: { lte: new Date() } },
        })
      : Promise.resolve(0),
  ]);
  const today = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Africa/Douala",
  }).format(new Date());

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="dashboard-page-heading">
        <div>
          <p className="dashboard-greeting">Bonjour {session.user.name.split(" ")[0]},</p>
          <h1 className="dashboard-heading">Ta boutique prend vie&nbsp;!</h1>
        </div>
        <div className="dashboard-heading-actions">
          <span className="dashboard-date">{today}</span>
          <a
            className="primary-button"
            href={store.isPublished ? `/boutique/${store.slug}` : "/dashboard/boutique"}
            target={store.isPublished ? "_blank" : undefined}
          >
            {store.isPublished ? "Partager ma boutique" : "Préparer ma boutique"}
          </a>
        </div>
      </div>

      <section aria-label="Résumé de la boutique" className="dashboard-metrics">
        <article className="surface-card dashboard-metric-card">
          <p>Commandes à confirmer</p>
          <strong>{ordersToReview}</strong>
          <span>En attente de confirmation</span>
        </article>
        <article className="surface-card dashboard-metric-card">
          <p>Argent reçu</p>
          <strong>{formatAmount(paymentMetrics.receivedXaf)} FCFA</strong>
          <span>Aujourd’hui</span>
        </article>
        <article className="surface-card dashboard-metric-card">
          <p>Reste à recevoir</p>
          <strong>{formatAmount(paymentMetrics.remainingXaf)} FCFA</strong>
          <span>Commandes non annulées</span>
        </article>
        <article className="surface-card dashboard-metric-card">
          <p>Collecté, non reversé</p>
          <strong>{formatAmount(Math.max(0, paymentMetrics.courierBalanceXaf))} FCFA</strong>
          <span>Solde actuel des livreurs</span>
        </article>
      </section>

      <section className="dashboard-home-panels">
        <article className="surface-card dashboard-tasks">
          <h2>À faire aujourd’hui</h2>
          <div className="dashboard-task-row">
            <span>{ordersToReview} commande{ordersToReview === 1 ? "" : "s"} à confirmer avec le client</span>
            {ordersToReview ? (
              <Link href="/dashboard/commandes?etat=TO_REVIEW">Voir les commandes</Link>
            ) : (
              <span className="dashboard-task-state">Tout est à jour</span>
            )}
          </div>
          <div className="dashboard-task-row">
            <span>{deliveriesToOrganize} livraison{deliveriesToOrganize === 1 ? "" : "s"} à organiser</span>
            {deliveriesToOrganize ? (
              <Link href="/dashboard/livraisons">Organiser</Link>
            ) : (
              <span className="dashboard-task-state">Tout est à jour</span>
            )}
          </div>
          {customersToRecontact > 0 && (
            <div className="dashboard-task-row">
              <span>{customersToRecontact} client{customersToRecontact === 1 ? "" : "s"} à recontacter</span>
              <Link href="/dashboard/clients?segment=to-recontact">Voir les clients</Link>
            </div>
          )}
          {soldOutProducts > 0 && (
            <div className="dashboard-task-row">
              <span>{soldOutProducts} produit{soldOutProducts === 1 ? "" : "s"} épuisé{soldOutProducts === 1 ? "" : "s"}</span>
              <a href="/dashboard/produits?etat=SOLD_OUT">Voir les produits</a>
            </div>
          )}
          {activeProducts === 0 && (
            <div className="dashboard-task-row">
              <span>Ajouter ton premier produit</span>
              <a href="/dashboard/produits/nouveau">Ajouter</a>
            </div>
          )}
          {!store.isPublished && (
            <div className="dashboard-task-row">
              <span>Personnaliser et publier ta boutique</span>
              <a href="/dashboard/boutique">Continuer</a>
            </div>
          )}
          {ordersToReview === 0 && deliveriesToOrganize === 0 && soldOutProducts === 0 && activeProducts > 0 && store.isPublished && (
            <p className="dashboard-copy">Aucune action urgente. Ta boutique est prête à recevoir des commandes.</p>
          )}
        </article>
        <article className="surface-card dashboard-onboarding">
          <h2>Pour bien démarrer</h2>
          <p className="dashboard-copy">
            {store.isPublished && deliveryZones > 0
              ? "Ta boutique est prête à accueillir tes prochains clients."
              : "Prépare ton espace pour accueillir tes prochains clients."}
          </p>
          <ul>
            <li className="completed">Créer ma boutique</li>
            <li className={activeProducts > 0 ? "completed" : ""}>
              {activeProducts > 0 ? `${activeProducts} produit${activeProducts === 1 ? "" : "s"} ajouté${activeProducts === 1 ? "" : "s"}` : "Ajouter mon premier produit"}
              {activeProducts === 0 && <a href="/dashboard/produits/nouveau">Ajouter</a>}
            </li>
            <li className={store.isPublished ? "completed" : ""}>
              {store.isPublished ? "Partager ma boutique" : "Personnaliser ma boutique"}
              {!store.isPublished && <a href="/dashboard/boutique">Configurer</a>}
            </li>
            <li className={deliveryZones > 0 ? "completed" : ""}>
              {deliveryZones > 0 ? "Régler mes zones de livraison" : "Régler mes zones de livraison"}
              {deliveryZones === 0 && <a href="/dashboard/livraisons#zones-livraison">Configurer</a>}
            </li>
            <li>
              <span>Connecter WhatsApp</span>
              <span className="dashboard-task-state">Bientôt disponible</span>
            </li>
          </ul>
        </article>
      </section>
    </DashboardShell>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}
