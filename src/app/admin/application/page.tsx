import { Smartphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { storePublicUrl } from "@/lib/urls";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { listAppUsers } from "@/modules/admin/statistics";
import { formatWhatsappNumber } from "@/modules/whatsapp/wa-me";

export const metadata = { title: { absolute: "Application · Administration PrestAfrik" } };

export default async function AdminApplicationPage() {
  await requirePlatformAdmin();
  const data = await listAppUsers();

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Application</h1>
          <p className="v-page-subtitle">
            Les comptes qui ont installé PrestAfrik sur leur écran d’accueil, et ceux qui l’utilisent. Suivi depuis le 3 novembre 2026 : une installation plus
            ancienne apparaît dès la première ouverture de l’application.
          </p>
        </div>
      </div>

      <section aria-label="Chiffres clés" className="kpi-grid">
        <KpiCard icon={Smartphone} label="Application installée" value={formatNumber(data.installed)} />
        <KpiCard icon={Users} info="Ouverture depuis l’écran d’accueil sur les 30 derniers jours." label="Utilisateurs actifs (30 jours)" tone="green" value={formatNumber(data.active30)} />
        {data.byPlatform.slice(0, 2).map(([platform, count]) => (
          <KpiCard icon={Smartphone} key={platform} label={platform} tone="navy" value={formatNumber(count)} />
        ))}
      </section>

      <section aria-labelledby="app-users" className="v-card v-card-flush">
        <h2 className="v-card-title admin-card-title" id="app-users">Comptes avec l’application</h2>
        {data.rows.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Boutique</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Appareil</th>
                <th scope="col">Installée le</th>
                <th scope="col">Dernière ouverture</th>
                <th scope="col">Jours d’utilisation (30 j)</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="v-cell-primary">
                    {row.name}
                    <small className="v-muted admin-cell-sub">{row.email}</small>
                  </td>
                  <td data-label="Boutique">
                    {row.store ? (
                      <a href={storePublicUrl(row.store.slug)} rel="noreferrer" target="_blank">{row.store.name}</a>
                    ) : (
                      <span className="v-muted">Aucune</span>
                    )}
                  </td>
                  <td data-label="WhatsApp">{row.phone ? formatWhatsappNumber(row.phone) : <span className="v-muted">Non renseigné</span>}</td>
                  <td data-label="Appareil">{row.platform}</td>
                  <td data-label="Installée le">{row.installedAt ? formatDate(row.installedAt) : "—"}</td>
                  <td data-label="Dernière ouverture">{row.lastOpenedAt ? formatDateTime(row.lastOpenedAt) : "Jamais ouverte"}</td>
                  <td data-label="Jours d’utilisation (30 j)">{formatNumber(row.daysUsed30)}</td>
                  <td className="v-cell-badges" data-label="Statut">
                    <Badge tone={row.active ? "success" : "neutral"}>{row.active ? "Utilise l’application" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Personne n’a encore installé l’application</h2>
            <p>Les installations et les ouvertures depuis l’écran d’accueil apparaîtront ici.</p>
          </div>
        )}
      </section>
    </>
  );
}
