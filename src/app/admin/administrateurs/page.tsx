import { UserAvatar } from "@/components/account/user-avatar";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { grantAdminRole, revokeAdminRole } from "@/modules/admin/admin-roles";
import { adminRoleLabels } from "@/modules/admin/roles";
import { requireSuperAdmin } from "@/modules/admin/context";

export const metadata = { title: "Administrateurs" };

const historyLabels: Record<string, string> = {
  "user.promote-admin": "a donné les droits d’administration à",
  "user.change-admin-role": "a changé le rôle de",
  "user.demote-admin": "a retiré les droits d’administration de",
};

function Confirmation({ text }: { text: string }) {
  return (
    <label className="v-check">
      <input name="confirmation" required type="checkbox" />
      {text}
    </label>
  );
}

export default async function AdminRolesPage({ searchParams }: PageProps<"/admin/administrateurs">) {
  const me = await requireSuperAdmin();
  const params = await searchParams;
  const [admins, history] = await Promise.all([
    prisma.user.findMany({
      where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } },
      orderBy: [{ platformRole: "desc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, image: true, platformRole: true, suspendedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: Object.keys(historyLabels) } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, targetId: true, details: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ]);
  const targets = await prisma.user.findMany({ where: { id: { in: history.map((entry) => entry.targetId) } }, select: { id: true, name: true } });
  const targetName = new Map(targets.map((user) => [user.id, user.name]));
  const superAdmins = admins.filter((admin) => admin.platformRole === "SUPER_ADMIN" && !admin.suspendedAt).length;

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Administrateurs</h1>
          <p className="v-page-subtitle">
            Donnez ou retirez l’accès à l’administration. Un administrateur supervise la plateforme ; un super administrateur gère aussi les administrateurs.
          </p>
        </div>
        <div className="v-page-actions">
          <ActionDialog
            action={grantAdminRole}
            description="La personne doit déjà avoir un compte PrestAfrik. Elle sera prévenue par e-mail."
            submitLabel="Donner les droits"
            title="Ajouter un administrateur"
            triggerClassName="btn btn-primary"
            triggerLabel="Ajouter un administrateur"
          >
            <label className="v-field">
              Adresse e-mail du compte
              <input autoComplete="off" maxLength={254} name="email" placeholder="prenom.nom@exemple.com" required type="email" />
            </label>
            <label className="v-field">
              Rôle
              <select defaultValue="ADMIN" name="role">
                <option value="ADMIN">{adminRoleLabels.ADMIN} : supervise la plateforme</option>
                <option value="SUPER_ADMIN">{adminRoleLabels.SUPER_ADMIN} : gère aussi les administrateurs</option>
              </select>
            </label>
            <Confirmation text="Je confirme donner ces droits : cette personne verra les comptes et les boutiques de toute la plateforme." />
          </ActionDialog>
        </div>
      </div>
      <AdminFeedback params={params} />

      <section className="v-card v-card-flush">
        <table className="v-table admin-table">
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Rôle</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const isMe = admin.id === me.id;
              const lastSuper = admin.platformRole === "SUPER_ADMIN" && superAdmins <= 1;
              const otherRole = admin.platformRole === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN";
              return (
                <tr key={admin.id}>
                  <td className="v-cell-primary">
                    <span className="admin-user">
                      <UserAvatar image={admin.image} name={admin.name} size={32} />
                      <span>
                        {admin.name}
                        {isMe && " (vous)"}
                        <span className="v-cell-sub">{admin.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="v-cell-badges" data-label="Rôle">
                    <Badge tone={admin.platformRole === "SUPER_ADMIN" ? "warning" : "info"}>{adminRoleLabels[admin.platformRole as "ADMIN" | "SUPER_ADMIN"]}</Badge>
                    {admin.suspendedAt && <Badge tone="danger">Suspendu</Badge>}
                  </td>
                  <td className="admin-row-actions">
                    {isMe ? (
                      <span className="v-small v-muted">Vous ne pouvez pas modifier vos propres droits.</span>
                    ) : lastSuper ? (
                      <span className="v-small v-muted">Dernier super administrateur : nommez-en un autre avant de modifier ce compte.</span>
                    ) : (
                      <>
                        <ActionDialog
                          action={grantAdminRole}
                          hiddenFields={{ email: admin.email, role: otherRole }}
                          submitLabel="Changer le rôle"
                          title={`${admin.name} devient ${adminRoleLabels[otherRole].toLowerCase()} ?`}
                          triggerClassName="v-link-button admin-row-action"
                          triggerLabel={otherRole === "SUPER_ADMIN" ? "Nommer super administrateur" : "Passer administrateur"}
                        >
                          <Confirmation text="Je confirme ce changement de rôle." />
                        </ActionDialog>
                        <ActionDialog
                          action={revokeAdminRole}
                          description={`${admin.name} n’aura plus accès à l’administration. Ses boutiques ne changent pas.`}
                          hiddenFields={{ userId: admin.id }}
                          submitClassName="btn btn-danger"
                          submitLabel="Retirer les droits"
                          title={`Retirer les droits de ${admin.name} ?`}
                          triggerClassName="v-link-button admin-row-action"
                          triggerLabel="Retirer les droits"
                        >
                          <Confirmation text="Je confirme retirer les droits d’administration." />
                        </ActionDialog>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="roles-history" className="v-card">
        <h2 className="v-card-title" id="roles-history">Historique des droits</h2>
        {history.length ? (
          <ul className="admin-history">
            {history.map((entry) => {
              const details = (entry.details ?? {}) as { to?: string; via?: string };
              return (
                <li key={entry.id}>
                  <strong>{entry.actor?.name ?? (details.via === "script" ? "Script d’installation" : "Compte supprimé")}</strong> {historyLabels[entry.action]}{" "}
                  <strong>{targetName.get(entry.targetId) ?? "un compte supprimé"}</strong>
                  {details.to && details.to !== "USER" ? ` (${adminRoleLabels[details.to as "ADMIN" | "SUPER_ADMIN"]?.toLowerCase() ?? details.to})` : ""}
                  <small> · {formatDateTime(entry.createdAt)}</small>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="v-muted">Aucun changement de droits pour le moment.</p>
        )}
      </section>
    </>
  );
}
