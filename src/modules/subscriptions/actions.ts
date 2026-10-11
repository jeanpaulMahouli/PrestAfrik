"use server";

import { randomUUID } from "node:crypto";
import { SubscriptionPaymentStatus, SubscriptionPeriod, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { addCalendarPeriod } from "@/modules/subscriptions/dates";
import { requireStorePermission } from "@/modules/stores/context";

const planSelectionSchema = z.object({
  planId: z.string().cuid(),
  period: z.nativeEnum(SubscriptionPeriod),
});

export async function simulateSubscriptionPayment(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard/abonnement?erreur=paiement-indisponible");
  }
  const parsed = planSelectionSchema.safeParse({
    planId: formData.get("planId"),
    period: formData.get("period"),
  });
  if (!parsed.success) redirect("/dashboard/abonnement?erreur=offre-invalide");

  const { store } = await requireStorePermission("subscription.manage");
  const plan = await prisma.plan.findFirst({
    where: { id: parsed.data.planId, active: true },
    select: { id: true, sortOrder: true, monthlyPriceXaf: true, yearlyPriceXaf: true },
  });
  if (!plan) redirect("/dashboard/abonnement?erreur=offre-indisponible");
  const current = await prisma.subscription.findUnique({
    where: { storeId: store.id },
    include: { plan: { select: { sortOrder: true } } },
  });
  if (!current) throw new Error("Aucun abonnement n’est configuré pour cette boutique.");

  const now = new Date();
  const currentPeriodIsPaid =
    (current.status === SubscriptionStatus.ACTIVE ||
      current.status === SubscriptionStatus.CANCELED) &&
    current.currentPeriodEnd !== null &&
    current.currentPeriodEnd > now;
  if (currentPeriodIsPaid && plan.sortOrder < current.plan.sortOrder) {
    await prisma.subscription.update({
      where: { id: current.id },
      data: {
        scheduledPlanId: plan.id,
        scheduledAt: current.currentPeriodEnd,
        status: SubscriptionStatus.ACTIVE,
        canceledAt: null,
      },
    });
    revalidatePath("/dashboard/abonnement");
    redirect("/dashboard/abonnement?succes=downgrade");
  }

  const amountXaf =
    parsed.data.period === SubscriptionPeriod.MONTHLY
      ? plan.monthlyPriceXaf
      : plan.yearlyPriceXaf;
  const currentPeriodEnd = addCalendarPeriod(now, parsed.data.period);
  await prisma.$transaction(async (transaction) => {
    await transaction.subscriptionPayment.create({
      data: {
        subscriptionId: current.id,
        provider: "LOCAL_DEMO",
        providerRef: `DEMO-${randomUUID()}`,
        eventId: `demo-${randomUUID()}`,
        amountXaf,
        period: parsed.data.period,
        status: SubscriptionPaymentStatus.SUCCEEDED,
        paidAt: now,
      },
    });
    await transaction.subscription.update({
      where: { id: current.id },
      data: {
        planId: plan.id,
        scheduledPlanId: null,
        scheduledAt: null,
        status: SubscriptionStatus.ACTIVE,
        billingPeriod: parsed.data.period,
        currentPeriodStart: now,
        currentPeriodEnd,
        canceledAt: null,
      },
    });
  });

  invalidateStorefrontCache(store.id, store.slug);
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/dashboard");
  redirect("/dashboard/abonnement?succes=activation");
}
