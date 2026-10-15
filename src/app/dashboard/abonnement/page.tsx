import Link from "next/link";
import { SubscriptionPeriod } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { VendorShell } from "@/components/layout/vendor-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { billingEnabled } from "@/config/billing";
import { formatFcfa } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { simulateSubscriptionPayment } from "@/modules/subscriptions/actions";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";
import { requireStorePermission } from "@/modules/stores/context";

const feedbackMessages: Record<string, string> = {
  activation: "Mode démonstration : l’abonnement a été activé localement. Aucun paiement réel n’a été effectué.",
  downgrade: "Le changement vers une offre inférieure est programmé à la fin de la période payée.",
};

const errors: Record<string, string> = {
  "paiement-indisponible": "Aucun prestataire de paiement n’est configuré en production.",
  "offre-invalide": "Choisis une offre et une période valides.",
  "offre-indisponible": "Cette offre n’est plus disponible.",
};

export default async function SubscriptionPage({
  searchParams,
}: PageProps<"/dashboard/abonnement">) {
  const { session, store, memberships, membership } =
    await requireStorePermission("subscription.manage");
  const params = await searchParams;
  if (!billingEnabled) return <FreeLaunchPage />;
  const period =
    params.periode === SubscriptionPeriod.YEARLY
      ? SubscriptionPeriod.YEARLY
      : SubscriptionPeriod.MONTHLY;
  const now = new Date();
  const [access, plans, payments] = await Promise.all([
    getStoreSubscriptionAccess(store.id, now),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subscriptionPayment.findMany({
      where: { subscription: { storeId: store.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const endDate = formatLongDate(access.expiresAt);
  const error = typeof params.erreur === "string" ? errors[params.erreur] : undefined;
  const success = typeof params.succes === "string" ? feedbackMessages[params.succes] : undefined;
  const showReminder = access.active && access.reminderDays !== null;

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading subscription-page-heading">
        <div>
          <h1 className="dashboard-heading">Mon abonnement</h1>
        </div>
      </div>

      <p className="notice subscription-demo-notice" role="note">
        <span aria-hidden="true" className="subscription-notice-icon">i</span>
        Mode démonstration : aucun paiement réel n’est possible pour l’instant.
      </p>
      {error && <p className="form-error notice-error" role="alert">{error}</p>}
      {success && <p className="notice subscription-success" role="status">{success}</p>}

      {access.phase === "TRIAL" && (
        <section className="subscription-status-banner trial">
          <div>
            <strong>Essai gratuit</strong>
            <p>
              Il reste {access.remainingDays} jour{access.remainingDays === 1 ? "" : "s"}.
              Choisis une offre pour garder ta boutique en ligne.
            </p>
          </div>
          <span className="subscription-status-date">Fin le {endDate}</span>
        </section>
      )}
      {showReminder && (
        <section className="subscription-status-banner reminder" role="status">
          <div>
            <strong>Ton échéance approche</strong>
            <p>
              {access.reminderDays} jour{access.reminderDays === 1 ? "" : "s"} avant l’expiration
              prévue le {endDate}.
            </p>
          </div>
        </section>
      )}
      {access.phase === "EXPIRED" && (
        <section className={`subscription-status-banner ${access.storefrontPaused ? "expired" : "grace"}`} role="alert">
          <div>
            <strong>{access.storefrontPaused ? "Boutique en pause" : "Essai ou période expiré(e)"}</strong>
            <p>
              {access.storefrontPaused
                ? "La vitrine publique et les nouvelles commandes sont suspendues. Tes commandes existantes restent accessibles."
                : `Tes commandes existantes restent accessibles. La vitrine publique sera mise en pause après 14 jours ; les nouveaux produits et campagnes sont bloqués après 7 jours.`}
            </p>
          </div>
          <span>Échéance : {endDate}</span>
        </section>
      )}

      {access.subscription.scheduledPlan && access.subscription.scheduledAt && (
        <p className="notice" role="status">
          Le passage à l’offre {access.subscription.scheduledPlan.name} est programmé pour le{" "}
          {formatLongDate(access.subscription.scheduledAt)}.
        </p>
      )}

      <section aria-labelledby="subscription-plans-title" className="subscription-plans-section">
        <div className="subscription-section-heading">
          <h2 id="subscription-plans-title" className="visually-hidden">Choisis ton offre</h2>
          <nav aria-label="Période de facturation" className="subscription-period-switch">
            <Link
              aria-current={period === SubscriptionPeriod.MONTHLY ? "true" : undefined}
              className={period === SubscriptionPeriod.MONTHLY ? "active" : ""}
              href="/dashboard/abonnement?periode=MONTHLY"
            >
              Mensuel
            </Link>
            <Link
              aria-current={period === SubscriptionPeriod.YEARLY ? "true" : undefined}
              className={period === SubscriptionPeriod.YEARLY ? "active" : ""}
              href="/dashboard/abonnement?periode=YEARLY"
            >
              Annuel
            </Link>
          </nav>
        </div>
        <div className="subscription-plan-grid">
          {plans.map((plan) => {
            const current = access.subscription.planId === plan.id;
            const currentPeriod = access.subscription.billingPeriod === period;
            const isDowngrade = plan.sortOrder < access.subscription.plan.sortOrder;
            return (
              <article
                className={`surface-card subscription-plan-card${plan.recommended ? " recommended" : ""}`}
                key={plan.id}
              >
                {plan.recommended && <span className="subscription-recommended">Recommandée</span>}
                <h3>{plan.name}</h3>
                <p className="subscription-plan-price">
                  <span className={period === SubscriptionPeriod.MONTHLY ? "selected" : ""}>
                    <strong>{formatAmount(plan.monthlyPriceXaf)}</strong> FCFA /mois
                  </span>
                  <span className={period === SubscriptionPeriod.YEARLY ? "selected" : ""}>
                    ou <strong>{formatAmount(plan.yearlyPriceXaf)}</strong> FCFA /an
                  </span>
                </p>
                <ul className="subscription-plan-features">
                  <li>
                    Boutique et catalogue
                    <small>
                      {plan.productQuota === null ? "Produits illimités" : `${plan.productQuota} produits actifs`}
                    </small>
                  </li>
                  <li>
                    Messages WhatsApp
                    <small>{formatAmount(plan.monthlyMessageQuota)} messages par mois</small>
                  </li>
                  <li>
                    Gestion des clients
                    <small>{plan.memberQuota} membre{plan.memberQuota === 1 ? "" : "s"} d’équipe</small>
                  </li>
                </ul>
                {process.env.NODE_ENV !== "production" ? (
                  <form action={simulateSubscriptionPayment}>
                    <input name="planId" type="hidden" value={plan.id} />
                    <input name="period" type="hidden" value={period} />
                    <SubmitButton
                      className={`subscription-plan-button ${plan.recommended ? "primary-button" : "secondary-button"}`}
                      disabled={current && currentPeriod && access.phase === "ACTIVE"}
                      pendingLabel="Activation…"
                    >
                      {current && currentPeriod && access.phase === "ACTIVE"
                        ? "Offre actuelle"
                        : isDowngrade && access.phase === "ACTIVE"
                          ? `Programmer ${plan.name}`
                          : `Choisir ${plan.name}`}
                    </SubmitButton>
                  </form>
                ) : (
                  <span className="subscription-provider-unavailable">Paiement en ligne bientôt disponible</span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface-card subscription-payments-card">
        <div className="subscription-section-heading">
          <div>
            <h2>Historique</h2>
          </div>
        </div>
        <div className="responsive-table-wrap">
          <table className="data-table subscription-payment-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Montant</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {access.phase === "TRIAL" && (
                <tr>
                  <td>{formatShortDate(access.subscription.trialStartedAt)}</td>
                  <td>Début de l’essai gratuit</td>
                  <td>0 FCFA</td>
                  <td><span className="subscription-payment-status">En cours</span></td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatShortDate(payment.createdAt)}</td>
                  <td>Abonnement {payment.period === SubscriptionPeriod.MONTHLY ? "mensuel" : "annuel"}</td>
                  <td>{formatAmount(payment.amountXaf)} FCFA</td>
                  <td>
                    <span className={`subscription-payment-status ${payment.status.toLowerCase()}`}>
                      {payment.status === "SUCCEEDED" ? "Simulé" : payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!payments.length && access.phase !== "TRIAL" && (
          <div className="empty-state subscription-empty-state">
            <h3>Aucun paiement enregistré</h3>
            <p>L’historique de tes paiements apparaîtra ici.</p>
          </div>
        )}
      </section>
      <nav aria-label="Informations légales PrestAfrik" className="subscription-legal-links">
        <Link href="/legal/conditions-generales">Conditions générales</Link>
        <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
        <Link href="/legal/mentions-legales">Mentions légales</Link>
      </nav>
    </DashboardShell>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", { useGrouping: true }).format(amount).replace(/\u202f/g, "\u00a0");
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Africa/Douala",
  }).format(date);
}


/** Lancement gratuit (ADR-014) : les offres sont présentées grisées et désactivées. */
async function FreeLaunchPage() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Abonnement</h1>
          <p className="v-page-subtitle">PrestAfrik est entièrement gratuit pendant son lancement.</p>
        </div>
      </div>
      <p className="v-banner v-banner-success" role="status">
        Profitez de toutes les fonctions sans limite et sans rien payer. Nous vous préviendrons bien à l’avance avant l’arrivée des offres payantes.
      </p>
      <section aria-label="Offres à venir (non disponibles)" className="billing-disabled">
        <div aria-hidden="true" className="billing-disabled-content subscription-plans" inert>
          {plans.map((plan) => (
            <article className="v-card" key={plan.id}>
              <h2 className="v-card-title">{plan.name}</h2>
              <p><strong>{formatFcfa(plan.monthlyPriceXaf)}</strong> / mois</p>
              <p className="v-muted v-small">{plan.productQuota === null ? "Produits illimités" : `${plan.productQuota} produits actifs`} · {plan.memberQuota} membres</p>
              <button className="btn btn-secondary" disabled type="button">Bientôt disponible</button>
            </article>
          ))}
        </div>
      </section>
    </VendorShell>
  );
}
