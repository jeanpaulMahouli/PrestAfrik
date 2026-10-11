import { NextResponse } from "next/server";
import { safeCsvCell } from "@/modules/catalog/validation";
import {
  customerSegments,
  listStoreCustomers,
  type CustomerSegment,
} from "@/modules/customers/queries";
import { requireStorePermission } from "@/modules/stores/context";

export async function GET(request: Request) {
  const { store } = await requireStorePermission("customers.read");
  const params = new URL(request.url).searchParams;
  const requestedSegment = params.get("segment");
  const segment = customerSegments.includes(requestedSegment as CustomerSegment)
    ? (requestedSegment as CustomerSegment)
    : "all";
  const requestedConsent = params.get("consent");
  const result = await listStoreCustomers(store.id, {
    query: params.get("q")?.trim().slice(0, 100) || undefined,
    segment,
    tag: params.get("tag")?.trim().slice(0, 40) || undefined,
    categoryId: params.get("categoryId") || undefined,
    city: params.get("city")?.trim().slice(0, 100) || undefined,
    marketingConsent:
      requestedConsent === "accepted" || requestedConsent === "not-accepted"
        ? requestedConsent
        : undefined,
    take: 10_000,
  });
  const rows = [
    [
      "name",
      "whatsapp",
      "email",
      "orderCount",
      "nonCancelledOrderCount",
      "orderedXaf",
      "receivedXaf",
      "marketingConsent",
      "followUpConsent",
      "tags",
    ],
    ...result.customers.map((customer) => [
      safeCsvCell(customer.name),
      safeCsvCell(customer.whatsapp),
      safeCsvCell(customer.email),
      safeCsvCell(customer.orderCount),
      safeCsvCell(customer.nonCancelledOrderCount),
      safeCsvCell(customer.orderedXaf),
      safeCsvCell(customer.receivedXaf),
      safeCsvCell(customer.marketingConsent ? "true" : "false"),
      safeCsvCell(customer.followUpConsent ? "true" : "false"),
      safeCsvCell(customer.tags.join("; ")),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${store.slug}-clients.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Truncated": result.totalCount > result.customers.length ? "true" : "false",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
