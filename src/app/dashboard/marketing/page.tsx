import { MarketingCampaignStatus } from "@prisma/client";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import {
  marketingAudienceLabels,
  marketingAudiences,
  isMarketingAudience,
} from "@/modules/marketing/audience";
import {
  createMarketingCampaign,
  simulateMarketingCampaign,
} from "@/modules/marketing/actions";
import { countEligibleCampaignRecipients } from "@/modules/marketing/queries";
import { requireStorePermission } from "@/modules/stores/context";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";

const feedbackMessages: Record<string, string> = {
  brouillon: "La campagne a été enregistrée en brouillon.",
};

const audienceOptions = marketingAudiences.map((value) => ({
  value,
  label: marketingAudienceLabels[value],
}));

export default async function MarketingPage({
  searchParams,
}: PageProps<"/dashboard/marketing">) {
  const { session, store, memberships, membership } =
    await requireStorePermission("marketing.manage");
  const params = await searchParams;
  const [eligibleCount, campaigns, subscription] = await Promise.all([
    countEligibleCampaignRecipients(store.id),
    prisma.marketingCampaign.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { recipients: true } } },
    }),
    getStoreSubscriptionAccess(store.id),
  ]);

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading">
        <div>
          <h1 className="dashboard-heading">Marketing</h1>
          <p className="dashboard-copy">Prépare des campagnes pour les clients qui ont accepté le marketing.</p>
        </div>
      </div>

      <p className="notice marketing-simulation-notice" role="note">
        Mode simulation : aucun message réel ne sera envoyé. À chaque simulation, le consentement
        actif est vérifié de nouveau ; aucun client sans consentement n’est ajouté aux destinataires.
      </p>
      <p className="notice marketing-quota-notice">
        Quota WhatsApp : {subscription.usedMessages} / {subscription.plan.monthlyMessageQuota} utilisé(s)
        ce mois, {subscription.remainingMessages} restant(s).
      </p>
      {subscription.featureRestricted && (
        <p className="form-error notice-error" role="alert">
          La création et la simulation de campagnes sont bloquées après l’expiration de la période d’essai.{" "}
          <Link className="text-link" href="/dashboard/abonnement">Choisir une offre</Link>
        </p>
      )}

      {typeof params.erreur === "string" && (
        <p className="form-error" role="alert">{params.erreur}</p>
      )}
      {typeof params.succes === "string" && feedbackMessages[params.succes] && (
        <p className="marketing-success" role="status">{feedbackMessages[params.succes]}</p>
      )}
      {typeof params.simule === "string" && /^\d+$/.test(params.simule) && (
        <p className="marketing-success" role="status">
          Simulation terminée : {params.simule} destinataire{params.simule === "1" ? "" : "s"} autorisé{params.simule === "1" ? "" : "s"}.
        </p>
      )}

      <section className="marketing-overview" aria-label="Audience autorisée">
        <div className="surface-card marketing-metric">
          <span>Clients actuellement autorisés</span>
          <strong>{eligibleCount}</strong>
          <small>Le retrait du consentement les exclut immédiatement des prochaines simulations.</small>
        </div>
        <div className="surface-card marketing-metric">
          <span>Campagnes enregistrées</span>
          <strong>{campaigns.length}</strong>
          <small>Les 50 campagnes les plus récentes sont conservées dans cet historique.</small>
        </div>
      </section>

      {!subscription.featureRestricted && (
        <section className="surface-card marketing-create-card">
          <div className="marketing-section-heading">
            <div>
              <h2>Préparer une campagne</h2>
              <p>Les brouillons n’envoient aucun message. La simulation n’effectue aucun envoi réel.</p>
            </div>
          </div>
          <form action={createMarketingCampaign} className="marketing-form">
            <label className="form-field">
              Nom de la campagne
              <input autoComplete="off" maxLength={100} minLength={2} name="name" required />
            </label>
            <label className="form-field">
              Audience
              <select defaultValue="all" name="audience">
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field marketing-form-wide">
              Message
              <textarea maxLength={1000} minLength={2} name="message" required rows={4} />
              <small>1 000 caractères maximum. Les modèles WhatsApp et l’envoi réel ne sont pas encore connectés.</small>
            </label>
            <label className="form-field">
              Limite de destinataires
              <input defaultValue={1000} max={10_000} min={1} name="recipientLimit" required type="number" />
            </label>
            <div className="marketing-form-actions">
              <SubmitButton className="primary-button" pendingLabel="Enregistrement…">
                Enregistrer en brouillon
              </SubmitButton>
            </div>
          </form>
        </section>
      )}

      <section className="surface-card marketing-campaigns-card">
        <div className="marketing-section-heading">
          <div>
            <h2>Historique des campagnes</h2>
            <p>Le texte reste lié à la campagne en brouillon ; aucun contenu n’est transmis à un fournisseur.</p>
          </div>
        </div>
        {campaigns.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table marketing-campaign-table">
              <thead>
                <tr>
                  <th scope="col">Campagne</th>
                  <th scope="col">Audience</th>
                  <th scope="col">État</th>
                  <th scope="col">Destinataires simulés</th>
                  <th scope="col">Créée le</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.name}</strong>
                      <small className="marketing-message-preview">{campaign.message}</small>
                    </td>
                    <td>{isMarketingAudience(campaign.audience)
                      ? marketingAudienceLabels[campaign.audience]
                      : "Audience inconnue"}</td>
                    <td>
                      <span className={`marketing-status marketing-status-${campaign.status.toLowerCase()}`}>
                        {campaign.status === MarketingCampaignStatus.DRAFT
                          ? "Brouillon"
                          : campaign.status === MarketingCampaignStatus.PROCESSING
                            ? "En cours"
                            : "Simulation terminée"}
                      </span>
                    </td>
                    <td>{campaign._count.recipients} / {campaign.recipientLimit}</td>
                    <td>{formatDate(campaign.createdAt)}</td>
                    <td>
                      {campaign.status === MarketingCampaignStatus.DRAFT &&
                      !subscription.featureRestricted &&
                      subscription.remainingMessages > 0 ? (
                        <form action={simulateMarketingCampaign}>
                          <input name="campaignId" type="hidden" value={campaign.id} />
                          <SubmitButton className="secondary-button" pendingLabel="Simulation…">
                            Simuler
                          </SubmitButton>
                        </form>
                      ) : campaign.status === MarketingCampaignStatus.DRAFT &&
                        (subscription.featureRestricted || subscription.remainingMessages === 0) ? (
                        <Link className="text-link" href="/dashboard/abonnement">Voir les offres</Link>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state marketing-empty-state">
            <h3>Aucune campagne pour le moment</h3>
            <p>Crée un brouillon pour préparer une campagne destinée uniquement aux clients consentants.</p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(date);
}
