import { Download } from "lucide-react";
import { countryCities } from "@/modules/geo";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { Tone } from "@/config/statuses";
import { formatNumber, maskPhone } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { customerSegments, listStoreCustomers, type CustomerSegment } from "@/modules/customers/queries";
import { customerSegmentLabel } from "@/modules/customers/segmentation";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Mes clients" };

const segmentLabels: Record<CustomerSegment, string> = {
  all: "Tous",
  new: "Nouveaux clients",
  regular: "Clients réguliers",
  unconfirmed: "Commandes à valider",
  inactive: "Clients inactifs",
  "to-recontact": "À recontacter",
};

const segmentBadges: Record<string, { label: string; tone: Tone }> = {
  "À recontacter": { label: "À recontacter", tone: "warning" },
  "Commande à valider": { label: "À valider", tone: "warning" },
  "Client régulier": { label: "Régulier", tone: "success" },
  "Nouveau client": { label: "Nouveau", tone: "info" },
  Inactif: { label: "Inactif", tone: "neutral" },
  Client: { label: "Client", tone: "neutral" },
};

export default async function CustomersPage({ searchParams }: PageProps<"/dashboard/clients">) {
  const { store, membership } = await requireStorePermission("customers.read");
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : "");
  const query = value("q").slice(0, 100);
  const segment = customerSegments.includes(value("segment") as CustomerSegment) ? (value("segment") as CustomerSegment) : "all";
  const tag = value("tag").slice(0, 40);
  const categoryId = /^c[a-z0-9]{20,}$/.test(value("categoryId")) ? value("categoryId") : "";
  const city = value("city").slice(0, 100);
  const consent = value("consent") === "accepted" || value("consent") === "not-accepted" ? (value("consent") as "accepted" | "not-accepted") : undefined;
  const page = Math.max(1, Math.min(1000, Number(value("page")) || 1));

  const [result, categories, tags] = await Promise.all([
    listStoreCustomers(store.id, { query, segment, tag, categoryId, city, marketingConsent: consent, page }),
    prisma.productCategory.findMany({ where: { storeId: store.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.customerTag.findMany({ where: { customer: { storeId: store.id } }, select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
  ]);
  const canManage = hasPermission(membership.role, "customers.manage");
  const filters = new URLSearchParams(
    Object.entries({ q: query, segment: segment === "all" ? "" : segment, tag, categoryId, city, consent: consent ?? "" }).filter(([, entry]) => entry),
  );
  const advancedActive = Boolean(tag || categoryId || city || consent);

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Mes clients</h1>
          <p className="v-page-subtitle">Votre fichier clients se remplit automatiquement à chaque commande : historique, segments et consentements.</p>
        </div>
        <div className="v-page-actions v-page-actions-inline">
          <a aria-label="Exporter les clients (fichier CSV)" className="icon-button" download href={`/api/dashboard/clients/export?${filters.toString()}`} title="Exporter les clients (CSV)">
            <Download aria-hidden="true" size={18} />
          </a>
          {canManage && <Link className="btn btn-primary" href="/dashboard/clients/nouveau">Ajouter un client</Link>}
        </div>
      </div>

      <nav aria-label="Segments de clients" className="pill-tabs">
        {customerSegments.map((key) => (
          <Link aria-current={segment === key ? "page" : undefined} href={key === "all" ? "/dashboard/clients" : `/dashboard/clients?segment=${key}`} key={key}>
            {segmentLabels[key]}
          </Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="customer-filters" role="search">
          {segment !== "all" && <input name="segment" type="hidden" value={segment} />}
          <label className="visually-hidden" htmlFor="customer-search">Rechercher un client</label>
          <input defaultValue={query} id="customer-search" maxLength={100} name="q" placeholder="Rechercher par nom ou numéro WhatsApp" type="search" />
          <details className="customer-advanced" open={advancedActive}>
            <summary>Plus de filtres</summary>
            <div className="customer-advanced-fields">
              <select aria-label="Tag" defaultValue={tag} name="tag">
                <option value="">Tous les tags</option>
                {tags.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
              <select aria-label="Catégorie achetée" defaultValue={categoryId} name="categoryId">
                <option value="">Toutes les catégories achetées</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <select aria-label="Ville" defaultValue={city} name="city">
                <option value="">Toutes les villes</option>
                {countryCities(store.country).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="Consentement marketing" defaultValue={consent ?? ""} name="consent">
                <option value="">Tous les consentements</option>
                <option value="accepted">Marketing accepté</option>
                <option value="not-accepted">Sans consentement marketing</option>
              </select>
            </div>
          </details>
          <button className="btn btn-secondary" type="submit">Rechercher</button>
        </form>

        {result.customers.length ? (
          <table className="v-table customers-table">
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Commandes</th>
                <th scope="col">Montant commandé</th>
                <th scope="col">Argent reçu</th>
                <th scope="col">Segment</th>
                <th scope="col">Consentement</th>
              </tr>
            </thead>
            <tbody>
              {result.customers.map((customer) => {
                const badge = segmentBadges[customerSegmentLabel(customer)] ?? segmentBadges.Client;
                return (
                  <tr key={customer.id}>
                    <td className="v-cell-primary">
                      <Link className="customer-name" href={`/dashboard/clients/${customer.id}`}>{customer.name}</Link>
                      {customer.nameConflict && <span className="v-cell-sub">Nom à vérifier</span>}
                    </td>
                    <td data-label="WhatsApp">{maskPhone(customer.whatsapp)}</td>
                    <td data-label="Commandes">{customer.orderCount}</td>
                    <td data-label="Montant commandé">{customer.orderedXaf ? formatNumber(customer.orderedXaf) : "—"}</td>
                    <td data-label="Argent reçu">{formatNumber(customer.receivedXaf)}</td>
                    <td className="v-cell-badges"><Badge tone={badge.tone}>{badge.label}</Badge></td>
                    <td className="v-cell-badges">
                      <Badge tone={customer.marketingConsent ? "success" : "neutral"}>{customer.marketingConsent ? "Marketing accepté" : "Suivi seulement"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="v-empty">
            {query || advancedActive || segment !== "all" ? (
              <>
                <h2>Aucun client ne correspond</h2>
                <p>Essayez une autre recherche ou un autre segment.</p>
                <Link className="btn btn-secondary" href="/dashboard/clients">Voir tous les clients</Link>
              </>
            ) : (
              <>
                <h2>Votre fichier clients est encore vide</h2>
                <p>Il se remplira tout seul à chaque commande. Vos prochains clients vous attendent !</p>
              </>
            )}
          </div>
        )}
      </section>
      <Pagination
        href={(next) => {
          const copy = new URLSearchParams(filters);
          copy.set("page", String(next));
          return `/dashboard/clients?${copy.toString()}`;
        }}
        page={page}
        pageSize={25}
        total={result.totalCount}
      />
    </VendorShell>
  );
}
