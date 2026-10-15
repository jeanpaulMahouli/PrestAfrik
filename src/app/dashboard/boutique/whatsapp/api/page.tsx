import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/config/statuses";
import { formatDateTime } from "@/lib/format";
import { requireStorePermission } from "@/modules/stores/context";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";
import { removeWhatsappApiAction, saveWhatsappApiAction, testWhatsappConnectionAction } from "@/modules/whatsapp/actions";
import { getWhatsappSettings } from "@/modules/whatsapp/settings";

export const metadata = { title: "API WhatsApp Business" };

const statusLabels: Record<string, { label: string; tone: Tone }> = {
  NOT_CONFIGURED: { label: "Non configurée", tone: "neutral" },
  PENDING_TEST: { label: "À tester", tone: "warning" },
  CONNECTED: { label: "Connexion vérifiée", tone: "success" },
  FAILED: { label: "Échec de connexion", tone: "danger" },
};

const successMessages: Record<string, string> = {
  enregistre: "Réglages API enregistrés. Testez la connexion pour pouvoir activer l’API.",
  api: "Connexion vérifiée : l’API WhatsApp Business est activée.",
  test: "Connexion réussie : Meta a reconnu votre numéro.",
};

export default async function WhatsappApiPage({ searchParams }: PageProps<"/dashboard/boutique/whatsapp/api">) {
  const { store } = await requireStorePermission("store.manage");
  const params = await searchParams;
  const [settings, subscription] = await Promise.all([getWhatsappSettings(store.id), getStoreSubscriptionAccess(store.id)]);
  const status = statusLabels[settings.apiStatus] ?? statusLabels.NOT_CONFIGURED;
  const configured = Boolean(settings.apiPhoneNumberId && settings.hasAccessToken);
  const error = typeof params.erreur === "string" ? params.erreur : null;
  const success = typeof params.succes === "string" ? successMessages[params.succes] : null;

  return (
    <VendorShell>
      <StoreSectionNav current="/dashboard/boutique/whatsapp" />
      <Link className="v-back-link" href="/dashboard/boutique/whatsapp">← Messages WhatsApp</Link>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">API WhatsApp Business</h1>
          <p className="v-page-subtitle">Pour envoyer automatiquement la demande de confirmation. Le lien wa.me reste votre solution de secours.</p>
        </div>
        <div className="v-page-actions">
          {configured && (
            <form action={testWhatsappConnectionAction}>
              <SubmitButton className="btn btn-secondary" pendingLabel="Test en cours…">Tester la connexion</SubmitButton>
            </form>
          )}
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}
      <p className="v-banner" role="note">
        <strong>Envoi automatique pas encore branché.</strong> La vérification de connexion fonctionne avec Meta, mais l’envoi automatique des confirmations et la
        réception des réponses (webhooks) ne sont pas encore actifs : vos clients continuent de confirmer par le lien wa.me.
      </p>

      <div className="v-split">
        <form action={saveWhatsappApiAction} className="v-card">
          <div className="v-card-header">
            <h2 className="v-card-title">Identifiants</h2>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          {settings.apiStatus === "CONNECTED" && (settings.apiDisplayPhoneNumber || settings.apiVerifiedName) && (
            <p className="v-banner v-banner-success">
              Numéro reconnu : <strong>{settings.apiDisplayPhoneNumber ?? "—"}</strong>
              {settings.apiVerifiedName ? ` · ${settings.apiVerifiedName}` : ""}
              {settings.apiLastCheckedAt ? ` (vérifié le ${formatDateTime(settings.apiLastCheckedAt)})` : ""}
            </p>
          )}
          {settings.apiStatus === "FAILED" && settings.apiLastError && <p className="v-banner v-banner-danger">{settings.apiLastError}</p>}
          <div className="v-grid-2">
            <label className="v-field">
              Identifiant du numéro WhatsApp Business
              <input defaultValue={settings.apiPhoneNumberId} inputMode="numeric" maxLength={40} name="apiPhoneNumberId" required />
            </label>
            <label className="v-field">
              Identifiant du compte (facultatif)
              <input defaultValue={settings.apiBusinessAccountId} inputMode="numeric" maxLength={40} name="apiBusinessAccountId" />
            </label>
          </div>
          <label className="v-field">
            Jeton d’accès
            <input autoComplete="off" maxLength={1000} name="apiAccessToken" placeholder={settings.hasAccessToken ? "•••••••••••• enregistré — laissez vide pour le conserver" : "Jeton permanent (utilisateur système)"} type="password" />
          </label>
          <div className="v-grid-2">
            <label className="v-field">
              Modèle de confirmation approuvé
              <input defaultValue={settings.apiTemplateName} maxLength={512} name="apiTemplateName" placeholder="confirmation_commande_fr" required />
            </label>
            <label className="v-field">
              Langue du modèle
              <input defaultValue={settings.apiTemplateLanguage} maxLength={10} name="apiTemplateLanguage" />
            </label>
          </div>
          <label className="v-field">
            Secret du webhook
            <input autoComplete="off" maxLength={500} name="apiWebhookSecret" placeholder={settings.hasWebhookSecret ? "•••••••••••• enregistré — laissez vide pour le conserver" : ""} type="password" />
            <span className="v-field-help">Les secrets sont chiffrés et ne sont jamais réaffichés.</span>
          </label>
          <label className="v-check">
            <input defaultChecked={settings.mode === "CLOUD_API"} name="activate" type="checkbox" />
            Activer l’API dès que la connexion est vérifiée
          </label>
          <div className="v-button-row">
            <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
            {configured && (
              <ActionDialog
                action={removeWhatsappApiAction}
                description="Les identifiants seront effacés et le lien wa.me redeviendra le mode actif."
                submitClassName="btn btn-danger"
                submitLabel="Retirer la configuration"
                title="Retirer la configuration API ?"
                triggerClassName="v-link-button"
                triggerLabel="Retirer la configuration API"
              />
            )}
          </div>
        </form>

        <div className="v-stack">
          <section className="v-card">
            <h2 className="v-card-title">Prérequis</h2>
            <ul className="tips-list">
              <li>Un compte Meta Business vérifié</li>
              <li>Un numéro dédié enregistré sur WhatsApp Business</li>
              <li>Un modèle de message de confirmation approuvé par Meta</li>
              <li>Le consentement de vos clients au suivi WhatsApp (recueilli à la commande)</li>
            </ul>
          </section>
          <section className="v-card">
            <h2 className="v-card-title">Quota du mois</h2>
            <p className="v-small">{subscription.usedMessages} messages sur {subscription.plan.monthlyMessageQuota} utilisés avec votre offre {subscription.plan.name}.</p>
          </section>
        </div>
      </div>
    </VendorShell>
  );
}
