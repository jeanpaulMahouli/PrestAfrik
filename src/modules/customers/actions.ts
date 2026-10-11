"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeCustomerWhatsapp, parseCustomerTags } from "@/modules/customers/validation";
import { requireStorePermission } from "@/modules/stores/context";

function clientPath(customerId: string) {
  return `/dashboard/clients/${encodeURIComponent(customerId)}`;
}

function reportError(path: string, error: string): never {
  redirect(`${path}?erreur=${encodeURIComponent(error)}`);
}

async function ensureCustomerInStore(customerId: string, storeId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
    select: { id: true },
  });
  if (!customer) reportError("/dashboard/clients", "Client introuvable.");
}

export async function createCustomer(formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      whatsapp: z.string().trim().min(9).max(30),
      email: z.union([z.literal(""), z.string().trim().email().max(254)]),
      city: z.string().trim().max(100),
      neighborhood: z.string().trim().max(120),
      landmark: z.string().trim().max(250),
      tags: z.string().max(500),
      note: z.string().trim().max(1000),
    })
    .safeParse({
      name: formData.get("name"),
      whatsapp: formData.get("whatsapp"),
      email: formData.get("email") ?? "",
      city: formData.get("city") ?? "",
      neighborhood: formData.get("neighborhood") ?? "",
      landmark: formData.get("landmark") ?? "",
      tags: formData.get("tags") ?? "",
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) {
    reportError(
      "/dashboard/clients/nouveau",
      parsed.error.issues[0]?.message ?? "Vérifie les informations du client.",
    );
  }

  let whatsapp: string;
  let tags: string[];
  try {
    whatsapp = normalizeCustomerWhatsapp(parsed.data.whatsapp);
    tags = parseCustomerTags(parsed.data.tags);
  } catch (error) {
    if (error instanceof Error) reportError("/dashboard/clients/nouveau", error.message);
    throw error;
  }
  if (!parsed.data.city && (parsed.data.neighborhood || parsed.data.landmark)) {
    reportError("/dashboard/clients/nouveau", "Indique la ville pour enregistrer l’adresse.");
  }

  const { session, store } = await requireStorePermission("customers.manage");
  const existing = await prisma.customer.findUnique({
    where: { storeId_whatsapp: { storeId: store.id, whatsapp } },
    select: { id: true },
  });
  if (existing) {
    reportError(
      clientPath(existing.id),
      "Ce numéro existe déjà dans ta boutique. Sa fiche a été ouverte pour éviter un doublon.",
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        name: parsed.data.name,
        whatsapp,
        email: parsed.data.email || null,
        source: "manual",
        ...(parsed.data.city
          ? {
              addresses: {
                create: {
                  city: parsed.data.city,
                  neighborhood: parsed.data.neighborhood || null,
                  landmark: parsed.data.landmark || null,
                },
              },
            }
          : {}),
        ...(tags.length ? { tags: { create: tags.map((name) => ({ name })) } } : {}),
        ...(parsed.data.note
          ? {
              notes: {
                create: {
                  storeId: store.id,
                  authorId: session.user.id,
                  content: parsed.data.note,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });
    revalidatePath("/dashboard/clients");
    redirect(clientPath(customer.id));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reportError(
        "/dashboard/clients/nouveau",
        "Ce numéro WhatsApp est déjà enregistré dans ta boutique.",
      );
    }
    throw error;
  }
}

export async function addCustomerTag(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid(), tag: z.string().trim().min(2).max(40) })
    .safeParse({ customerId: formData.get("customerId"), tag: formData.get("tag") });
  if (!parsed.success) reportError("/dashboard/clients", "Indique un tag de 2 à 40 caractères.");

  const { store } = await requireStorePermission("customers.manage");
  await ensureCustomerInStore(parsed.data.customerId, store.id);
  const tagName = parsed.data.tag.replace(/\s+/g, " ");
  const existingTag = await prisma.customerTag.findFirst({
    where: {
      customerId: parsed.data.customerId,
      name: { equals: tagName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existingTag) reportError(clientPath(parsed.data.customerId), "Ce tag existe déjà sur cette fiche.");
  try {
    await prisma.customerTag.create({
      data: { customerId: parsed.data.customerId, name: tagName },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reportError(clientPath(parsed.data.customerId), "Ce tag existe déjà sur cette fiche.");
    }
    throw error;
  }
  revalidatePath("/dashboard/clients");
  revalidatePath(clientPath(parsed.data.customerId));
}

export async function removeCustomerTag(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid(), tagId: z.cuid() })
    .safeParse({ customerId: formData.get("customerId"), tagId: formData.get("tagId") });
  if (!parsed.success) reportError("/dashboard/clients", "Tag invalide.");

  const { store } = await requireStorePermission("customers.manage");
  const removed = await prisma.customerTag.deleteMany({
    where: {
      id: parsed.data.tagId,
      customerId: parsed.data.customerId,
      customer: { storeId: store.id },
    },
  });
  if (removed.count !== 1) reportError(clientPath(parsed.data.customerId), "Tag introuvable.");
  revalidatePath("/dashboard/clients");
  revalidatePath(clientPath(parsed.data.customerId));
}

export async function addCustomerNote(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid(), content: z.string().trim().min(2).max(1000) })
    .safeParse({ customerId: formData.get("customerId"), content: formData.get("content") });
  if (!parsed.success) reportError("/dashboard/clients", "La note doit contenir entre 2 et 1 000 caractères.");

  const { session, store } = await requireStorePermission("customers.manage");
  await ensureCustomerInStore(parsed.data.customerId, store.id);
  await prisma.customerNote.create({
    data: {
      storeId: store.id,
      customerId: parsed.data.customerId,
      authorId: session.user.id,
      content: parsed.data.content,
    },
  });
  revalidatePath(clientPath(parsed.data.customerId));
}

export async function scheduleCustomerReminder(formData: FormData) {
  const parsed = z
    .object({
      customerId: z.cuid(),
      remindAt: z.iso.date(),
      reason: z.string().trim().min(2).max(250),
    })
    .safeParse({
      customerId: formData.get("customerId"),
      remindAt: formData.get("remindAt"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) reportError("/dashboard/clients", "Indique une date et un motif de rappel.");

  const { session, store } = await requireStorePermission("customers.manage");
  await ensureCustomerInStore(parsed.data.customerId, store.id);
  await prisma.customerReminder.create({
    data: {
      storeId: store.id,
      customerId: parsed.data.customerId,
      authorId: session.user.id,
      remindAt: new Date(`${parsed.data.remindAt}T09:00:00.000+01:00`),
      reason: parsed.data.reason,
    },
  });
  revalidatePath(clientPath(parsed.data.customerId));
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
}

export async function completeCustomerReminder(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid(), reminderId: z.cuid() })
    .safeParse({
      customerId: formData.get("customerId"),
      reminderId: formData.get("reminderId"),
    });
  if (!parsed.success) reportError("/dashboard/clients", "Rappel invalide.");

  const { store } = await requireStorePermission("customers.manage");
  const updated = await prisma.customerReminder.updateMany({
    where: {
      id: parsed.data.reminderId,
      customerId: parsed.data.customerId,
      storeId: store.id,
      completedAt: null,
    },
    data: { completedAt: new Date() },
  });
  if (updated.count !== 1) reportError(clientPath(parsed.data.customerId), "Ce rappel est déjà terminé.");
  revalidatePath(clientPath(parsed.data.customerId));
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
}

export async function revokeCustomerMarketingConsent(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid() })
    .safeParse({ customerId: formData.get("customerId") });
  if (!parsed.success) reportError("/dashboard/clients", "Fiche client invalide.");

  const { store } = await requireStorePermission("customers.manage");
  await ensureCustomerInStore(parsed.data.customerId, store.id);
  const latest = await prisma.customerConsent.findFirst({
    where: {
      storeId: store.id,
      customerId: parsed.data.customerId,
      type: "MARKETING",
    },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { granted: true, revokedAt: true },
  });
  if (!latest?.granted || latest.revokedAt) {
    reportError(clientPath(parsed.data.customerId), "Ce client n’a pas de consentement marketing actif.");
  }
  await prisma.customerConsent.create({
    data: {
      storeId: store.id,
      customerId: parsed.data.customerId,
      type: "MARKETING",
      granted: false,
      source: "seller-revocation",
    },
  });
  revalidatePath(clientPath(parsed.data.customerId));
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/marketing");
}

export async function resolveCustomerNameConflict(formData: FormData) {
  const parsed = z
    .object({ customerId: z.cuid(), orderId: z.cuid() })
    .safeParse({
      customerId: formData.get("customerId"),
      orderId: formData.get("orderId"),
    });
  if (!parsed.success) reportError("/dashboard/clients", "Commande de résolution invalide.");

  const { store } = await requireStorePermission("customers.manage");
  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      customerId: parsed.data.customerId,
      storeId: store.id,
    },
    select: { customerName: true },
  });
  if (!order) reportError(clientPath(parsed.data.customerId), "Commande introuvable.");
  await prisma.customer.updateMany({
    where: { id: parsed.data.customerId, storeId: store.id },
    data: { name: order.customerName, nameConflict: false },
  });
  revalidatePath(clientPath(parsed.data.customerId));
  revalidatePath("/dashboard/clients");
}
