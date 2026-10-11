import { StoreRole } from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RemoveTeamMemberForm } from "@/components/team/remove-team-member-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import {
  cancelTeamInvitation,
  inviteTeamMember,
  resendTeamInvitation,
  updateTeamMemberRole,
} from "@/modules/team/actions";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import { requireStorePermission } from "@/modules/stores/context";
import Link from "next/link";
import { getStoreSubscriptionAccess } from "@/modules/subscriptions/service";
import { hasSmtpConfig } from "@/modules/email/config";

const roles = [
  StoreRole.OWNER,
  StoreRole.MANAGER,
  StoreRole.ORDER_PREPARER,
] as const;

const roleLabels: Record<StoreRole, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Gestionnaire",
  ORDER_PREPARER: "Préparateur de commandes",
};

const permissionRows: { label: string; permissions: readonly Permission[] }[] = [
  { label: "Produits", permissions: ["products.read", "products.manage"] },
  { label: "Commandes", permissions: ["orders.read", "orders.prepare"] },
  { label: "Clients et exports", permissions: ["customers.read", "customers.manage"] },
  { label: "Argent reçu", permissions: ["payments.read", "payments.manage"] },
  { label: "Équipe", permissions: ["team.read", "team.manage"] },
  { label: "Abonnement", permissions: ["subscription.manage"] },
];

const feedbackMessages: Record<string, string> = {
  invitation: "L’invitation a été envoyée par e-mail.",
  renvoi: "Le nouveau lien d’invitation a été envoyé par e-mail.",
  annulation: "L’invitation a été annulée.",
  role: "Le rôle du membre a été modifié.",
  retrait: "Le membre a été retiré de la boutique.",
};

const errorMessages: Record<string, string> = {
  smtp: "L’e-mail n’a pas pu être envoyé. L’invitation reste en attente ; vérifie la configuration SMTP et renvoie le lien.",
  "smtp-config": "L’envoi d’invitations est désactivé : vérifie les variables SMTP dans le fichier .env.",
};

export default async function TeamPage({
  searchParams,
}: PageProps<"/dashboard/equipe">) {
  const { session, store, memberships, membership } =
    await requireStorePermission("team.read");
  const params = await searchParams;
  const canManage = hasPermission(membership.role, "team.manage");
  const emailConfigured = hasSmtpConfig();
  const now = new Date();
  const [teamMembers, invitations, subscription] = await Promise.all([
    prisma.storeMembership.findMany({
      where: { storeId: store.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.storeInvitation.findMany({
      where: { storeId: store.id, acceptedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getStoreSubscriptionAccess(store.id, now),
  ]);
  const reservedSeats = invitations.filter((invitation) => invitation.expiresAt > now).length;
  const occupiedSeats = teamMembers.length + reservedSeats;
  const rawError = typeof params.erreur === "string" ? params.erreur : "";
  const error = errorMessages[rawError] ?? rawError;
  const success =
    typeof params.succes === "string" ? feedbackMessages[params.succes] : undefined;

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
          <h1 className="dashboard-heading">Mon équipe</h1>
          <p className="dashboard-copy">
            Gère les accès à {store.name} et consulte les permissions de chaque rôle.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error notice-error" role="alert">
          {error}
          {error.toLocaleLowerCase("fr-FR").includes("quota") && (
            <> <Link className="text-link" href="/dashboard/abonnement">Voir les offres</Link></>
          )}
        </p>
      )}
      {success && <p className="notice" role="status">{success}</p>}
      {emailConfigured ? (
        <p className="notice team-mail-notice" role="note">
          Les invitations sont envoyées par e-mail. Le lien expire après 7 jours et ne peut être
          utilisé qu’une seule fois.
        </p>
      ) : (
        <p className="notice team-mail-notice" role="note">
          L’envoi d’e-mails n’est pas configuré. Ajoute les variables SMTP et redémarre
          l’application pour inviter des membres.
        </p>
      )}
      <p className="notice">
        Places occupées : {occupiedSeats} / {subscription.plan.memberQuota}
        {reservedSeats > 0 && ` (dont ${reservedSeats} invitation${reservedSeats === 1 ? "" : "s"} en attente)`}
      </p>

      {canManage && (
        <section className="surface-card team-invite-card">
          <div className="team-section-heading">
            <div>
              <h2>Inviter une personne</h2>
              <p>Choisis le rôle adapté. Le rôle Propriétaire ne peut pas être attribué par invitation.</p>
            </div>
          </div>
          <form action={inviteTeamMember} className="team-invite-form">
            <label className="form-field">
              Adresse e-mail
              <input
                autoComplete="email"
                maxLength={254}
                name="email"
                placeholder="collegue@exemple.com"
                required
                type="email"
              />
            </label>
            <label className="form-field">
              Rôle
              <select defaultValue={StoreRole.MANAGER} name="role">
                <option value={StoreRole.MANAGER}>Gestionnaire</option>
                <option value={StoreRole.ORDER_PREPARER}>Préparateur de commandes</option>
              </select>
            </label>
            <div className="team-invite-actions">
              <SubmitButton className="primary-button" disabled={!emailConfigured} pendingLabel="Envoi…">
                Envoyer l’invitation
              </SubmitButton>
            </div>
          </form>
        </section>
      )}

      <section className="surface-card team-members-card">
        <div className="team-section-heading">
          <div>
            <h2>Membres</h2>
            <p>{teamMembers.length} membre{teamMembers.length === 1 ? "" : "s"} actif{teamMembers.length === 1 ? "" : "s"} dans cette boutique.</p>
          </div>
        </div>
        <div className="responsive-table-wrap">
          <table className="data-table team-table">
            <thead>
              <tr>
                <th scope="col">Personne</th>
                <th scope="col">Rôle</th>
                <th scope="col">État</th>
                {canManage && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.user.name}</strong>
                    <small>{member.user.email}{member.user.id === session.user.id ? " · Toi" : ""}</small>
                  </td>
                  <td>
                    <span className={`team-role team-role-${member.role.toLowerCase()}`}>
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td><span className="team-member-state">Actif</span></td>
                  {canManage && (
                    <td>
                      {member.role === StoreRole.OWNER ? (
                        "—"
                      ) : (
                        <div className="team-member-actions">
                          <form action={updateTeamMemberRole} className="team-role-form">
                            <input name="membershipId" type="hidden" value={member.id} />
                            <select aria-label={`Nouveau rôle pour ${member.user.name}`} defaultValue={member.role} name="role">
                              <option value={StoreRole.MANAGER}>Gestionnaire</option>
                              <option value={StoreRole.ORDER_PREPARER}>Préparateur</option>
                            </select>
                            <SubmitButton className="secondary-button" pendingLabel="…">
                              Modifier
                            </SubmitButton>
                          </form>
                          <RemoveTeamMemberForm membershipId={member.id} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card team-invitations-card">
        <div className="team-section-heading">
          <div>
            <h2>Invitations en attente</h2>
            <p>Un lien devient inutilisable après son acceptation, son annulation ou son expiration.</p>
          </div>
        </div>
        {invitations.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table team-table">
              <thead>
                <tr>
                  <th scope="col">Adresse e-mail</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">État</th>
                  <th scope="col">Expire le</th>
                  {canManage && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => {
                  const expired = invitation.expiresAt <= now;
                  return (
                    <tr key={invitation.id}>
                      <td><strong>{invitation.email}</strong></td>
                      <td>{roleLabels[invitation.role]}</td>
                      <td>
                        <span className={`team-invitation-state${expired ? " expired" : ""}`}>
                          {expired ? "Expirée" : "Invitation envoyée"}
                        </span>
                      </td>
                      <td>{formatDate(invitation.expiresAt)}</td>
                      {canManage && (
                        <td>
                          <div className="team-invitation-actions">
                            <form action={resendTeamInvitation}>
                              <input name="invitationId" type="hidden" value={invitation.id} />
                              <SubmitButton className="secondary-button" disabled={!emailConfigured} pendingLabel="Renvoi…">
                                {expired ? "Renvoyer" : "Renvoyer le lien"}
                              </SubmitButton>
                            </form>
                            <form action={cancelTeamInvitation}>
                              <input name="invitationId" type="hidden" value={invitation.id} />
                              <SubmitButton className="team-remove-button" pendingLabel="…">
                                Annuler
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state team-empty-state">
            <h3>Aucune invitation en attente</h3>
            <p>Les liens envoyés à tes collaborateurs apparaîtront ici.</p>
          </div>
        )}
      </section>

      <section className="surface-card team-permissions-card">
        <div className="team-section-heading">
          <div>
            <h2>Ce que chacun peut faire</h2>
            <p>Les actions sont protégées côté serveur, en plus des contrôles affichés ici.</p>
          </div>
        </div>
        <div className="responsive-table-wrap">
          <table className="data-table team-permission-table">
            <thead>
              <tr>
                <th scope="col">Fonctionnalité</th>
                {roles.map((role) => <th key={role} scope="col">{roleLabels[role]}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissionRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {roles.map((role) => {
                    const permissions = row.permissions.filter((permission) => hasPermission(role, permission));
                    return (
                      <td key={role}>
                        {permissions.length
                          ? <span aria-label={`${roleLabels[role]} : autorisé`} className="team-permission-yes">✓</span>
                          : <span aria-label={`${roleLabels[role]} : non autorisé`} className="team-permission-no">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Douala",
  }).format(date);
}
