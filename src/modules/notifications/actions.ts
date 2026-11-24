"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStoreContext } from "@/modules/stores/context";
import { markNotificationsRead } from "@/modules/notifications/vendor";

// Centre de notifications du vendeur : préférences et « tout marquer comme lu ».

const pagePath = "/dashboard/notifications";

/** Nouveautés et astuces : le vendeur choisit (commandes, messages et alertes restent toujours actifs). */
export async function updateNotificationPreferences(formData: FormData) {
  const { session } = await getStoreContext();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifyNews: formData.get("notifyNews") === "on", notifyTips: formData.get("notifyTips") === "on" },
  });
  revalidatePath(pagePath);
  redirect(`${pagePath}?succes=preferences`);
}

export async function markAllNotificationsRead() {
  const { session } = await getStoreContext();
  await markNotificationsRead(session.user.id);
  revalidatePath("/dashboard", "layout");
}
