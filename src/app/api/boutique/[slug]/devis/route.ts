import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutProblem, getCurrentCheckoutLines, resolveDeliveryQuote } from "@/modules/orders/checkout";
import { getPublishedStore } from "@/modules/catalog/service";

const quoteRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.cuid(),
        variantId: z.cuid().nullable(),
        quantity: z.number().int().min(1).max(25),
      }),
    )
    .min(1)
    .max(30),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  city: z.string().trim().min(2).max(100),
  neighborhood: z.string().trim().min(1).max(120),
});

export async function POST(request: Request, { params }: RouteContext<"/api/boutique/[slug]/devis">) {
  const { slug } = await params;
  const store = await getPublishedStore(slug);
  if (!store) return NextResponse.json({ error: "Cette boutique n’est pas disponible." }, { status: 404 });
  if (store.subscriptionPaused) {
    return NextResponse.json(
      { error: "Cette boutique est temporairement indisponible." },
      { status: 409 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const body = quoteRequestSchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: "Indique ta ville et les produits de ton panier." }, { status: 400 });
  }

  try {
    const lines = await getCurrentCheckoutLines(store.id, body.data.items);
    const quote = await resolveDeliveryQuote({
      store,
      lines,
      deliveryMethod: body.data.deliveryMethod,
      city: body.data.city,
      neighborhood: body.data.neighborhood,
    });
    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof CheckoutProblem) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
