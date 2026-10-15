import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importColumns } from "@/modules/catalog/import";
import { safeCsvCell } from "@/modules/catalog/validation";
import { requireStorePermission } from "@/modules/stores/context";

const availabilityLabels = { AVAILABLE: "disponible", SOLD_OUT: "épuisé", PREORDER: "sur commande" } as const;

/** Export du catalogue, avec les mêmes colonnes que l'import (le fichier peut être réimporté). */
export async function GET() {
  const { store } = await requireStorePermission("products.read");
  const products = await prisma.product.findMany({
    where: { storeId: store.id, status: { not: "ARCHIVED" } },
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
    importColumns.map((column) => safeCsvCell(column)),
    ...products.map((product) =>
      [
        product.sku,
        product.name,
        product.description,
        product.category?.name,
        product.priceXaf,
        product.promotionalPriceXaf,
        availabilityLabels[product.availability],
        product.trackInventory ? product.stockQuantity : null,
      ].map((value) => safeCsvCell(value)),
    ),
  ];
  const csv = `﻿${rows.map((row) => row.join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-produits.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
