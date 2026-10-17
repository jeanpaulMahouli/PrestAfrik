import Image from "next/image";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { orderStageDisplay } from "@/config/statuses";
import { formatFcfa, formatPhone, formatReference, formatRelativeDay } from "@/lib/format";
import { photoVariant } from "@/lib/product-photos";
import { parseSearchQuery, searchLimit, searchStore } from "@/modules/dashboard/search";
import { orderStage } from "@/modules/orders/state-machine";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Recherche" };

/** Résultats de la recherche de la barre du haut (commandes, clients, produits). */
export default async function SearchPage({ searchParams }: PageProps<"/dashboard/recherche">) {
  const { store, membership } = await getStoreContext();
  const params = await searchParams;
  const query = parseSearchQuery(params.q);
  const results = query ? await searchStore(store.id, membership.role, query) : null;
  const total = results ? (results.orders?.length ?? 0) + (results.customers?.length ?? 0) + (results.products?.length ?? 0) : 0;
  const more = (count: number | undefined) => (count === searchLimit ? <p className="v-muted v-small search-more">Seuls les {searchLimit} premiers résultats sont affichés : précisez votre recherche.</p> : null);

  return (
    <VendorShell searchQuery={query?.text}>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Recherche</h1>
          <p className="v-page-subtitle">
            {!query
              ? "Saisissez au moins 2 caractères : référence de commande, nom ou numéro WhatsApp d’un client, nom de produit."
              : total
                ? `${total} résultat${total > 1 ? "s" : ""} pour « ${query.text} »`
                : `Aucun résultat pour « ${query.text} »`}
          </p>
        </div>
      </div>

      {query && !total && (
        <div className="v-card v-empty">
          <h2>Rien trouvé</h2>
          <p>Vérifiez l’orthographe, ou cherchez une référence (ex. MB-1041), un numéro WhatsApp ou une partie du nom.</p>
        </div>
      )}

      {results?.orders && results.orders.length > 0 && (
        <section aria-labelledby="search-orders" className="v-card v-card-flush search-section">
          <h2 className="v-card-title search-title" id="search-orders">
            Commandes <span className="v-tab-count">{results.orders.length}</span>
          </h2>
          <ul className="search-list">
            {results.orders.map((order) => (
              <li key={order.id}>
                <Link className="search-row" href={`/dashboard/commandes/${order.id}`}>
                  <span className="v-ref">{formatReference(order.reference)}</span>
                  <span className="search-row-main">
                    <strong>{order.customerName}</strong>
                    <small>
                      {[order.deliveryCity, order.neighborhood].filter(Boolean).join(", ")} · {formatRelativeDay(order.createdAt)}
                    </small>
                  </span>
                  <StatusBadge status={orderStageDisplay[orderStage(order.processingStatus)]} />
                  <strong className="search-row-end">{formatFcfa(order.totalXaf ?? order.subtotalXaf)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          {more(results.orders.length)}
        </section>
      )}

      {results?.customers && results.customers.length > 0 && (
        <section aria-labelledby="search-customers" className="v-card v-card-flush search-section">
          <h2 className="v-card-title search-title" id="search-customers">
            Clients <span className="v-tab-count">{results.customers.length}</span>
          </h2>
          <ul className="search-list">
            {results.customers.map((customer) => (
              <li key={customer.id}>
                <Link className="search-row" href={`/dashboard/clients/${customer.id}`}>
                  <span aria-hidden="true" className="search-avatar">
                    {customer.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="search-row-main">
                    <strong>{customer.name}</strong>
                    <small>{formatPhone(customer.whatsapp)}</small>
                  </span>
                  <span className="search-row-end v-muted">
                    {customer.orderCount} commande{customer.orderCount > 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {more(results.customers.length)}
        </section>
      )}

      {results?.products && results.products.length > 0 && (
        <section aria-labelledby="search-products" className="v-card v-card-flush search-section">
          <h2 className="v-card-title search-title" id="search-products">
            Produits <span className="v-tab-count">{results.products.length}</span>
          </h2>
          <ul className="search-list">
            {results.products.map((product) => (
              <li key={product.id}>
                <Link className="search-row" href={`/dashboard/produits/${product.id}`}>
                  <span className="search-thumb">
                    {product.images[0] ? <Image alt="" height={48} src={photoVariant(product.images[0].url, 320)} unoptimized width={48} /> : null}
                  </span>
                  <span className="search-row-main">
                    <strong>{product.name}</strong>
                    <small>Réf. {product.sku}</small>
                  </span>
                  {product.status === "DRAFT" && <Badge tone="neutral">Brouillon</Badge>}
                  <strong className="search-row-end">{formatFcfa(product.priceXaf)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          {more(results.products.length)}
        </section>
      )}
    </VendorShell>
  );
}
