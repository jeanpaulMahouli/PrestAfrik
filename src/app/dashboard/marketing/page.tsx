import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isMarketingAudience, marketingAudienceLabels, marketingAudiences, type MarketingAudience } from "@/modules/marketing/audience";
import { createMarketingCampaign, simulateMarketingCampaign } from "@/modules/marketing/actions";
import { countEligibleCampaignRecipients } from "@/modules/marketing/queries";
import { requireStorePermission } from "@/modules/stores/context";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";

export const metadata = { title: "Marketing" };

export default async function MarketingPage({ searchParams }: PageProps<"/dashboard/marketing">) {
  const { store } = await requireStorePermission("marketing.manage");
  const params = await searchParams;
  const [counts, campaigns, subscription] = await Promise.all([
    Promise.all(marketingAudiences.map(async (audience) => [audience, await countEligibleCampaignRecipients(store.id, audience)] as const)),
    prisma.marketingCampaign.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { recipients: true } } },
    }),
    getStoreSubscriptionAccess(store.id),
  ]);
  const eligible = Object.fromEntries(counts) as Record<MarketingAudience, number>;
  const quota = subscription.plan.monthlyMessageQuota;
  const percent = quota > 0 ? Math.min(100, Math.round((subscription.usedMessages / quota) * 100)) : 0;
  const error = typeof params.erreur === "string" ? params.erreur : null;
  const success =
    params.succes === "brouillon"
      ? "Campagne enregistrée en brouillon. Rien n’est envoyé tant que vous ne confirmez pas."
      : typeof params.simule === "string" && /^\d+$/.test(params.simule)
        ? `Simulation terminée : ${plural(Number(params.simule), "client autorisé", "clients autorisés")} — aucun message réel n’a été envoyé.`
        : null;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Marketing</h1>
          <p className="v-page-subtitle">Préparez des messages ciblés, uniquement pour les clients qui ont accepté de recevoir vos offres.</p>
        </div>
        {!subscription.featureRestricted && (
          <div className="v-page-actions">
            <ActionDialog
              action={createMarketingCampaign}
              description="Une campagne est d’abord enregistrée en brouillon : rien n’est envoyé sans votre confirmation."
              size="md"
              submitLabel="Enregistrer en brouillon"
              title="Nouvelle campagne"
              triggerClassName="btn btn-primary"
              triggerLabel="Nouvelle campagne"
            >
              <label className="v-field">
                Nom de la campagne
                <input maxLength={100} minLength={2} name="name" placeholder="Ex. Nouvelle collection" required />
              </label>
              <label className="v-field">
                Audience
                <select defaultValue="all" name="audience">
                  {marketingAudiences.map((audience) => (
                    <option key={audience} value={audience}>
                      {marketingAudienceLabels[audience]} ({eligible[audience]} avec consentement)
                    </option>
                  ))}
                </select>
              </label>
              <label className="v-field">
                Message
                <textarea maxLength={1000} minLength={2} name="message" placeholder="Bonjour ! Découvrez nos nouveautés…" required rows={4} />
                <span className="v-field-help">Chaque message rappellera au client qu’il peut se désinscrire.</span>
              </label>
              <label className="v-field">
                Limite d’envoi
                <input defaultValue={Math.max(1, Math.min(subscription.remainingMessages, 1000))} max={10_000} min={1} name="recipientLimit" required type="number" />
                <span className="v-field-help">Ne peut pas dépasser votre quota restant ({subscription.remainingMessages} messages ce mois-ci).</span>
              </label>
            </ActionDialog>
          </div>
        )}
      </div>

      <p className="v-banner" role="note">
        <strong>Mode simulation.</strong> WhatsApp n’est pas encore connecté : aucun message n’est envoyé aux clients.
      </p>
      {subscription.featureRestricted && (
        <p className="v-banner v-banner-danger" role="alert">
          Les campagnes sont bloquées depuis la fin de votre période d’essai. <Link href="/dashboard/abonnement">Choisir une offre</Link>
        </p>
      )}
      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}

      <div className="v-split">
        <section aria-labelledby="campaigns-title" className="v-card v-card-flush">
          <h2 className="v-card-title campaigns-title" id="campaigns-title">Campagnes</h2>
          {campaigns.length ? (
            <table className="v-table campaigns-table">
              <thead>
                <tr>
                  <th scope="col">Campagne</th>
                  <th scope="col">Audience</th>
                  <th scope="col">Statut</th>
                  <th scope="col"><span className="visually-hidden">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const audience = isMarketingAudience(campaign.audience) ? campaign.audience : "all";
                  const audienceCount = campaign.status === "DRAFT" ? Math.min(eligible[audience], campaign.recipientLimit) : campaign._count.recipients;
                  return (
                    <tr key={campaign.id}>
                      <td className="v-cell-primary">
                        <strong>{campaign.name}</strong>
                        <span className="v-cell-sub campaign-preview">{campaign.message}</span>
                      </td>
                      <td data-label="Audience">{plural(audienceCount, "client")}{campaign.status === "DRAFT" ? " avec consentement" : ""}</td>
                      <td className="v-cell-badges">
                        <Badge tone={campaign.status === "DRAFT" ? "neutral" : campaign.status === "PROCESSING" ? "info" : "warning"}>
                          {campaign.status === "DRAFT" ? "Brouillon" : campaign.status === "PROCESSING" ? "En cours" : "Simulée"}
                        </Badge>
                      </td>
                      <td className="campaign-action">
                        {campaign.status === "DRAFT" && !subscription.featureRestricted && subscription.remainingMessages > 0 && (
                          <ActionDialog
                            action={simulateMarketingCampaign}
                            description="Mode simulation : aucun message réel ne part. Les destinataires sont recalculés au moment de l’envoi, uniquement parmi les clients consentants."
                            hiddenFields={{ campaignId: campaign.id }}
                            submitLabel="Confirmer l’envoi"
                            title={`Envoyer à ${plural(audienceCount, "client")} ?`}
                            triggerClassName="btn btn-secondary btn-sm"
                            triggerLabel="Envoyer…"
                          >
                            <div className="share-preview campaign-message">
                              <strong>Aperçu du message</strong>
                              <p>{campaign.message}</p>
                              <p className="v-small">Pour ne plus recevoir nos offres, répondez STOP.</p>
                            </div>
                            <label className="v-check campaign-confirm">
                              <input name="confirm" required type="checkbox" />
                              Je confirme l’envoi à {plural(audienceCount, "client")} ayant accepté de recevoir mes offres.
                            </label>
                          </ActionDialog>
                        )}
                        {campaign.status === "DRAFT" && (subscription.featureRestricted || subscription.remainingMessages === 0) && (
                          <Link className="v-link" href="/dashboard/abonnement">Voir les offres</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="v-empty">
              <h2>Aucune campagne pour le moment</h2>
              <p>{eligible.all ? `${plural(eligible.all, "client a", "clients ont")} accepté vos offres : préparez votre première campagne !` : "Dès que vos clients acceptent vos offres en commandant, vous pourrez leur écrire ici."}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="quota-title" className="v-card">
          <h2 className="v-card-title" id="quota-title">Quota du mois</h2>
          <div aria-hidden="true" className="whatsapp-quota-track">
            <div className="whatsapp-quota-bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="v-small v-muted">{subscription.usedMessages} messages sur {quota} utilisés</p>
          <p className="v-small">Seuls les clients qui ont accepté les offres reçoivent une campagne. Chacun peut se désinscrire.</p>
        </section>
      </div>
    </VendorShell>
  );
}
