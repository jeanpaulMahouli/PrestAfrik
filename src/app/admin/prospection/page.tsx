import { Download, MessageCircle } from "lucide-react";
import { searchValue } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatNumber, plural } from "@/lib/format";
import { requirePlatformAdmin } from "@/modules/admin/context";
import {
  listProspects,
  parseProspectionFilters,
  prospectionFilterLabels,
  prospectionFilters,
  prospectionPageSize,
  prospectStatus,
  prospectWhatsappUrl,
} from "@/modules/admin/prospection";

export const metadata = { title: "Prospection" };

export default async function AdminProspectionPage({ searchParams }: PageProps<"/admin/prospection">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q");
  const filters = parseProspectionFilters(params.filtre);
  const page = Math.max(1, Math.min(1000, Number(searchValue(params, "page")) || 1));
  const { rows, total } = await listProspects({ filters, query });
  const visible = rows.slice((page - 1) * prospectionPageSize, page * prospectionPageSize);
  const listQuery = (extra: Record<string, string> = {}) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    for (const filter of filters) next.append("filtre", filter);
    for (const [key, value] of Object.entries(extra)) next.set(key, value);
    return next.toString();
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Prospection</h1>
          <p className="v-page-subtitle">Tous les utilisateurs, du plus récent au plus ancien. Filtrez, puis contactez-les en un geste sur WhatsApp.</p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <a aria-label="Exporter la liste filtrée (fichier CSV)" className="icon-button" download href={`/api/admin/export?type=prospection&${listQuery()}`} title="Exporter la liste filtrée (CSV)">
            <Download aria-hidden="true" size={18} />
          </a>
        </div>
      </div>

      <section className="v-card v-card-flush">
        <form className="admin-search prospection-filters" role="search">
          <label className="visually-hidden" htmlFor="prospect-search">Rechercher un utilisateur</label>
          <input defaultValue={query} id="prospect-search" maxLength={100} name="q" placeholder="Nom, e-mail, téléphone ou ville" type="search" />
          <fieldset>
            <legend className="visually-hidden">Filtres (combinables)</legend>
            {prospectionFilters.map((filter) => (
              <label className="filter-chip" key={filter}>
                <input defaultChecked={filters.includes(filter)} name="filtre" type="checkbox" value={filter} />
                {prospectionFilterLabels[filter]}
              </label>
            ))}
          </fieldset>
          <button className="btn btn-secondary" type="submit">Appliquer</button>
        </form>

        <p className="admin-count prospection-count">
          <Badge>{plural(total, "utilisateur")}</Badge>
          {filters.length > 0 && <span className="v-muted v-small"> · {filters.map((filter) => prospectionFilterLabels[filter]).join(" + ")}</span>}
        </p>

        {visible.length ? (
          <table className="v-table admin-table prospection-table">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">E-mail</th>
                <th scope="col">Téléphone</th>
                <th scope="col">Ville</th>
                <th scope="col">Pays</th>
                <th scope="col">Boutiques</th>
                <th scope="col">Statut</th>
                <th scope="col">Inscription</th>
                <th scope="col">Dernière activité</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const status = prospectStatus(row);
                const whatsapp = prospectWhatsappUrl(row, filters);
                return (
                  <tr key={row.id}>
                    <td className="v-cell-primary">
                      {row.name}
                      {row.missing.length > 0 && (
                        <span className="prospect-missing" tabIndex={0} title={`Ce qui manque :\n${row.missing.join("\n")}`}>
                          À aider
                          <span className="visually-hidden"> : {row.missing.join(" ; ")}</span>
                        </span>
                      )}
                    </td>
                    <td data-label="E-mail">{row.email}</td>
                    <td data-label="Téléphone">{row.phone ?? <span className="v-muted">Non renseigné</span>}</td>
                    <td data-label="Ville">{row.city ?? "—"}</td>
                    <td data-label="Pays">{row.country ?? "—"}</td>
                    <td data-label="Boutiques">{formatNumber(row.storeCount)}</td>
                    <td className="v-cell-badges" data-label="Statut"><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td data-label="Inscription">{formatDate(row.createdAt)}</td>
                    <td data-label="Dernière activité">{row.lastActivity ? formatDate(row.lastActivity) : "Jamais"}</td>
                    <td className="admin-row-actions">
                      <span className="icon-actions">
                        {whatsapp ? (
                          <a aria-label={`Écrire à ${row.name} sur WhatsApp`} className="icon-button icon-button-sm icon-button-whatsapp" href={whatsapp} rel="noreferrer" target="_blank" title="Écrire sur WhatsApp">
                            <MessageCircle aria-hidden="true" size={16} />
                          </a>
                        ) : (
                          <button aria-label={`WhatsApp indisponible : aucun numéro pour ${row.name}`} className="icon-button icon-button-sm" disabled title="Aucun numéro renseigné" type="button">
                            <MessageCircle aria-hidden="true" size={16} />
                          </button>
                        )}
                        {row.phone && <CopyButton className="v-link-button" copiedLabel="Copié !" label="Copier le numéro" value={`+${row.phoneDigits}`} />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            <h2>Aucun utilisateur ne correspond</h2>
            <p>Retirez un filtre ou essayez une autre recherche (nom, e-mail, téléphone ou ville).</p>
          </div>
        )}
      </section>
      <Pagination href={(next) => `/admin/prospection?${listQuery({ page: String(next) })}`} page={page} pageSize={prospectionPageSize} total={total} />
    </>
  );
}
