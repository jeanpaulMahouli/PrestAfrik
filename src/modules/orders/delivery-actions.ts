"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { requireStorePermission } from "@/modules/stores/context";

// Zones de livraison : chaque zone a des frais fixes, connus du client avant sa commande
// (ADR-013). Plus de frais « à confirmer » ni de négociation.

const zoneSchema = z.object({
  name: z.string().trim().min(2, "Donnez un nom à la zone (ex. Akwa).").max(120),
  city: z.string().trim().min(2, "Indiquez la ville.").max(100),
  fee: z.string().regex(/^\d{1,7}$/, "Indiquez les frais en FCFA (0 si la livraison est gratuite)."),
  estimatedDelay: z.string().trim().max(100),
});

const page = "/dashboard/livraisons";
const fail = (message: string): never => redirect(`${page}?erreur=${encodeURIComponent(message)}`);

function read(formData: FormData) {
  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city"),
    fee: String(formData.get("fee") ?? "").replace(/[\s\u00a0\u202f]/g, ""),
    estimatedDelay: formData.get("estimatedDelay") ?? "",
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Vérifiez la zone.");
  return parsed.data!;
}

function done(store: { id: string; slug: string }, success: string): never {
  revalidatePath(page);
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`${page}?succes=${success}`);
}

const duplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function createDeliveryZone(formData: FormData) {
  const input = read(formData);
  const { store } = await requireStorePermission("delivery.manage");
  try {
    await prisma.deliveryZone.create({
      data: { storeId: store.id, name: input.name, city: input.city, feeXaf: Number(input.fee), requiresConfirmation: false, estimatedDelay: input.estimatedDelay || null },
    });
  } catch (error) {
    if (duplicate(error)) fail("Une zone porte déjà ce nom dans cette ville.");
    throw error;
  }
  done(store, "zone");
}

/** Modification d'une zone : les commandes déjà passées gardent leurs frais. */
export async function updateDeliveryZone(formData: FormData) {
  const zoneId = z.cuid().safeParse(formData.get("zoneId"));
  if (!zoneId.success) redirect(page);
  const input = read(formData);
  const { store } = await requireStorePermission("delivery.manage");
  try {
    const updated = await prisma.deliveryZone.updateMany({
      where: { id: zoneId.data, storeId: store.id },
      data: {
        name: input.name,
        city: input.city,
        feeXaf: Number(input.fee),
        requiresConfirmation: false,
        estimatedDelay: input.estimatedDelay || null,
        isActive: formData.get("isActive") === "on",
      },
    });
    if (updated.count !== 1) fail("Cette zone est introuvable.");
  } catch (error) {
    if (duplicate(error)) fail("Une zone porte déjà ce nom dans cette ville.");
    throw error;
  }
  done(store, "zone-modifiee");
}
