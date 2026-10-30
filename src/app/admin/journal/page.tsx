import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { listAuditLog } from "@/modules/admin/queries";

export const metadata = { title: "Journal" };

const actionLabels: Record<string, string> = {
  "store.suspend": "Boutique suspendue",
  "store.restore": "Boutique rétablie",
  "subscription.extend-trial": "Essai prolongé",
  "messages.notify-owner": "Vendeur prévenu (messages échoués)",
  "alert.ignore": "Alerte ignorée",
  "alert.resolve": "Alerte traitée",
  "alert.reopen": "Alerte rouverte",
  "user.password-reset-link": "Lien de réinitialisation envoyé",
  "user.suspend": "Accès suspendu",
  "user.restore": "Accès rétabli",
  "user.promote-admin": "Rôle administrateur donné (script)",
  "user.demote-admin": "Rôle administrateur retiré (script)",
  "export.boutiques": "Export des boutiques",
  "export.abonnements": "Export des abonnements",
  "export.utilisateurs": "Export des utilisateurs",
};

const targetLabels: Record<string, string> = { store: "Boutique", user: "Compte", subscription: "Abonnement", alert: "Alerte", message: "Message", ticket: "Message reçu", announcement: "Annonce" };

function detailText(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = details as Record<string, unknown>;
  if (typeof value.reason === "string") return `Motif : ${value.reason}`;
  if (typeof value.days === "number") return `${value.days} jours`;
  if (typeof value.key === "string") return value.key;
  if (typeof value.rows === "number") return `${value.rows} lignes`;
  return "";
}

export default async function AdminAuditPage() {
  await requirePlatformAdmin();
  const entries = await listAuditLog(100);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Journal d’administration</h1>
          <p className="v-page-subtitle">Chaque action de l’équipe PrestAfrik est enregistrée : qui, quand, quoi et sur quelle cible. Les 100 dernières sont affichées.</p>
        </div>
      </div>
      <section className="v-card v-card-flush">
        {entries.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Administrateur</th>
                <th scope="col">Action</th>
                <th scope="col">Cible</th>
                <th scope="col">Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="v-cell-primary">{formatDateTime(entry.createdAt)}</td>
                  <td data-label="Administrateur">{entry.actor?.name ?? "Système"}</td>
                  <td data-label="Action">{actionLabels[entry.action] ?? entry.action}</td>
                  <td data-label="Cible">
                    {targetLabels[entry.targetType] ?? entry.targetType}
                    <span className="v-cell-sub">{entry.targetId}</span>
                  </td>
                  <td data-label="Détails">{detailText(entry.details) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucune action pour le moment</h2>
            <p>Les suspensions, prolongations et autres actions apparaîtront ici.</p>
          </div>
        )}
      </section>
    </>
  );
}
