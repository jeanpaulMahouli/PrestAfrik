import { AvatarForm } from "@/components/account/avatar-form";
import { NameForm } from "@/components/account/name-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getStoreContext } from "@/modules/stores/context";

const roleLabels = {
  OWNER: "Propriétaire",
  MANAGER: "Gestionnaire",
  ORDER_PREPARER: "Préparateur de commandes",
} as const;

export default async function ProfilePage() {
  const { session, store, memberships, membership } = await getStoreContext();

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
          <h1 className="dashboard-heading">Mon profil</h1>
          <p className="dashboard-copy">Les informations de ton compte PrestAfrik.</p>
        </div>
      </div>
      <section aria-label="Informations du profil" className="surface-card profile-card">
        <AvatarForm image={session.user.image ?? null} name={session.user.name} />
        <NameForm name={session.user.name} />
        <div>
          <span>Adresse e-mail</span>
          <strong>{session.user.email}</strong>
        </div>
        <div>
          <span>Rôle dans {store.name}</span>
          <strong>{roleLabels[membership.role]}</strong>
        </div>
        <div className="profile-password">
          <p className="dashboard-copy">Pour sécuriser ton compte, tu peux demander un lien de modification du mot de passe.</p>
          <a className="secondary-button" href="/mot-de-passe-oublie">Modifier mon mot de passe</a>
        </div>
      </section>
    </DashboardShell>
  );
}
