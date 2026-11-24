import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AdminFeedback, currentPath, searchValue } from "@/components/admin/admin-feedback";
import { ProductsModeration } from "@/components/admin/products-moderation";
import { Pagination } from "@/components/ui/pagination";
import type { Tone } from "@/config/statuses";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { formatXaf } from "@/modules/catalog/format";
import { excludedStoreIds } from "@/modules/marketplace/search";
import { marketplaceProductPath, minMarketplacePriceXaf } from "@/modules/marketplace/shop";

export const metadata = { title: "Produits" };

const pageSize = 30;
const statuses = { tous: "Tous", visibles: "Sur la marketplace", masques: "Masqués", hors: "Hors marketplace" } as const;
type Status = keyof typeof statuses;

/** Conditions d'un produit présent sur la marketplace (mêmes règles que la marketplace elle-même). */
function visibleWhere(excluded: string[]): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    archivedAt: null,
    availability: "AVAILABLE",
    marketplaceHiddenAt: null,
    images: { some: {} },
    priceXaf: { gte: minMarketplacePriceXaf },
    OR: [{ promotionalPriceXaf: null }, { promotionalPriceXaf: { gte: minMarketplacePriceXaf } }],
    store: { isPublished: true, suspendedAt: null, ...(excluded.length ? { id: { notIn: excluded } } : {}) },
  };
}

type Row = {
  status: string;
  archivedAt: Date | null;
  availability: string;
  marketplaceHiddenAt: Date | null;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  _count: { images: number };
  store: { id: string; isPublished: boolean; suspendedAt: Date | null };
};

/** Statut d'un produit sur la marketplace et, s'il n'y est pas, pourquoi. */
function marketplaceState(row: Row, excluded: Set<string>): { label: string; tone: Tone; reason?: string } {
  if (row.marketplaceHiddenAt) return { label: "Masqué", tone: "danger" };
  const reasons = [
    row.archivedAt || row.status !== "ACTIVE" ? "désactivé par le vendeur" : null,
    row.availability !== "AVAILABLE" ? "épuisé ou sur commande" : null,
    row._count.images === 0 ? "sans photo" : null,
    Math.min(row.priceXaf, row.promotionalPriceXaf ?? row.priceXaf) < minMarketplacePriceXaf ? `prix sous ${minMarketplacePriceXaf} FCFA` : null,
    !row.store.isPublished ? "boutique non publiée" : null,
    row.store.suspendedAt ? "boutique suspendue" : null,
    excluded.has(row.store.id) ? "boutique exclue" : null,
  ].filter((reason): reason is string => Boolean(reason));
  return reasons.length ? { label: "Hors marketplace", tone: "neutral", reason: reasons.join(", ") } : { label: "Visible", tone: "success" };
}

/**
 * Administration → Produits : tous les produits des boutiques, du plus récent au plus ancien. Recherche,
 * filtres (statut, boutique, catégorie) et masquage sur la marketplace, produit par produit ou par sélection.
 */
export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const query = searchValue(params, "q", 80);
  const status: Status = Object.hasOwn(statuses, searchValue(params, "statut")) ? (searchValue(params, "statut") as Status) : "tous";
  const storeId = searchValue(params, "boutique", 40);
  const activity = searchValue(params, "categorie", 60);
  const page = Math.max(1, Math.min(1000, Number(searchValue(params, "page")) || 1));
  const excluded = [...(await excludedStoreIds())];
  const visible = visibleWhere(excluded);

  const filters: Prisma.ProductWhereInput[] = [];
  if (query) {
    filters.push({
      OR: [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }, { store: { name: { contains: query, mode: "insensitive" } } }],
    });
  }
  if (storeId) filters.push({ storeId });
  if (activity) filters.push({ store: { activity: { slug: activity } } });
  if (status === "visibles") filters.push(visible);
  if (status === "masques") filters.push({ marketplaceHiddenAt: { not: null } });
  if (status === "hors") filters.push({ marketplaceHiddenAt: null, NOT: visible });
  const where: Prisma.ProductWhereInput = filters.length ? { AND: filters } : {};

  const [rows, total, stores, activities, hiddenCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        priceXaf: true,
        promotionalPriceXaf: true,
        status: true,
        archivedAt: true,
        availability: true,
        createdAt: true,
        marketplaceHiddenAt: true,
        marketplaceHiddenBy: true,
        marketplaceHiddenReason: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        _count: { select: { images: true } },
        store: { select: { id: true, name: true, slug: true, isPublished: true, suspendedAt: true, activity: { select: { label: true } } } },
      },
    }),
    prisma.product.count({ where }),
    prisma.store.findMany({ where: { products: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.activity.findMany({ orderBy: { position: "asc" }, select: { slug: true, label: true } }),
    prisma.product.count({ where: { marketplaceHiddenAt: { not: null } } }),
  ]);
  const excludedSet = new Set(excluded);
  const retour = currentPath("/admin/produits", params);
  const listQuery = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(
      Object.entries({ q: query || undefined, statut: status === "tous" ? undefined : status, boutique: storeId || undefined, categorie: activity || undefined, ...changes }).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    return next.size ? `/admin/produits?${next.toString()}` : "/admin/produits";
  };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Produits</h1>
          <p className="v-page-subtitle">
            {formatNumber(total)} produit{total > 1 ? "s" : ""} · {formatNumber(hiddenCount)} masqué{hiddenCount > 1 ? "s" : ""} de la marketplace
          </p>
        </div>
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Statut sur la marketplace" className="pill-tabs">
        {(Object.keys(statuses) as Status[]).map((key) => (
          <Link aria-current={status === key ? "page" : undefined} href={listQuery({ statut: key === "tous" ? undefined : key, page: undefined })} key={key}>
            {statuses[key]}
          </Link>
        ))}
      </nav>

      <section className="v-card v-card-flush">
        <form className="admin-products-filters" role="search">
          {status !== "tous" && <input name="statut" type="hidden" value={status} />}
          <label className="visually-hidden" htmlFor="products-q">
            Rechercher
          </label>
          <input defaultValue={query} id="products-q" maxLength={80} name="q" placeholder="Produit, référence ou boutique" type="search" />
          <label className="visually-hidden" htmlFor="products-store">
            Boutique
          </label>
          <select defaultValue={storeId} id="products-store" name="boutique">
            <option value="">Toutes les boutiques</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="products-category">
            Catégorie
          </label>
          <select defaultValue={activity} id="products-category" name="categorie">
            <option value="">Toutes les catégories</option>
            {activities.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="submit">
            Filtrer
          </button>
          {(query || storeId || activity) && (
            <Link className="v-link-button" href={listQuery({ q: undefined, boutique: undefined, categorie: undefined, page: undefined })}>
              Effacer
            </Link>
          )}
        </form>

        {rows.length ? (
          <ProductsModeration
            retour={retour}
            rows={rows.map((row) => {
              const state = marketplaceState(row, excludedSet);
              const price = row.promotionalPriceXaf !== null && row.promotionalPriceXaf < row.priceXaf ? row.promotionalPriceXaf : row.priceXaf;
              return {
                id: row.id,
                name: row.name,
                sku: row.sku,
                imageUrl: row.images[0]?.url ?? null,
                href: state.label === "Visible" ? marketplaceProductPath(row.store.slug, row.slug) : `${storePublicUrl(row.store.slug)}/${row.slug}`,
                storeName: row.store.name,
                storeHref: listQuery({ boutique: row.store.id, page: undefined }),
                category: row.store.activity?.label ?? null,
                price: formatXaf(price),
                createdAt: formatDate(row.createdAt),
                hidden: Boolean(row.marketplaceHiddenAt),
                state,
                hiddenNote: row.marketplaceHiddenAt
                  ? `${row.marketplaceHiddenBy ? `Par ${row.marketplaceHiddenBy} ` : ""}le ${formatDate(row.marketplaceHiddenAt)}${row.marketplaceHiddenReason ? ` · ${row.marketplaceHiddenReason}` : ""}`
                  : null,
              };
            })}
          />
        ) : (
          <div className="v-empty">
            <h2>Aucun produit</h2>
            <p>Changez la recherche ou les filtres.</p>
          </div>
        )}
      </section>
      <Pagination href={(next) => listQuery({ page: String(next) })} page={page} pageSize={pageSize} total={total} />
    </>
  );
}
