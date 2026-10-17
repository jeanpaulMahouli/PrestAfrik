import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Anciens liens de suivi : redirection vers le suivi intégré à la boutique. */
export default async function LegacyTrackingPage({ params }: PageProps<"/commande/suivi/[token]">) {
  const { token } = await params;
  if (!/^[\w-]{40,64}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({ where: { trackingToken: token }, select: { store: { select: { slug: true } } } });
  if (!order) notFound();
  permanentRedirect(`/${order.store.slug}/suivi/${token}`);
}
