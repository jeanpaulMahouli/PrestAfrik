import { UserAvatar } from "@/components/account/user-avatar";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatTime } from "@/lib/format";
import { restoreUser, sendUserPasswordReset, suspendUser } from "@/modules/admin/actions";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { adminPageSize, listAdminUsers } from "@/modules/admin/queries";

export const metadata = { title: "Utilisateurs" };

const roleLabels = { OWNER: "Propriétaire", MANAGER: "Gestionnaire", ORDER_PREPARER: "Préparateur" } as const;

function lastSeen(date: Date | null, now = new Date()) {
  if (!date) return "Jamais";
  const today = formatDate(now);
  const yesterday = formatDate(new Date(now.getTime() - 86_400_000));
  if (formatDate(date) === today) return `Aujourd’hui, ${formatTime(date)}`;
  if (formatDate(date) === yesterday) return `Hier, ${formatTime(date)}`;
  return formatDate(date);
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const admin = await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q");
  const page = Math.max(1, Math.min(1000, Number(searchValue(params, "page")) || 1));
  const result = await listAdminUsers({ query, page });
  const retour = currentPath("/admin/utilisateurs", params);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Utilisateurs</h1>
          <p className="v-page-subtitle">Retrouvez les comptes de la plateforme, leurs boutiques et leurs rôles.</p>
        </div>
        <div className="v-page-actions">
          <a className="btn btn-secondary" download href={`/api/admin/export?type=utilisateurs${query ? `&q=${encodeURIComponent(query)}` : ""}`}>Exporter</a>
        </div>
      </div>
      <AdminFeedback params={params} />
      <p className="v-banner v-banner-info">
        <strong>Accès limité par conception.</strong> Vous voyez les comptes et les rôles, jamais les mots de passe ni les données clients des boutiques.
      </p>

      <section className="v-card v-card-flush">
        <form className="admin-search" role="search">
          <label className="visually-hidden" htmlFor="admin-user-search">Rechercher un compte</label>
          <input defaultValue={query} id="admin-user-search" maxLength={100} name="q" placeholder="Rechercher par nom ou adresse e-mail" type="search" />
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>
        {result.users.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">E-mail</th>
                <th scope="col">Boutiques et rôles</th>
                <th scope="col">Dernière connexion</th>
                <th scope="col">Statut</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <tr key={user.id}>
                  <td className="v-cell-primary">
                    <span className="admin-user">
                      <UserAvatar image={user.image} name={user.name} size={32} />
                      <span>
                        {user.name}
                        {user.platformRole === "ADMIN" && <span className="v-cell-sub">Administrateur PrestAfrik</span>}
                      </span>
                    </span>
                  </td>
                  <td data-label="E-mail">
                    {user.email}
                    {!user.emailVerified && <span className="v-cell-sub">Adresse non confirmée</span>}
                  </td>
                  <td data-label="Boutiques et rôles">
                    {user.memberships.length ? user.memberships.map((membership) => `${membership.store.name} (${roleLabels[membership.role]})`).join(", ") : "—"}
                  </td>
                  <td data-label="Dernière connexion">{lastSeen(user.lastSeenAt)}</td>
                  <td className="v-cell-badges" data-label="Statut">
                    <Badge tone={user.suspendedAt ? "danger" : "success"}>{user.suspendedAt ? "Suspendu" : "Actif"}</Badge>
                  </td>
                  <td className="admin-row-actions">
                    {user.suspendedAt ? (
                      <form action={restoreUser}>
                        <input name="userId" type="hidden" value={user.id} />
                        <input name="retour" type="hidden" value={retour} />
                        <SubmitButton className="v-link-button admin-row-action" pendingLabel="Rétablissement…">Rétablir l’accès</SubmitButton>
                      </form>
                    ) : (
                      <>
                        <form action={sendUserPasswordReset}>
                          <input name="userId" type="hidden" value={user.id} />
                          <input name="retour" type="hidden" value={retour} />
                          <SubmitButton className="v-link-button admin-row-action" pendingLabel="Envoi…">Envoyer un lien de réinitialisation</SubmitButton>
                        </form>
                        {user.id !== admin.id && user.platformRole !== "ADMIN" && (
                          <ReasonDialog
                            action={suspendUser}
                            description={`${user.name} sera déconnecté(e) de tous ses appareils et ne pourra plus se connecter. Ses boutiques restent en ligne.`}
                            hiddenFields={{ userId: user.id, retour }}
                            placeholder="Ex. : compte signalé pour usurpation"
                            submitLabel="Suspendre l’accès"
                            title={`Suspendre l’accès de ${user.name} ?`}
                            triggerLabel="Suspendre l’accès"
                          />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucun compte ne correspond</h2>
            <p>Essayez avec une autre partie du nom ou de l’adresse e-mail.</p>
          </div>
        )}
      </section>
      <Pagination
        href={(next) => `/admin/utilisateurs?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(next) }).toString()}`}
        page={page}
        pageSize={adminPageSize}
        total={result.total}
      />
    </>
  );
}
