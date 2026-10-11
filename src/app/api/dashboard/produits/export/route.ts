import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCsvCell } from "@/modules/catalog/validation";
import { requireStorePermission } from "@/modules/stores/context";

export async function GET() {
  const { store } = await requireStorePermission("products.read");
  const products = await prisma.product.findMany({
    where: { storeId: store.id, isArchived: false },
    select: {
      name: true,
      sku: true,
      description: true,
      priceXaf: true,
      promotionalPriceXaf: true,
      availability: true,
      trackInventory: true,
      stockQuantity: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 10_000,
  });

  const rows = [
    ["name", "sku", "description", "priceXaf", "promotionalPriceXaf", "availability", "trackInventory", "stockQuantity", "category"],
    ...products.map((product) => [
      safeCsvCell(product.name),
      safeCsvCell(product.sku),
      safeCsvCell(product.description),
      safeCsvCell(product.priceXaf),
      safeCsvCell(product.promotionalPriceXaf),
      safeCsvCell(product.availability),
      safeCsvCell(product.trackInventory ? "true" : "false"),
      safeCsvCell(product.stockQuantity),
      safeCsvCell(product.category?.name),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}`;
  const filename = `${store.slug}-produits.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
