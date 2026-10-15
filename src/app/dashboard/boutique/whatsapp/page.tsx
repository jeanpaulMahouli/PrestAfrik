import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import { WhatsappLinkForm } from "@/components/whatsapp/whatsapp-link-form";
import { splitE164 } from "@/lib/phone";
import { requireStorePermission } from "@/modules/stores/context";
import { switchToWhatsappLinkAction } from "@/modules/whatsapp/actions";
import { getWhatsappSettings } from "@/modules/whatsapp/settings";
import { CheckIcon } from "@/components/ui/icons";

export const metadata = { title: "Messages WhatsApp" };

const successMessages: Record<string, string> = {
  enregistre: "C’est enregistré ! Vos messages WhatsApp sont prêts.",
  lien: "Le lien wa.me est de nouveau actif.",
  "api-retiree": "La configuration API a été retirée. Le lien wa.me est actif.",
};

export default async function WhatsappPage({ searchParams }: PageProps<"/dashboard/boutique/whatsapp">) {
  const { store } = await requireStorePermission("store.manage");
  const params = await searchParams;
  const settings = await getWhatsappSettings(store.id);
  const phone = splitE164(settings.businessNumber);
  const apiActive = settings.mode === "CLOUD_API";
  const error = typeof params.erreur === "string" ? params.erreur : null;
  const success = typeof params.succes === "string" ? successMessages[params.succes] : null;

  return (
    <VendorShell>
      <StoreSectionNav current="/dashboard/boutique/whatsapp" />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Messages WhatsApp</h1>
          <p className="v-page-subtitle">Réglez votre numéro WhatsApp et les messages prêts à envoyer, pour vous et pour vos clients.</p>
        </div>
        <div className="v-page-actions">
          <a className="btn btn-secondary" href="#comment-ca-marche">Aide</a>
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}
      {!settings.saved && (
        <p className="v-banner v-banner-info" role="note">
          Le lien wa.me fonctionne déjà avec le numéro de votre boutique. Vérifiez-le, ajustez vos messages puis enregistrez.
        </p>
      )}

      <div className="mode-cards">
        <article className={`mode-card ${apiActive ? "" : "is-active"}`}>
          <span className="mode-card-badge">{apiActive ? "Par défaut" : "Par défaut · actif"}</span>
          <h2>Lien WhatsApp (wa.me)</h2>
          <p>Votre client ouvre WhatsApp avec un message prêt à envoyer. Aucun compte technique, gratuit, prêt tout de suite.</p>
          <ul>
            <li>Pas d’envoi automatique : le client appuie sur Envoyer</li>
            <li>Pas de statut « livré » ou « lu »</li>
          </ul>
          {apiActive && (
            <form action={switchToWhatsappLinkAction}>
              <SubmitButton className="btn btn-secondary" pendingLabel="…">Revenir au lien wa.me</SubmitButton>
            </form>
          )}
        </article>
        <article className={`mode-card ${apiActive ? "is-active" : ""}`}>
          <span className="mode-card-badge is-dark">{apiActive ? "Avancé · actif" : "Avancé"}</span>
          <h2>API WhatsApp Business</h2>
          <p>Envoi automatique des messages, avec les statuts envoyé, livré et lu.</p>
          <ul>
            <li>Compte Meta, numéro et modèle approuvé requis</li>
            <li>Messages limités par votre offre</li>
          </ul>
          <Link className="btn btn-secondary" href="/dashboard/boutique/whatsapp/api">Configurer l’API</Link>
        </article>
      </div>

      <WhatsappLinkForm
        aside={
          <>
            <section aria-labelledby="comment-ca-marche" className="v-card">
              <h2 className="v-card-title" id="comment-ca-marche">Comment ça marche</h2>
              <ol className="numbered-steps">
                <li>Le client choisit ses produits et sa zone de livraison : les frais sont connus d’avance</li>
                <li>Il envoie sa commande, qui arrive dans « Commandes »</li>
                <li>Vous touchez « Continuer sur WhatsApp » pour lui écrire</li>
                <li>Une fois payée, vous touchez « Valider » : l’argent est compté</li>
              </ol>
            </section>
            <section aria-labelledby="bon-a-savoir" className="v-card">
              <h2 className="v-card-title" id="bon-a-savoir">Bon à savoir</h2>
              <p className="v-small">
                Le lien ouvre WhatsApp avec le message déjà écrit : il suffit d’appuyer sur Envoyer.
              </p>
            </section>
            <section aria-labelledby="api-plus-tard" className="v-card">
              <h2 className="v-card-title" id="api-plus-tard">Passer à l’API plus tard</h2>
              <p className="v-small">Votre configuration wa.me reste en place : vous pouvez revenir au lien à tout moment.</p>
              <ol className="api-steps">
                <li className={settings.businessNumber ? "is-done" : ""}>wa.me configuré{settings.businessNumber ? <> <CheckIcon size={12} /></> : null}</li>
                <li className={settings.apiPhoneNumberId && settings.hasAccessToken ? "is-done" : ""}>Identifiants API</li>
                <li className={settings.apiTemplateName ? "is-done" : ""}>Modèle approuvé</li>
                <li className={settings.apiStatus === "CONNECTED" ? "is-done" : ""}>Test de connexion</li>
              </ol>
            </section>
          </>
        }
        country={phone.country}
        customerTemplate={settings.customerTemplate}
        national={phone.national}
        productOrderButtonEnabled={settings.productOrderButtonEnabled}
        storeName={store.name}
        storeTemplate={settings.storeTemplate}
      />
    </VendorShell>
  );
}
