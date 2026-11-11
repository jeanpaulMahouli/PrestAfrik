"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { welcomeHref } from "@/config/routes";
import { prisma } from "@/lib/prisma";
import { acquisitionSources } from "@/modules/auth/acquisition";
import { auth } from "@/modules/auth/server";

/** Page suivante : uniquement une page de l'espace vendeur (jamais une adresse extérieure). */
function nextPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return /^\/dashboard(\/[\w-]+)*(\?[\w=&-]*)?$/.test(path) ? path : welcomeHref;
}

/** Réponse à « Comment avez-vous connu PrestAfrik ? » : enregistrée une seule fois, puis le tableau de bord. */
export async function saveAcquisitionSource(_: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  const source = z.enum(acquisitionSources).safeParse(formData.get("source"));
  if (!source.success) return { error: "Choisissez une réponse pour continuer." };
  await prisma.user.updateMany({
    where: { id: session.user.id, acquisitionSource: null },
    data: { acquisitionSource: source.data, acquisitionAnsweredAt: new Date() },
  });
  redirect(nextPath(formData.get("suite")));
}
