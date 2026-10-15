import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ConsentType,
  DeliveryStatus,
  OrderConfirmationStatus,
  OrderProcessingStatus,
  PaymentStatus,
  Prisma,
  ProductAvailability,
  type Product,
  type ProductVariant,
} from "@prisma/client";
import type { Store } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { customerNameIsMateriallyDifferent } from "@/modules/customers/validation";
import { isStoreSubscriptionPaused, lockSubscriptionForUpdate } from "@/modules/subscriptions/service";
import type { CartLine } from "@/components/storefront/store-cart-provider";

export type { CartLine } from "@/components/storefront/store-cart-provider";

const quoteLifetimeMs = 5 * 60 * 1000;

export type DeliveryMethod = "DELIVERY" | "PICKUP";

export class CheckoutProblem extends Error {}

export type CurrentLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPriceXaf: number;
  lineTotalXaf: number;
  trackInventory: boolean;
  stockQuantity: number | null;
  reservedQuantity: number;
  variantTracksInventory: boolean;
};

type QuotePayload = {
  storeId: string;
  deliveryMethod: DeliveryMethod;
  city: string;
  neighborhood: string;
  subtotalXaf: number;
  deliveryFeeXaf: number | null;
  deliveryZoneId: string | null;
  expiresAt: number;
};

function signingSecret() {
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "prestafrik-local-development-only-secret-0001");
  if (!secret || secret.length < 32) {
    throw new Error("Configure une clé serveur d’au moins 32 caractères pour les devis de commande.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest();
}

function makeQuoteToken(payload: QuotePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded).toString("base64url")}`;
}

function verifyQuoteToken(token: string, expected: Omit<QuotePayload, "expiresAt">) {
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length) return false;

  const received = Buffer.from(signature, "base64url");
  const expectedSignature = sign(encoded);
  if (
    received.length !== expectedSignature.length ||
    !timingSafeEqual(received, expectedSignature)
  ) {
    return false;
  }

  let payload: QuotePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as QuotePayload;
  } catch {
    return false;
  }

  return (
    payload.storeId === expected.storeId &&
    payload.deliveryMethod === expected.deliveryMethod &&
    payload.city === expected.city &&
    payload.neighborhood === expected.neighborhood &&
    payload.subtotalXaf === expected.subtotalXaf &&
    payload.deliveryFeeXaf === expected.deliveryFeeXaf &&
    payload.deliveryZoneId === expected.deliveryZoneId &&
    Number.isSafeInteger(payload.expiresAt) &&
    payload.expiresAt >= Date.now()
  );
}

function linePrice(product: Product, variant: ProductVariant | undefined) {
  if (variant?.priceXaf !== null && variant?.priceXaf !== undefined) return variant.priceXaf;
  return product.promotionalPriceXaf ?? product.priceXaf;
}

export async function getCurrentCheckoutLines(
  storeId: string,
  requestedItems: CartLine[],
): Promise<CurrentLine[]> {
  if (requestedItems.length === 0 || requestedItems.length > 30) {
    throw new CheckoutProblem("Ton panier ne contient aucun produit à commander.");
  }

  const consolidated = new Map<string, CartLine>();
  for (const item of requestedItems) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 25) {
      throw new CheckoutProblem("Vérifie les quantités de ton panier.");
    }
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = consolidated.get(key);
    const quantity = (existing?.quantity ?? 0) + item.quantity;
    if (quantity > 25) throw new CheckoutProblem("La quantité maximale d’un même produit est 25.");
    consolidated.set(key, { ...item, quantity });
  }

  const products = await prisma.product.findMany({
    where: {
      storeId,
      status: "ACTIVE",
      availability: { not: ProductAvailability.SOLD_OUT },
      id: { in: Array.from(consolidated.values(), ({ productId }) => productId) },
    },
    include: { variants: { where: { isArchived: false } } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  if (byId.size !== new Set(Array.from(consolidated.values(), ({ productId }) => productId)).size) {
    throw new CheckoutProblem("Un produit de ton panier n’est plus disponible. Mets ton panier à jour.");
  }

  const lines: CurrentLine[] = [];
  for (const item of consolidated.values()) {
    const product = byId.get(item.productId);
    if (!product) throw new CheckoutProblem("Un produit de ton panier n’est plus disponible.");
    const variant = item.variantId
      ? product.variants.find(({ id }) => id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      throw new CheckoutProblem(`Une variante de « ${product.name} » n’est plus disponible.`);
    }
    if (
      product.trackInventory &&
      (!product.stockQuantity ||
        product.stockQuantity - product.reservedQuantity < item.quantity) &&
      (!variant || variant.stockQuantity === null)
    ) {
      throw new CheckoutProblem(`Il ne reste plus assez de stock pour « ${product.name} ».`);
    }
    if (
      variant?.stockQuantity !== null &&
      variant?.stockQuantity !== undefined &&
      variant.stockQuantity - variant.reservedQuantity < item.quantity
    ) {
      throw new CheckoutProblem(`Il ne reste plus assez de stock pour « ${product.name} » (${variant.optionValue}).`);
    }

    const unitPriceXaf = linePrice(product, variant);
    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantName: variant ? `${variant.optionName} : ${variant.optionValue}` : null,
      sku: variant?.sku ?? product.sku,
      quantity: item.quantity,
      unitPriceXaf,
      lineTotalXaf: unitPriceXaf * item.quantity,
      trackInventory: product.trackInventory,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      variantTracksInventory: variant?.stockQuantity !== null && variant?.stockQuantity !== undefined,
    });
  }

  return lines;
}

export async function resolveDeliveryQuote({
  store,
  lines,
  deliveryMethod,
  city,
  neighborhood,
}: {
  store: Pick<Store, "id">;
  lines: CurrentLine[];
  deliveryMethod: DeliveryMethod;
  city: string;
  neighborhood: string;
}) {
  const subtotalXaf = lines.reduce((total, { lineTotalXaf }) => total + lineTotalXaf, 0);
  if (!Number.isSafeInteger(subtotalXaf)) {
    throw new CheckoutProblem("Le montant de ta commande est trop élevé.");
  }

  if (deliveryMethod === "PICKUP") {
    const payload: QuotePayload = {
      storeId: store.id,
      deliveryMethod,
      city,
      neighborhood,
      subtotalXaf,
      deliveryFeeXaf: 0,
      deliveryZoneId: null,
      expiresAt: Date.now() + quoteLifetimeMs,
    };
    return {
      ...payload,
      totalXaf: subtotalXaf,
      quoteToken: makeQuoteToken(payload),
    };
  }

  const matchingZone = await prisma.deliveryZone.findFirst({
    where: {
      storeId: store.id,
      city: { equals: city, mode: "insensitive" },
      name: { equals: neighborhood, mode: "insensitive" },
      isActive: true,
      feeXaf: { not: null },
    },
  });
  const cityWideZone = matchingZone
    ? null
    : await prisma.deliveryZone.findFirst({
        where: {
          storeId: store.id,
          city: { equals: city, mode: "insensitive" },
          name: { in: ["Toute la ville", "*"] },
          isActive: true,
          feeXaf: { not: null },
        },
      });
  const deliveryZone = matchingZone ?? cityWideZone;
  // Frais fixes connus avant la commande (ADR-013) : sans zone, pas de livraison possible.
  if (!deliveryZone || deliveryZone.feeXaf === null) {
    throw new CheckoutProblem("La boutique ne livre pas encore ce quartier. Choisissez une zone de la liste ou le retrait en boutique.");
  }
  const deliveryFeeXaf = deliveryZone.feeXaf;
  const payload: QuotePayload = {
    storeId: store.id,
    deliveryMethod,
    city,
    neighborhood,
    subtotalXaf,
    deliveryFeeXaf,
    deliveryZoneId: deliveryZone.id,
    expiresAt: Date.now() + quoteLifetimeMs,
  };

  return {
    ...payload,
    totalXaf: subtotalXaf + deliveryFeeXaf,
    quoteToken: makeQuoteToken(payload),
  };
}

export async function checkoutOrder({
  storeSlug,
  customer,
  deliveryMethod,
  city,
  neighborhood,
  landmark,
  comment,
  items,
  idempotencyKey,
  quoteToken,
  clientIp,
}: {
  storeSlug: string;
  customer: {
    name: string;
    whatsapp: string;
    email: string | null;
    followUpConsent: true;
    marketingConsent: boolean;
  };
  deliveryMethod: DeliveryMethod;
  city: string;
  neighborhood: string;
  landmark: string | null;
  comment: string | null;
  items: CartLine[];
  idempotencyKey: string;
  quoteToken: string;
  clientIp: string;
}) {
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, isPublished: true },
    select: { id: true, slug: true, name: true },
  });
  if (!store) throw new CheckoutProblem("Cette boutique n’est pas disponible.");

  const previousOrder = await prisma.order.findUnique({
    where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
    select: { reference: true, trackingToken: true },
  });
  if (previousOrder) return previousOrder;
  const subscription = await prisma.subscription.findUnique({
    where: { storeId: store.id },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  });
  if (isStoreSubscriptionPaused(subscription)) {
    throw new CheckoutProblem("Cette boutique est temporairement indisponible.");
  }

  const lines = await getCurrentCheckoutLines(store.id, items);
  const quote = await resolveDeliveryQuote({
    store,
    lines,
    deliveryMethod,
    city,
    neighborhood,
  });
  const expectedQuote = {
    storeId: store.id,
    deliveryMethod,
    city,
    neighborhood,
    subtotalXaf: quote.subtotalXaf,
    deliveryFeeXaf: quote.deliveryFeeXaf,
    deliveryZoneId: quote.deliveryZoneId,
  };
  if (!verifyQuoteToken(quoteToken, expectedQuote)) {
    throw new CheckoutProblem("Le prix ou la livraison a changé. Vérifie ton panier avant de commander.");
  }

  const idempotencyHash = createHmac("sha256", signingSecret()).update(clientIp).digest("hex");
  const windowStart = new Date(Math.floor(Date.now() / 900_000) * 900_000);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const reference = `MB-${randomBytes(5).toString("hex").toUpperCase()}`;
  const trackingToken = randomBytes(32).toString("base64url");

  try {
    return await prisma.$transaction(async (transaction) => {
      await lockSubscriptionForUpdate(transaction, store.id);
      const currentSubscription = await transaction.subscription.findUnique({
        where: { storeId: store.id },
        select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
      });
      if (isStoreSubscriptionPaused(currentSubscription)) {
        throw new CheckoutProblem("Cette boutique est temporairement indisponible.");
      }
      const accepted = await transaction.$queryRaw<{ count: number }[]>`
        INSERT INTO "StoreRateLimitBucket" ("id", "storeId", "keyHash", "windowStart", "count")
        VALUES (${randomBytes(16).toString("hex")}, ${store.id}, ${idempotencyHash}, ${windowStart}, 1)
        ON CONFLICT ("storeId", "keyHash", "windowStart")
        DO UPDATE SET "count" = "StoreRateLimitBucket"."count" + 1
        WHERE "StoreRateLimitBucket"."count" < 5
        RETURNING "count"
      `;
      if (accepted.length === 0) {
        throw new CheckoutProblem("Tu as déjà envoyé plusieurs commandes. Réessaie dans quelques minutes.");
      }

          const existingCustomer = await transaction.customer.findUnique({
        where: { storeId_whatsapp: { storeId: store.id, whatsapp: customer.whatsapp } },
            select: { id: true, name: true, nameConflict: true },
          });
          const incomingNameConflict =
            existingCustomer !== null &&
            !existingCustomer.nameConflict &&
            customerNameIsMateriallyDifferent(existingCustomer.name, customer.name);
          const customerRecord = await transaction.customer.upsert({
            where: { storeId_whatsapp: { storeId: store.id, whatsapp: customer.whatsapp } },
            create: {
              storeId: store.id,
          name: customer.name,
              whatsapp: customer.whatsapp,
              email: customer.email,
              orderCount: 1,
              firstOrderAt: new Date(),
              lastOrderAt: new Date(),
              source: "storefront",
            },
            update: {
              ...(incomingNameConflict || existingCustomer?.nameConflict
                ? { nameConflict: true }
                : { name: customer.name }),
              email: customer.email,
              orderCount: { increment: 1 },
              lastOrderAt: new Date(),
        },
      });

      const previousAddress = await transaction.customerAddress.findFirst({
        where: {
          customerId: customerRecord.id,
          city: { equals: city, mode: "insensitive" },
          neighborhood: { equals: neighborhood || null, mode: "insensitive" },
        },
      });
      if (previousAddress) {
        await transaction.customerAddress.update({
          where: { id: previousAddress.id },
          data: { landmark, lastUsedAt: new Date() },
        });
      } else {
        await transaction.customerAddress.create({
          data: { customerId: customerRecord.id, city, neighborhood, landmark },
        });
      }

      const order = await transaction.order.create({
        data: {
          storeId: store.id,
          customerId: customerRecord.id,
          deliveryZoneId: quote.deliveryZoneId,
          reference,
          idempotencyKey,
          trackingToken,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          customerEmail: customer.email,
          deliveryCity: city,
          neighborhood: neighborhood || null,
          landmark,
          deliveryComment: comment,
          deliveryMethod,
          deliveryFeeXaf: quote.deliveryFeeXaf,
          subtotalXaf: quote.subtotalXaf,
          totalXaf: quote.totalXaf,
          // Pas de confirmation demandée au client : la commande arrive « Nouvelle » chez le vendeur.
          confirmationStatus: OrderConfirmationStatus.CONFIRMED,
          processingStatus: OrderProcessingStatus.TO_REVIEW,
          deliveryStatus: deliveryMethod === "PICKUP" ? DeliveryStatus.PICKUP : DeliveryStatus.TO_ORGANIZE,
          paymentStatus: PaymentStatus.PENDING,
          followUpConsent: customer.followUpConsent,
          marketingConsent: customer.marketingConsent,
          expiresAt,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productName: line.productName,
              variantName: line.variantName,
              sku: line.sku,
              quantity: line.quantity,
              unitPriceXaf: line.unitPriceXaf,
              lineTotalXaf: line.lineTotalXaf,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of lines) {
        if (!line.trackInventory && !(line.variantId && line.variantTracksInventory)) continue;
        const orderItem = order.items.find(
          (item) => item.productId === line.productId && item.variantId === line.variantId,
        );
        if (!orderItem) throw new CheckoutProblem("Impossible de réserver un produit de ta commande.");

        const reserved = line.variantId && line.variantTracksInventory
          ? await transaction.$executeRaw`
              UPDATE "ProductVariant"
              SET "reservedQuantity" = "reservedQuantity" + ${line.quantity}
              WHERE "id" = ${line.variantId}
                AND "productId" = ${line.productId}
                AND "isArchived" = false
                AND "stockQuantity" >= "reservedQuantity" + ${line.quantity}
            `
          : await transaction.$executeRaw`
              UPDATE "Product"
              SET "reservedQuantity" = "reservedQuantity" + ${line.quantity}
              WHERE "id" = ${line.productId}
                AND "storeId" = ${store.id}
                AND "status" = 'ACTIVE'
                AND "availability" != 'SOLD_OUT'
                AND "trackInventory" = true
                AND "stockQuantity" >= "reservedQuantity" + ${line.quantity}
            `;
        if (reserved !== 1) {
          throw new CheckoutProblem(`Le stock de « ${line.productName} » vient de changer. Mets ton panier à jour.`);
        }

        await transaction.stockReservation.create({
          data: {
            orderId: order.id,
            orderItemId: orderItem.id,
            productId: line.productId,
            variantId: line.variantTracksInventory ? line.variantId : null,
            quantity: line.quantity,
            expiresAt,
          },
        });
      }

      await transaction.customerConsent.createMany({
        data: [
          {
            storeId: store.id,
            customerId: customerRecord.id,
            type: ConsentType.ORDER_FOLLOW_UP,
            granted: true,
            source: "checkout",
          },
          ...(customer.marketingConsent
            ? [{
                storeId: store.id,
                customerId: customerRecord.id,
                type: ConsentType.MARKETING,
                granted: true,
                source: "checkout",
              }]
            : []),
        ],
      });

      await transaction.orderEvent.create({
        data: { orderId: order.id, type: "CREATED", toValue: "TO_REVIEW", note: "Commande reçue sur la boutique." },
      });

      return { reference: order.reference, trackingToken: order.trackingToken };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedOrder = await prisma.order.findUnique({
        where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
        select: { reference: true, trackingToken: true },
      });
      if (racedOrder) return racedOrder;
    }
    throw error;
  }
}

export async function checkQuote(
  quoteToken: string,
  expected: Omit<QuotePayload, "expiresAt">,
) {
  return verifyQuoteToken(quoteToken, expected);
}
