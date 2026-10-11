"use server";

import {
  DeliveryStatus,
  OrderProcessingStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/modules/stores/context";
import {
  deliveryStatusTransition,
} from "@/modules/orders/delivery-status";

const courierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
});

const deliveryZoneSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  fee: z.string().trim().regex(/^\d*$/),
  estimatedDelay: z.string().trim().max(100),
  requiresConfirmation: z.enum(["on"]).optional(),
});

const assignSchema = z.object({
  orderId: z.cuid(),
  courierId: z.cuid(),
});

const deliveryUpdateSchema = z.object({
  orderId: z.cuid(),
  intent: z.enum(["start", "delivered", "failed", "reschedule", "returned"]),
  failureReason: z.string().trim().max(500),
});

class DeliveryProblem extends Error {}

function normalizeCameroonPhone(phone: string) {
  const compact = phone.replace(/[\s().-]/g, "");
  if (/^6\d{8}$/.test(compact)) return `+237${compact}`;
  if (/^\+2376\d{8}$/.test(compact)) return compact;
  return null;
}

export async function createCourier(formData: FormData) {
  const parsed = courierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) redirect("/dashboard/livraisons?erreur=livreur-invalide");

  const phone = normalizeCameroonPhone(parsed.data.phone);
  if (!phone) redirect("/dashboard/livraisons?erreur=telephone-invalide");
  const { store } = await requireStorePermission("delivery.manage");

  try {
    await prisma.courier.create({
      data: { storeId: store.id, name: parsed.data.name, phone },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/dashboard/livraisons?erreur=livreur-existant");
    }
    throw error;
  }

  revalidatePath("/dashboard/livraisons");
  redirect("/dashboard/livraisons?succes=livreur");
}

export async function createDeliveryZone(formData: FormData) {
  const parsed = deliveryZoneSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city"),
    fee: formData.get("fee"),
    estimatedDelay: formData.get("estimatedDelay"),
    requiresConfirmation: formData.get("requiresConfirmation") ?? undefined,
  });
  if (!parsed.success) redirect("/dashboard/livraisons?erreur=zone-invalide");

  const { store } = await requireStorePermission("store.manage");
  const requiresConfirmation = parsed.data.requiresConfirmation === "on";
  if (!requiresConfirmation && parsed.data.fee === "") {
    redirect("/dashboard/livraisons?erreur=zone-invalide");
  }
  const feeXaf = requiresConfirmation ? null : Number(parsed.data.fee);
  if (
    !requiresConfirmation &&
    (feeXaf === null || !Number.isSafeInteger(feeXaf) || feeXaf < 0)
  ) {
    redirect("/dashboard/livraisons?erreur=zone-invalide");
  }

  try {
    await prisma.deliveryZone.create({
      data: {
        storeId: store.id,
        name: parsed.data.name,
        city: parsed.data.city,
        feeXaf,
        requiresConfirmation,
        estimatedDelay: parsed.data.estimatedDelay || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/dashboard/livraisons?erreur=zone-existante");
    }
    throw error;
  }

  revalidatePath("/dashboard/livraisons");
  revalidatePath(`/boutique/${store.slug}`);
  redirect("/dashboard/livraisons?succes=zone");
}

export async function assignCourier(formData: FormData) {
  const parsed = assignSchema.safeParse({
    orderId: formData.get("orderId"),
    courierId: formData.get("courierId"),
  });
  if (!parsed.success) redirect("/dashboard/livraisons?erreur=affectation-invalide");

  const { session, store } = await requireStorePermission("delivery.manage");
  try {
    await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: parsed.data.orderId, storeId: store.id },
        select: {
          id: true,
          deliveryStatus: true,
          deliveryMethod: true,
          processingStatus: true,
        },
      });
      if (
        !order ||
        order.processingStatus !== OrderProcessingStatus.COMPLETED ||
        order.deliveryMethod === "PICKUP" ||
        order.deliveryStatus !== DeliveryStatus.TO_ORGANIZE
      ) {
        throw new DeliveryProblem("Cette commande ne peut pas être affectée.");
      }

      const courier = await transaction.courier.findFirst({
        where: {
          id: parsed.data.courierId,
          storeId: store.id,
          isActive: true,
        },
        select: { id: true, name: true },
      });
      if (!courier) throw new DeliveryProblem("Livreur indisponible.");

      const updated = await transaction.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          deliveryStatus: DeliveryStatus.TO_ORGANIZE,
          processingStatus: OrderProcessingStatus.COMPLETED,
        },
        data: { deliveryStatus: DeliveryStatus.IN_TRANSIT },
      });
      if (updated.count !== 1) throw new DeliveryProblem("La livraison a changé.");

      await transaction.delivery.upsert({
        where: { orderId: order.id },
        create: {
          storeId: store.id,
          orderId: order.id,
          courierId: courier.id,
          status: DeliveryStatus.IN_TRANSIT,
          assignedAt: new Date(),
          pickedUpAt: new Date(),
        },
        update: {
          courierId: courier.id,
          status: DeliveryStatus.IN_TRANSIT,
          failureReason: null,
          assignedAt: new Date(),
          pickedUpAt: new Date(),
        },
      });

      await transaction.orderEvent.create({
        data: {
          orderId: order.id,
          type: "DELIVERY_ASSIGNED",
          fromValue: DeliveryStatus.TO_ORGANIZE,
          toValue: DeliveryStatus.IN_TRANSIT,
          note: `Livreur ${courier.name} affecté.`,
          actorId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof DeliveryProblem) {
      redirect(`/dashboard/livraisons?erreur=affectation-echouee`);
    }
    throw error;
  }

  refreshDeliveryViews(parsed.data.orderId);
  redirect("/dashboard/livraisons?succes=affectation");
}

export async function updateDeliveryStatus(formData: FormData) {
  const parsed = deliveryUpdateSchema.safeParse({
    orderId: formData.get("orderId"),
    intent: formData.get("intent"),
    failureReason: formData.get("failureReason") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/livraisons?erreur=action-invalide");
  if (parsed.data.intent === "failed" && parsed.data.failureReason.length < 3) {
    redirect("/dashboard/livraisons?erreur=motif-requis");
  }

  const { session, store } = await requireStorePermission("delivery.manage");
  try {
    await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: {
          id: parsed.data.orderId,
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
        },
        select: { id: true, deliveryStatus: true },
      });
      if (!order) throw new DeliveryProblem("Commande introuvable ou non préparée.");

      const next = deliveryStatusTransition(
        order.deliveryStatus,
        parsed.data.intent,
      );
      if (!next) throw new DeliveryProblem("Transition de livraison impossible.");

      const updated = await transaction.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          deliveryStatus: order.deliveryStatus,
          processingStatus: OrderProcessingStatus.COMPLETED,
        },
        data: { deliveryStatus: next },
      });
      if (updated.count !== 1) throw new DeliveryProblem("La livraison a changé.");

      const now = new Date();
      await transaction.delivery.upsert({
        where: { orderId: order.id },
        create: {
          storeId: store.id,
          orderId: order.id,
          status: next,
          ...(next === DeliveryStatus.FAILED
            ? { failureReason: parsed.data.failureReason }
            : {}),
          ...(next === DeliveryStatus.DELIVERED ? { deliveredAt: now } : {}),
          ...(next === DeliveryStatus.RETURNED ? { returnedAt: now } : {}),
        },
        update: {
          status: next,
          failureReason:
            next === DeliveryStatus.FAILED ? parsed.data.failureReason : null,
          ...(next === DeliveryStatus.DELIVERED ? { deliveredAt: now } : {}),
          ...(next === DeliveryStatus.RETURNED ? { returnedAt: now } : {}),
        },
      });

      await transaction.orderEvent.create({
        data: {
          orderId: order.id,
          type: `DELIVERY_${parsed.data.intent.toUpperCase()}`,
          fromValue: order.deliveryStatus,
          toValue: next,
          note: parsed.data.failureReason || null,
          actorId: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof DeliveryProblem) {
      redirect("/dashboard/livraisons?erreur=transition-echouee");
    }
    throw error;
  }

  refreshDeliveryViews(parsed.data.orderId);
  redirect(
    parsed.data.intent === "delivered"
      ? `/dashboard/livraisons?succes=livree&commande=${parsed.data.orderId}`
      : "/dashboard/livraisons?succes=statut",
  );
}

function refreshDeliveryViews(orderId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/livraisons");
  revalidatePath("/dashboard/commandes");
  revalidatePath(`/dashboard/commandes/${orderId}`);
  revalidatePath("/dashboard/argent");
}
