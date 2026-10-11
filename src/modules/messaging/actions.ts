"use server";

import { revalidatePath } from "next/cache";
import { requireStorePermission } from "@/modules/stores/context";
import { processPendingOutboxEvents } from "@/modules/messaging/outbox";
import { redirect } from "next/navigation";
import { SubscriptionLimitError } from "@/modules/subscriptions/service";

export async function simulatePendingMessagesAction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("La simulation WhatsApp locale est désactivée en production.");
  }

  const { store } = await requireStorePermission("orders.read");
  try {
    await processPendingOutboxEvents(store.id, store.name);
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      redirect(`/dashboard/messages?erreur=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/dashboard/messages");
}
