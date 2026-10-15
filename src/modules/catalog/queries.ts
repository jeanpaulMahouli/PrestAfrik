import "server-only";

import type { Prisma, ProductAvailability, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const productTabs = [
  { key: "actifs", status: "ACTIVE", label: "Actifs" },
  { key: "brouillons", status: "DRAFT", label: "Brouillons" },
  { key: "archives", status: "ARCHIVED", label: "Archivés" },
] as const satisfies readonly { key: string; status: ProductStatus; label: string }[];

export type ProductTab = (typeof productTabs)[number]["key"];
export const productsPageSize = 25;

export type ProductListFilters = {
  tab: ProductTab;
  query: string;
  categoryId: string;
  availability: ProductAvailability | "";
  page: number;
};

export function parseProductFilters(params: Record<string, string | string[] | undefined>): ProductListFilters {
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const tab = productTabs.some((item) => item.key === value("onglet")) ? (value("onglet") as ProductTab) : "actifs";
  const availability = ["AVAILABLE", "SOLD_OUT", "PREORDER"].includes(value("disponibilite"))
    ? (value("disponibilite") as ProductAvailability)
    : "";
  return {
    tab,
    query: value("q").trim().slice(0, 80),
    categoryId: /^c[a-z0-9]{20,}$/.test(value("categorie")) ? value("categorie") : "",
    availability,
    page: Math.max(1, Math.min(500, Number(value("page")) || 1)),
  };
}

export async function listVendorProducts(storeId: string, filters: ProductListFilters) {
  const status = productTabs.find((item) => item.key === filters.tab)!.status;
  const where: Prisma.ProductWhereInput = {
    storeId,
    status,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.availability ? { availability: filters.availability } : {}),
    ...(filters.query
      ? { OR: [{ name: { contains: filters.query, mode: "insensitive" } }, { sku: { contains: filters.query, mode: "insensitive" } }] }
      : {}),
  };
  const [products, total, counts, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (filters.page - 1) * productsPageSize,
      take: productsPageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        availability: true,
        trackInventory: true,
        stockQuantity: true,
        priceXaf: true,
        promotionalPriceXaf: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        variants: { where: { isArchived: false }, select: { stockQuantity: true } },
        _count: { select: { images: true, orderItems: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["status"], where: { storeId }, _count: { _all: true } }),
    prisma.productCategory.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const countByStatus = Object.fromEntries(counts.map((row) => [row.status, row._count._all])) as Partial<Record<ProductStatus, number>>;
  return { products, total, countByStatus, categories };
}

export type VendorProductRow = Awaited<ReturnType<typeof listVendorProducts>>["products"][number];

export async function getEditableProduct(storeId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, storeId },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { isArchived: false }, orderBy: { createdAt: "asc" } },
      _count: { select: { orderItems: true } },
    },
  });
}

export async function getStoreCategories(storeId: string) {
  return prisma.productCategory.findMany({ where: { storeId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
}
