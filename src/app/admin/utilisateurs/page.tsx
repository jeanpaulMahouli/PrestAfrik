import { Download } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/account/user-avatar";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatTime } from "@/lib/format";
import { restoreUser, sendUserPasswordReset, suspendUser } from "@/modules/admin/actions";
import { emailConfirmedByAdmin, unverifyUserEmail, verifyUserEmail } from "@/modules/admin/account-actions";
import { isAdminRole, requirePlatformAdmin } from "@/modules/admin/context";
import { adminPageSize, countAdminUsersByFilter, listAdminUsers, userFilters, type UserFilter } from "@/modules/admin/queries";
import { acquisitionLabel } from "@/modules/auth/acquisition";
import { formatPhoneForDisplay, isPlaceholderEmail } from "@/modules/auth/phone-account";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";

export const metadata = { title: "Utilisateurs" };

const roleLabels = { OWNER: "Propriétaire", MANAGER: "Gestionnaire", ORDER_PREPARER: "Préparateur" } as const;

const filterLabels: Record<UserFilter, string> = {
  all: "Tous",
  "email-to-confirm": "E-mail à confirmer",
  "email-confirmed": "E-mail confirmé",
  "email-missing": "Sans e-mail (compte WhatsApp)",
};

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
  const requested = searchValue(params, "filtre") as UserFilter;
  const filter: UserFilter = userFilters.includes(requested) ? requested : "all";
  const [result, counts] = await Promise.all([listAdminUsers({ query, page, filter }), countAdminUsersByFilter()]);
  // Confirmations faites par l'administration : elles seules peuvent être annulées.
  const adminConfirmed = await emailConfirmedByAdmin(result.users.filter((user) => user.emailVerified).map((user) => user.id));
  const retour = currentPath("/admin/utilisateurs", params);
  const listHref = (next: { filtre?: UserFilter; page?: number }) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    const nextFilter = next.filtre ?? filter;
    if (nextFilter !== "all") search.set("filtre", nextFilter);
    if (next.page && next.page > 1) search.set("page", String(next.page));
    const value = search.toString();
    return value ? `/admin/utilisateurs?${value}` : "/admin/utilisateurs";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Utilisateurs</h1>
          <p className="v-page-subtitle">Retrouvez les comptes de la plateforme, leurs boutiques et leurs rôles, et confirmez leur adresse e-mail.</p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <a
            aria-label="Exporter les utilisateurs (fichier CSV)"
            className="icon-button"
            download
            href={`/api/admin/export?type=utilisateurs${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            title="Exporter les utilisateurs (CSV)"
          >
            <Download aria-hidden="true" size={18} />
          </a>
        </div>
      </div>
      <AdminFeedback params={params} />
      <p className="v-banner v-banner-info">
        Pour une adresse e-mail <strong>à confirmer</strong>, cliquez sur <strong>Confirmer l’adresse</strong> : le compte est confirmé sans le code. Une confirmation faite ici peut être annulée ; une adresse confirmée par la personne elle-même reste confirmée. Ouvrez <strong>Gérer le compte</strong> pour modifier, déconnecter, suspendre ou supprimer un compte. Les mots de passe ne sont jamais visibles.
      </p>

      <nav aria-label="Filtrer les utilisateurs" className="pill-tabs">
        {userFilters.map((key) => (
          <Link aria-current={filter === key ? "page" : undefined} href={listHref({ filtre: key })} key={key}>
            {filterLabels[key]} ({counts[key]})
          </Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="admin-search" role="search">
          <label className="visually-hidden" htmlFor="admin-user-search">Rechercher un compte</label>
          {filter !== "all" && <input name="filtre" type="hidden" value={filter} />}
          <input defaultValue={query} id="admin-user-search" maxLength={100} name="q" placeholder="Rechercher par nom, e-mail ou numéro" type="search" />
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>
        {result.users.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Numéro WhatsApp</th>
                <th scope="col">E-mail</th>
                <th scope="col">Boutiques et rôles</th>
                <th scope="col">Ville</th>
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
                        <Link href={`/admin/utilisateurs/${user.id}`}>{user.name}</Link>
                        {user.acquisitionSource && <span className="v-cell-sub">A connu PrestAfrik par : {acquisitionLabel(user.acquisitionSource)}</span>}
                        {isAdminRole(user.platformRole) && (
                          <span className="v-cell-sub">{user.platformRole === "SUPER_ADMIN" ? "Super administrateur PrestAfrik" : "Administrateur PrestAfrik"}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td data-label="Numéro WhatsApp">
                    {user.phoneNumber ? (
                      <a href={buildWaMeUrl(user.phoneNumber, `Bonjour ${user.name.trim().split(/\s+/)[0]}, ici l’équipe PrestAfrik.`)} rel="noopener noreferrer" target="_blank" title="Écrire sur WhatsApp (nouvel onglet)">
                        {formatPhoneForDisplay(user.phoneNumber)}
                      </a>
                    ) : (
                      <span className="v-muted">Aucun numéro</span>
                    )}
                  </td>
                  <td data-label="E-mail">
                    {isPlaceholderEmail(user.email) ? (
                      <span className="v-muted">Aucune adresse</span>
                    ) : (
                      <span className="admin-email-check">
                        <span className="admin-email-check-line">
                          <span className="admin-email-check-address">{user.email}</span>
                          <Badge tone={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "Confirmée" : "À confirmer"}</Badge>
                        </span>
                        {!user.emailVerified && (
                          <form action={verifyUserEmail}>
                            <input name="userId" type="hidden" value={user.id} />
                            <input name="retour" type="hidden" value={retour} />
                            <SubmitButton className="btn btn-primary admin-email-check-btn" pendingLabel="Confirmation…">
                              Confirmer l’adresse
                            </SubmitButton>
                          </form>
                        )}
                        {user.emailVerified && adminConfirmed.has(user.id) && (
                          <form action={unverifyUserEmail}>
                            <input name="userId" type="hidden" value={user.id} />
                            <input name="retour" type="hidden" value={retour} />
                            <SubmitButton className="v-link-button admin-row-action" pendingLabel="Annulation…" title="Confirmée par l’administration">
                              Annuler la confirmation
                            </SubmitButton>
                          </form>
                        )}
                      </span>
                    )}
                  </td>
                  <td data-label="Boutiques et rôles">
                    {user.memberships.length ? user.memberships.map((membership) => `${membership.store.name} (${roleLabels[membership.role]})`).join(", ") : "—"}
                  </td>
                  <td data-label="Ville">{user.city ?? "—"}</td>
                  <td data-label="Dernière connexion">{lastSeen(user.lastSeenAt)}</td>
                  <td className="v-cell-badges" data-label="Statut">
                    <Badge tone={user.suspendedAt ? "danger" : "success"}>{user.suspendedAt ? "Suspendu" : "Actif"}</Badge>
                  </td>
                  <td className="admin-row-actions">
                    <Link className="v-link-button admin-row-action" href={`/admin/utilisateurs/${user.id}`}>
                      Gérer le compte
                    </Link>
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
                        {user.id !== admin.id && !isAdminRole(user.platformRole) && (
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
        href={(next) => listHref({ page: next })}
        page={page}
        pageSize={adminPageSize}
        total={result.total}
      />
    </>
  );
}
