import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutProblem, getCurrentCheckoutLines } from "@/modules/orders/checkout";
import { getPublishedStore } from "@/modules/catalog/service";

const itemsSchema = z
  .array(
    z.object({
      productId: z.cuid(),
      variantId: z.cuid().nullable(),
      quantity: z.number().int().min(1).max(25),
    }),
  )
  .min(1)
  .max(30);

export async function POST(request: Request, { params }: RouteContext<"/api/boutique/[slug]/panier">) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  if (!store) return NextResponse.json({ error: "Cette boutique n’est pas disponible." }, { status: 404 });
  if (store.subscriptionPaused) {
    return NextResponse.json(
      { error: "Cette boutique est temporairement indisponible." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = itemsSchema.safeParse(
    body && typeof body === "object" && "items" in body
      ? (body as { items: unknown }).items
      : null,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Les produits du panier ne sont pas valides." }, { status: 400 });
  }

  try {
    const lines = await getCurrentCheckoutLines(store.id, parsed.data);
    return NextResponse.json({
      items: lines.map(({ productId, variantId, productName, variantName, sku, quantity, unitPriceXaf, lineTotalXaf }) => ({
        productId,
        variantId,
        productName,
        variantName,
        sku,
        quantity,
        unitPriceXaf,
        lineTotalXaf,
      })),
      subtotalXaf: lines.reduce((total, line) => total + line.lineTotalXaf, 0),
    });
  } catch (error) {
    if (error instanceof CheckoutProblem) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
