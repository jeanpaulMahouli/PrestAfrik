import { NextResponse } from "next/server";
import { orderStageDisplay } from "@/config/statuses";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { safeCsvCell } from "@/modules/catalog/validation";
import { orderTabFilter, parseOrderTab } from "@/modules/orders/queries";
import { orderStage } from "@/modules/orders/state-machine";
import { requireStorePermission } from "@/modules/stores/context";

export async function GET(request: Request) {
  const { store } = await requireStorePermission("orders.export");
  const tab = parseOrderTab(new URL(request.url).searchParams.get("onglet"));
  const orders = await prisma.order.findMany({
    where: { storeId: store.id, ...orderTabFilter(tab) },
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      reference: true,
      createdAt: true,
      customerName: true,
      customerWhatsapp: true,
      deliveryMethod: true,
      deliveryCity: true,
      neighborhood: true,
      processingStatus: true,
      subtotalXaf: true,
      deliveryFeeXaf: true,
      totalXaf: true,
    },
  });
  const header = ["reference", "date", "client", "whatsapp", "mode", "ville", "quartier", "statut", "articles", "frais_livraison", "total"];
  const rows = orders.map((order) =>
    [
      order.reference,
      formatDateTime(order.createdAt),
      order.customerName,
      order.customerWhatsapp,
      order.deliveryMethod === "PICKUP" ? "Retrait" : "Livraison",
      order.deliveryCity,
      order.neighborhood,
      orderStageDisplay[orderStage(order.processingStatus)].label,
      order.subtotalXaf,
      order.deliveryFeeXaf ?? 0,
      order.totalXaf ?? order.subtotalXaf,
    ].map((value) => safeCsvCell(value)),
  );
  const csv = `﻿${[header, ...rows].map((row) => row.join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-commandes.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
