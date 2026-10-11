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
      <div className="page-heading">
        <div>
          <Link className="text-link customer-back-link" href="/dashboard/clients">← Clients</Link>
          <h1 className="dashboard-heading">Ajouter un client</h1>
          <p className="dashboard-copy">Une fiche manuelle n’est pas abonnée au suivi ou au marketing.</p>
        </div>
      </div>

      {error && <p className="form-error customer-form-error" role="alert">{error}</p>}

      <form action={createCustomer} className="surface-card customer-form">
        <label className="form-field">
          Nom
          <input autoComplete="name" maxLength={80} minLength={2} name="name" required />
        </label>
        <label className="form-field">
          WhatsApp
          <input
            autoComplete="tel"
            defaultValue="+237 "
            inputMode="tel"
            maxLength={30}
            name="whatsapp"
            required
            type="tel"
          />
        </label>
        <label className="form-field">
          E-mail <span className="customer-optional-label">Facultatif</span>
          <input autoComplete="email" maxLength={254} name="email" type="email" />
        </label>
        <label className="form-field">
          Ville <span className="customer-optional-label">Facultative</span>
          <input autoComplete="address-level2" maxLength={100} name="city" />
        </label>
        <label className="form-field">
          Quartier <span className="customer-optional-label">Facultatif</span>
          <input maxLength={120} name="neighborhood" />
        </label>
        <label className="form-field customer-form-wide">
          Repère <span className="customer-optional-label">Facultatif</span>
          <input maxLength={250} name="landmark" />
        </label>
        <label className="form-field customer-form-wide">
          Tags <span className="customer-optional-label">Sépare-les par des virgules, 10 maximum</span>
          <input maxLength={500} name="tags" placeholder="Ex. fidèle, bijoux" />
        </label>
        <label className="form-field customer-form-wide">
          Note interne <span className="customer-optional-label">Facultative</span>
          <textarea maxLength={1000} name="note" rows={4} />
        </label>
        <div className="customer-consent-explanation">
          Aucun consentement marketing ou suivi n’est coché par défaut. L’ajout manuel d’une fiche
          n’autorise pas l’envoi de messages.
        </div>
        <div className="customer-form-actions">
          <Link className="secondary-button" href="/dashboard/clients">Annuler</Link>
          <SubmitButton className="primary-button" pendingLabel="Enregistrement…">
            Enregistrer le client
          </SubmitButton>
        </div>
      </form>
    </DashboardShell>
  );
}
