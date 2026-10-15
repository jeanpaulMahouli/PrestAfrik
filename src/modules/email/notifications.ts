import "server-only";

import { after } from "next/server";
import { formatFcfa, formatReference } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";
import { sendEmailQuietly } from "@/modules/email/server";

const appUrl = (path: string) => new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();

async function ownerEmails(storeId: string) {
  const owners = await prisma.storeMembership.findMany({ where: { storeId, role: "OWNER" }, select: { user: { select: { email: true } } } });
  return owners.map((owner) => owner.user.email);
}

/** E13 — boutique publiée (envoyé après la réponse, sans ralentir le vendeur). */
export function notifyStorePublished(storeId: string) {
  after(async () => {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true, slug: true } });
    if (!store) return;
    for (const email of await ownerEmails(storeId)) {
      await sendEmailQuietly("E13", email, { boutique: store.name, adresseBoutique: storePublicUrl(store.slug) }, appUrl("/dashboard"));
    }
  });
}

/** E21 — nouvelle commande, au propriétaire (envoyé après la réponse au client). */
export function notifyNewOrder(orderReference: string, storeId: string) {
  after(async () => {
    const order = await prisma.order.findUnique({
      where: { storeId_reference: { storeId, reference: orderReference } },
      select: {
        id: true,
        reference: true,
        customerName: true,
        totalXaf: true,
        subtotalXaf: true,
        deliveryMethod: true,
        deliveryCity: true,
        neighborhood: true,
        store: { select: { name: true } },
        items: { select: { productName: true, quantity: true } },
      },
    });
    if (!order) return;
    // Confidentialité : prénom et initiale du nom seulement, jamais le numéro.
    const [first, last] = order.customerName.trim().split(/\s+/);
    const resume = order.items.slice(0, 4).map((item) => `${item.productName} × ${item.quantity}`).join(", ") + (order.items.length > 4 ? "…" : "");
    for (const email of await ownerEmails(storeId)) {
      await sendEmailQuietly(
        "E21",
        email,
        {
          reference: formatReference(order.reference),
          boutique: order.store.name,
          nomClient: last ? `${first} ${last[0]}.` : first,
          resume,
          total: formatFcfa(order.totalXaf ?? order.subtotalXaf),
          livraison: order.deliveryMethod === "PICKUP" ? "retrait en boutique" : [order.deliveryCity, order.neighborhood].filter(Boolean).join(", "),
        },
        appUrl(`/dashboard/commandes/${order.id}`),
      );
    }
  });
}
