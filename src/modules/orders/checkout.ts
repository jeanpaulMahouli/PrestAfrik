import "server-only";

import { createHmac, randomBytes } from "node:crypto";
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
import { prisma } from "@/lib/prisma";
import { customerNameIsMateriallyDifferent } from "@/modules/customers/validation";
import { isStoreSubscriptionPaused, lockSubscriptionForUpdate } from "@/modules/subscriptions/service";
import type { CartLine } from "@/components/storefront/store-cart-provider";

export type { CartLine } from "@/components/storefront/store-cart-provider";

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

function signingSecret() {
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "prestafrik-local-development-only-secret-0001");
  if (!secret || secret.length < 32) {
    throw new Error("Configure une clé serveur d’au moins 32 caractères pour les commandes.");
  }
  return secret;
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
    throw new CheckoutProblem("Votre panier ne contient aucun produit à commander.");
  }

  const consolidated = new Map<string, CartLine>();
  for (const item of requestedItems) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 25) {
      throw new CheckoutProblem("Vérifiez les quantités de votre panier.");
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
    throw new CheckoutProblem("Un produit de votre panier n’est plus disponible. Mettez votre panier à jour.");
  }

  const lines: CurrentLine[] = [];
  for (const item of consolidated.values()) {
    const product = byId.get(item.productId);
    if (!product) throw new CheckoutProblem("Un produit de votre panier n’est plus disponible.");
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

/**
 * Livraison choisie par le client : une zone active à frais fixes, ou le retrait (ADR-013).
 * Les frais sont connus avant la commande ; aucune négociation.
 */
export async function resolveDelivery({
  storeId,
  deliveryMethod,
  zoneId,
}: {
  storeId: string;
  deliveryMethod: DeliveryMethod;
  zoneId: string | null;
}) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { city: true, pickupEnabled: true } });
  if (deliveryMethod === "PICKUP") {
    if (!store.pickupEnabled) throw new CheckoutProblem("Le retrait en boutique n’est pas proposé. Choisissez une zone de livraison.");
    return { zoneId: null, city: store.city ?? "Retrait", neighborhood: null, feeXaf: 0 };
  }
  const zone = zoneId
    ? await prisma.deliveryZone.findFirst({ where: { id: zoneId, storeId, isActive: true, feeXaf: { not: null } }, select: { id: true, name: true, city: true, feeXaf: true } })
    : null;
  if (!zone || zone.feeXaf === null) throw new CheckoutProblem("Choisissez votre zone de livraison dans la liste.");
  return { zoneId: zone.id, city: zone.city, neighborhood: zone.name, feeXaf: zone.feeXaf };
}

export async function checkoutOrder({
  storeSlug,
  customer,
  deliveryMethod,
  zoneId,
  landmark,
  comment,
  items,
  idempotencyKey,
  expectedTotalXaf,
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
  zoneId: string | null;
  landmark: string | null;
  comment: string | null;
  items: CartLine[];
  idempotencyKey: string;
  /** Total affiché au client : la commande est refusée si le prix a changé entre-temps. */
  expectedTotalXaf: number;
  clientIp: string;
}) {
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, isPublished: true, suspendedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!store) throw new CheckoutProblem("Cette boutique n’est pas disponible.");

  const previousOrder = await prisma.order.findUnique({
    where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
    select: { reference: true, trackingToken: true },
  });
  // Double envoi (même clé) : la commande existante est renvoyée, sans nouvelle notification.
  if (previousOrder) return { ...previousOrder, storeId: store.id, created: false };
  const subscription = await prisma.subscription.findUnique({
    where: { storeId: store.id },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  });
  if (isStoreSubscriptionPaused(subscription)) {
    throw new CheckoutProblem("Cette boutique est temporairement indisponible.");
  }

  const lines = await getCurrentCheckoutLines(store.id, items);
  const delivery = await resolveDelivery({ storeId: store.id, deliveryMethod, zoneId });
  const subtotalXaf = lines.reduce((total, line) => total + line.lineTotalXaf, 0);
  const totalXaf = subtotalXaf + delivery.feeXaf;
  if (!Number.isSafeInteger(totalXaf)) throw new CheckoutProblem("Le montant de la commande est trop élevé.");
  if (totalXaf !== expectedTotalXaf) {
    throw new CheckoutProblem("Le prix a changé depuis l’affichage. Vérifiez le nouveau total avant de commander.");
  }
  const city = delivery.city;
  const neighborhood = delivery.neighborhood ?? "";

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
        throw new CheckoutProblem("Vous avez déjà envoyé plusieurs commandes. Réessayez dans quelques minutes.");
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
          deliveryZoneId: delivery.zoneId,
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
          deliveryFeeXaf: delivery.feeXaf,
          subtotalXaf,
          totalXaf,
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
        if (!orderItem) throw new CheckoutProblem("Impossible de réserver un produit de votre commande.");

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
          throw new CheckoutProblem(`Le stock de « ${line.productName} » vient de changer. Mettez votre panier à jour.`);
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

      return { reference: order.reference, trackingToken: order.trackingToken, storeId: store.id, created: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedOrder = await prisma.order.findUnique({
        where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } },
        select: { reference: true, trackingToken: true },
      });
      if (racedOrder) return { ...racedOrder, storeId: store.id, created: false };
    }
    throw error;
  }
}
