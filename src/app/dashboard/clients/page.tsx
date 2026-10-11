import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireStorePermission } from "@/modules/stores/context";
import {
  customerSegments,
  listStoreCustomers,
  type CustomerSegment,
} from "@/modules/customers/queries";
import { customerSegmentLabel } from "@/modules/customers/segmentation";
import { prisma } from "@/lib/prisma";

type CustomerPageParams = {
  q?: string;
  segment?: string;
  tag?: string;
  categoryId?: string;
  city?: string;
  consent?: string;
  page?: string;
};

const segmentLabels: Record<CustomerSegment, string> = {
  all: "Tous",
  new: "Nouveaux clients",
  regular: "Clients réguliers",
  unconfirmed: "Commandes non confirmées",
  inactive: "Clients inactifs",
  "to-recontact": "À recontacter",
};

export default async function CustomersPage({
  searchParams,
}: PageProps<"/dashboard/clients">) {
  const { session, store, memberships, membership } = await requireStorePermission("customers.read");
  const params = (await searchParams) as CustomerPageParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const segment = customerSegments.includes(params.segment as CustomerSegment)
    ? (params.segment as CustomerSegment)
    : "all";
  const tag = typeof params.tag === "string" ? params.tag.trim().slice(0, 40) : "";
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";
  const city = typeof params.city === "string" ? params.city.trim().slice(0, 100) : "";
  const marketingConsent =
    params.consent === "accepted"
      ? "accepted"
      : params.consent === "not-accepted"
        ? "not-accepted"
        : undefined;
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));

  const [result, categories, tags] = await Promise.all([
    listStoreCustomers(store.id, {
      query,
      segment,
      tag,
      categoryId,
      city,
      marketingConsent,
      page,
    }),
    prisma.productCategory.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customerTag.findMany({
      where: { customer: { storeId: store.id } },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    }),
  ]);

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
          <h1 className="dashboard-heading">Clients</h1>
          <p className="dashboard-copy">
            {result.totalCount} client{result.totalCount === 1 ? "" : "s"} dans ta boutique
          </p>
        </div>
        <div className="page-actions customer-page-actions">
          <a className="secondary-button" href={customerExportHref(params)}>
            Exporter CSV
          </a>
          <Link className="primary-button" href="/dashboard/clients/nouveau">
            Ajouter un client
          </Link>
        </div>
      </div>
      {result.totalCount > 10_000 && (
        <p className="notice" role="status">
          L’export CSV est limité aux 10 000 premières fiches correspondant aux filtres.
        </p>
      )}

      <nav aria-label="Segments clients" className="customer-segments">
        {customerSegments.map((value) => (
          <Link
            aria-current={segment === value ? "page" : undefined}
            className={segment === value ? "customer-segment active" : "customer-segment"}
            href={customerHref({ ...params, segment: value, page: undefined })}
            key={value}
          >
            {segmentLabels[value]}
          </Link>
        ))}
      </nav>

      <section aria-label="Filtres des clients" className="surface-card customer-list-card">
        <form className="customer-filters" method="get">
          <input aria-label="Segment client" name="segment" type="hidden" value={segment} />
          <label className="visually-hidden" htmlFor="customer-search">Nom ou numéro WhatsApp</label>
          <input
            defaultValue={query}
            id="customer-search"
            maxLength={100}
            name="q"
            placeholder="Nom ou numéro WhatsApp"
            type="search"
          />
          <label className="visually-hidden" htmlFor="customer-tag">Filtrer par tag</label>
          <select defaultValue={tag} id="customer-tag" name="tag">
            <option value="">Tous les tags</option>
            {tags.map(({ name }) => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="customer-category">Filtrer par catégorie achetée</label>
          <select defaultValue={categoryId} id="customer-category" name="categoryId">
            <option value="">Toutes les catégories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="customer-city">Filtrer par ville</label>
          <input
            defaultValue={city}
            id="customer-city"
            maxLength={100}
            name="city"
            placeholder="Ville"
          />
          <label className="visually-hidden" htmlFor="customer-consent">Consentement marketing</label>
          <select defaultValue={marketingConsent ?? ""} id="customer-consent" name="consent">
            <option value="">Tous les consentements</option>
            <option value="accepted">Marketing accepté</option>
            <option value="not-accepted">Sans consentement marketing actif</option>
          </select>
          <button className="secondary-button" type="submit">Filtrer</button>
        </form>

        {result.customers.length ? (
          <div className="responsive-table-wrap">
            <table className="data-table customer-table">
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
                {result.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link className="customer-name-link" href={`/dashboard/clients/${customer.id}`}>
                        {customer.name}
                      </Link>
                      {customer.nameConflict && <small className="customer-conflict-text">Nom à vérifier</small>}
                      {customer.tags.length > 0 && (
                        <span className="customer-tag-list">
                          {customer.tags.map((name) => <span className="customer-tag" key={name}>{name}</span>)}
                        </span>
                      )}
                    </td>
                    <td><a className="customer-phone-link" href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`} rel="noreferrer" target="_blank">{customer.whatsapp}</a></td>
                    <td>{customer.orderCount}</td>
                    <td>{formatAmount(customer.orderedXaf)} FCFA</td>
                    <td>{formatAmount(customer.receivedXaf)} FCFA</td>
                    <td><span className="customer-segment-badge">{customerSegmentLabel(customer)}</span></td>
                    <td>
                      <span className={customer.marketingConsent ? "customer-consent accepted" : "customer-consent"}>
                        {customer.marketingConsent ? "Marketing accepté" : customer.followUpConsent ? "Suivi seulement" : "Aucun"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state customer-empty-state">
            <h2>{query || tag || city || categoryId || marketingConsent || segment !== "all" ? "Aucun client trouvé" : "Pas encore de client"}</h2>
            <p>
              {query || tag || city || categoryId || marketingConsent || segment !== "all"
                ? "Modifie les filtres ou choisis un autre segment."
                : "Les clients ayant commandé dans ta boutique apparaîtront ici. Tu peux aussi ajouter une fiche manuellement."}
            </p>
            {segment === "all" && !query && (
              <Link className="primary-button" href="/dashboard/clients/nouveau">Ajouter un client</Link>
            )}
          </div>
        )}

        {result.totalCount > 25 && (
          <nav aria-label="Pages des clients" className="pagination">
            {result.page > 1 && (
              <Link className="secondary-button" href={customerHref({ ...params, page: String(result.page - 1) })}>
                Page précédente
              </Link>
            )}
            <span>Page {result.page} sur {result.pageCount}</span>
            {result.page < result.pageCount && (
              <Link className="secondary-button" href={customerHref({ ...params, page: String(result.page + 1) })}>
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </section>
    </DashboardShell>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function customerHref(params: CustomerPageParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/dashboard/clients${suffix ? `?${suffix}` : ""}`;
}

function customerExportHref(params: CustomerPageParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && typeof value === "string" && value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/api/dashboard/clients/export${suffix ? `?${suffix}` : ""}`;
}
