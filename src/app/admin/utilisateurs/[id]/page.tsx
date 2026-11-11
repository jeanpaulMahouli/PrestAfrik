import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";
import { restoreUser, sendUserPasswordReset, suspendUser } from "@/modules/admin/actions";
import { deleteUserAccount, emailConfirmedByAdmin, signOutUserEverywhere, unverifyUserEmail, updateUserAccount, verifyUserEmail } from "@/modules/admin/account-actions";
import { acquisitionLabel } from "@/modules/auth/acquisition";
import { isPlaceholderEmail } from "@/modules/auth/phone-account";
import { isAdminRole, requirePlatformAdmin } from "@/modules/admin/context";
import { userCityFromStores } from "@/modules/geo";
import { buildWaMeUrl, formatWhatsappNumber } from "@/modules/whatsapp/wa-me";

export const metadata = { title: "Gérer le compte" };

const roleLabels = { OWNER: "Propriétaire", MANAGER: "Gestionnaire", ORDER_PREPARER: "Préparateur" } as const;

/** Administration → Utilisateurs → un compte : informations, accès, sessions et suppression. */
export default async function AdminUserPage({ params, searchParams }: PageProps<"/admin/utilisateurs/[id]">) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  const query = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      phoneNumber: true,
      acquisitionSource: true,
      platformRole: true,
      suspendedAt: true,
      suspensionReason: true,
      createdAt: true,
      lastActiveAt: true,
      appInstalledAt: true,
      accounts: { select: { providerId: true } },
      _count: { select: { sessions: true } },
      memberships: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              isPublished: true,
              _count: { select: { products: true, orders: true } },
              memberships: { where: { role: "OWNER" }, select: { userId: true } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const self = user.id === admin.id;
  const adminConfirmed = user.emailVerified && (await emailConfirmedByAdmin([user.id])).has(user.id);
  const protectedAdmin = !self && isAdminRole(user.platformRole) && admin.platformRole !== "SUPER_ADMIN";
  const soloStores = user.memberships.filter((membership) => membership.role === "OWNER" && membership.store.memberships.every((owner) => owner.userId === user.id));
  const providers = user.accounts.map((account) => (account.providerId === "google" ? "Google" : account.providerId === "credential" ? "E-mail et mot de passe" : account.providerId));
  const retour = `/admin/utilisateurs/${user.id}`;

  return (
    <>
      <p className="admin-back">
        <Link href="/admin/utilisateurs">← Tous les utilisateurs</Link>
      </p>
      <div className="v-page-header">
        <div className="admin-user admin-user-lg">
          <UserAvatar image={user.image} name={user.name} size={48} />
          <div>
            <h1 className="v-page-title">{user.name}</h1>
            <p className="v-page-subtitle">
              Inscrit le {formatDate(user.createdAt)} · {providers.join(", ") || "Aucun moyen de connexion"}
              {isAdminRole(user.platformRole) && ` · ${user.platformRole === "SUPER_ADMIN" ? "Super administrateur" : "Administrateur"}`}
            </p>
          </div>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <Badge tone={user.suspendedAt ? "danger" : "success"}>{user.suspendedAt ? "Suspendu" : "Actif"}</Badge>
          {!isPlaceholderEmail(user.email) && <Badge tone={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "E-mail confirmé" : "E-mail à confirmer"}</Badge>}
        </div>
      </div>
      <AdminFeedback params={query} />
      {protectedAdmin && <p className="v-banner v-banner-info">Compte administrateur : seul un super administrateur peut le modifier ou le supprimer.</p>}
      {user.suspendedAt && (
        <p className="v-banner v-banner-danger">
          Accès suspendu le {formatDate(user.suspendedAt)}. Motif : {user.suspensionReason ?? "non précisé"}.
        </p>
      )}

      <div className="admin-account-grid">
        <section aria-labelledby="account-info" className="v-card">
          <h2 className="v-card-title" id="account-info">Informations du compte</h2>
          <form action={updateUserAccount} className="admin-account-form">
            <input name="userId" type="hidden" value={user.id} />
            <label className="v-field">
              Nom
              <input defaultValue={user.name} disabled={protectedAdmin} maxLength={80} name="name" required />
            </label>
            <label className="v-field">
              Adresse e-mail
              <input defaultValue={user.email} disabled={protectedAdmin} maxLength={254} name="email" required type="email" />
            </label>
            <label className="v-field">
              Numéro WhatsApp
              <input
                defaultValue={user.phoneNumber ? formatWhatsappNumber(user.phoneNumber) : ""}
                disabled={protectedAdmin}
                inputMode="tel"
                maxLength={24}
                name="phone"
                placeholder="+237 6 99 00 00 00"
              />
              <span className="v-field-help">Avec l’indicatif du pays. Vide : la personne devra le saisir à sa prochaine connexion. Un nouveau numéro repasse « à valider ».</span>
            </label>
            {!protectedAdmin && (
              <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">
                Enregistrer
              </SubmitButton>
            )}
          </form>
        </section>

        <section aria-labelledby="account-access" className="v-card">
          <h2 className="v-card-title" id="account-access">Accès et sécurité</h2>
          <dl className="admin-account-facts">
            <div>
              <dt>Numéro WhatsApp</dt>
              <dd>
                {user.phoneNumber ? (
                  <>
                    <a href={buildWaMeUrl(user.phoneNumber, `Bonjour ${user.name.trim().split(/\s+/)[0]}, ici l’équipe PrestAfrik.`)} rel="noopener noreferrer" target="_blank">
                      {formatWhatsappNumber(user.phoneNumber)}
                    </a>
                  </>
                ) : (
                  "Aucun"
                )}
              </dd>
            </div>
            <div>
              <dt>A connu PrestAfrik par</dt>
              <dd>{acquisitionLabel(user.acquisitionSource) ?? "Pas de réponse"}</dd>
            </div>
            <div>
              <dt>Ville (d’après ses boutiques)</dt>
              <dd>{userCityFromStores(user.memberships.map(({ role, store }) => ({ city: store.city, owner: role === "OWNER" }))) ?? "Non renseignée"}</dd>
            </div>
            <div>
              <dt>Dernière activité</dt>
              <dd>{user.lastActiveAt ? formatDateTime(user.lastActiveAt) : "Jamais"}</dd>
            </div>
            <div>
              <dt>Appareils connectés</dt>
              <dd>{user._count.sessions}</dd>
            </div>
            <div>
              <dt>Application installée</dt>
              <dd>{user.appInstalledAt ? `Oui, le ${formatDate(user.appInstalledAt)}` : "Non"}</dd>
            </div>
          </dl>
          {!protectedAdmin && (
            <div className="admin-account-actions">
              {!user.emailVerified && !isPlaceholderEmail(user.email) && (
                <form action={verifyUserEmail}>
                  <input name="userId" type="hidden" value={user.id} />
                  <SubmitButton className="btn btn-secondary" pendingLabel="Confirmation…">Confirmer l’adresse e-mail</SubmitButton>
                </form>
              )}
              {user.emailVerified && adminConfirmed && (
                <form action={unverifyUserEmail}>
                  <input name="userId" type="hidden" value={user.id} />
                  <SubmitButton className="btn btn-secondary" pendingLabel="Annulation…">Annuler la confirmation de l’e-mail</SubmitButton>
                </form>
              )}
              {!user.suspendedAt && (
                <form action={sendUserPasswordReset}>
                  <input name="userId" type="hidden" value={user.id} />
                  <input name="retour" type="hidden" value={retour} />
                  <SubmitButton className="btn btn-secondary" pendingLabel="Envoi…">Envoyer un lien de nouveau mot de passe</SubmitButton>
                </form>
              )}
              {!self && user._count.sessions > 0 && (
                <form action={signOutUserEverywhere}>
                  <input name="userId" type="hidden" value={user.id} />
                  <SubmitButton className="btn btn-secondary" pendingLabel="Déconnexion…">Déconnecter de tous les appareils</SubmitButton>
                </form>
              )}
              {!self &&
                (user.suspendedAt ? (
                  <form action={restoreUser}>
                    <input name="userId" type="hidden" value={user.id} />
                    <input name="retour" type="hidden" value={retour} />
                    <SubmitButton className="btn btn-secondary" pendingLabel="Rétablissement…">Rétablir l’accès</SubmitButton>
                  </form>
                ) : (
                  !isAdminRole(user.platformRole) && (
                    <ReasonDialog
                      action={suspendUser}
                      description={`${user.name} sera déconnecté(e) de tous ses appareils et ne pourra plus se connecter. Ses boutiques restent en ligne.`}
                      hiddenFields={{ userId: user.id, retour }}
                      placeholder="Ex. : compte signalé pour usurpation"
                      submitLabel="Suspendre l’accès"
                      title={`Suspendre l’accès de ${user.name} ?`}
                      triggerLabel="Suspendre l’accès"
                    />
                  )
                ))}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="account-stores" className="v-card v-card-flush">
        <h2 className="v-card-title admin-card-title" id="account-stores">Boutiques</h2>
        {user.memberships.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Rôle</th>
                <th scope="col">Produits</th>
                <th scope="col">Commandes</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {user.memberships.map(({ role, store }) => (
                <tr key={store.id}>
                  <td className="v-cell-primary">
                    <a href={storePublicUrl(store.slug)} rel="noreferrer" target="_blank">{store.name}</a>
                  </td>
                  <td data-label="Rôle">{roleLabels[role]}</td>
                  <td data-label="Produits">{store._count.products}</td>
                  <td data-label="Commandes">{store._count.orders}</td>
                  <td className="v-cell-badges" data-label="Statut">
                    <Badge tone={store.isPublished ? "success" : "neutral"}>{store.isPublished ? "En ligne" : "Brouillon"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="v-muted admin-card-empty">Aucune boutique.</p>
        )}
      </section>

      {!self && !protectedAdmin && (
        <section aria-labelledby="account-delete" className="v-card admin-danger-zone">
          <h2 className="v-card-title" id="account-delete">Supprimer le compte</h2>
          <p>
            Suppression <strong>définitive</strong> du compte de {user.name} : connexions, brouillons et accès aux boutiques.
            {soloStores.length > 0 ? (
              <>
                {" "}
                {soloStores.length > 1 ? "Ses boutiques" : "Sa boutique"} <strong>{soloStores.map(({ store }) => `« ${store.name} »`).join(", ")}</strong>{" "}
                {soloStores.length > 1 ? "seront supprimées" : "sera supprimée"} aussi, avec produits, commandes, clients et images (personne d’autre n’en est
                propriétaire).
              </>
            ) : (
              " Les boutiques partagées restent en place, avec tout leur historique."
            )}{" "}
            Cette action ne peut pas être annulée.
          </p>
          <form action={deleteUserAccount} className="admin-danger-form">
            <input name="userId" type="hidden" value={user.id} />
            <label className="v-field">
              Pour confirmer, tapez l’adresse e-mail du compte : <strong>{user.email}</strong>
              <input autoComplete="off" name="confirmEmail" required spellCheck={false} type="text" />
            </label>
            <SubmitButton className="btn btn-danger" pendingLabel="Suppression…">
              Supprimer définitivement le compte
            </SubmitButton>
          </form>
        </section>
      )}
    </>
  );
}
