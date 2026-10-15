import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCustomer } from "@/modules/customers/actions";
import { requireStorePermission } from "@/modules/stores/context";

export default async function NewCustomerPage({
  searchParams,
}: PageProps<"/dashboard/clients/nouveau">) {
  const { session, store, memberships, membership } = await requireStorePermission("customers.manage");
  const params = await searchParams;
  const error = typeof params.erreur === "string" ? params.erreur : "";

  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <Link className="v-back-link" href="/dashboard/clients">← Tous les clients</Link>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Ajouter un client</h1>
          <p className="v-page-subtitle">Ajoutez un client rencontré en dehors de la boutique. Une fiche ajoutée à la main n’autorise aucun envoi de message.</p>
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}

      <form action={createCustomer} className="v-card customer-form">
        <div className="v-grid-2">
          <label className="v-field">
            Nom
            <input autoComplete="name" maxLength={80} minLength={2} name="name" required />
          </label>
          <label className="v-field">
            Numéro WhatsApp
            <input autoComplete="tel" defaultValue="+237 " inputMode="tel" maxLength={30} name="whatsapp" required type="tel" />
          </label>
          <label className="v-field">
            E-mail (facultatif)
            <input autoComplete="email" maxLength={254} name="email" type="email" />
          </label>
          <label className="v-field">
            Ville (facultative)
            <input autoComplete="address-level2" maxLength={100} name="city" />
          </label>
          <label className="v-field">
            Quartier (facultatif)
            <input maxLength={120} name="neighborhood" />
          </label>
          <label className="v-field">
            Point de repère (facultatif)
            <input maxLength={250} name="landmark" />
          </label>
        </div>
        <label className="v-field">
          Tags (facultatifs, séparés par des virgules, 10 au maximum)
          <input maxLength={500} name="tags" placeholder="Ex. Fidèle, Bijoux" />
        </label>
        <label className="v-field">
          Note interne (facultative)
          <textarea maxLength={1000} name="note" rows={3} />
        </label>
        <p className="v-banner v-banner-info">
          Aucun consentement n’est coché par défaut : sans l’accord du client, il ne recevra ni suivi WhatsApp ni campagne marketing.
        </p>
        <div className="v-sticky-actions">
          <Link className="btn btn-secondary" href="/dashboard/clients">Annuler</Link>
          <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">Enregistrer le client</SubmitButton>
        </div>
      </form>
    </DashboardShell>
  );
}
