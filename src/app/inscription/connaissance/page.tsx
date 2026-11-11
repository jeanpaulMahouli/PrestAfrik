import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AcquisitionForm } from "@/components/auth/acquisition-form";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { welcomeHref, whatsappStepHref } from "@/config/routes";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

export const metadata: Metadata = { title: "Comment avez-vous connu PrestAfrik ?", robots: { index: false } };

/**
 * Étape de l'inscription, juste après le numéro WhatsApp : « Comment avez-vous connu PrestAfrik ? ».
 * Posée une seule fois ; un compte qui a déjà répondu passe directement au tableau de bord.
 */
export default async function AcquisitionStepPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  if (!session.user.phoneNumber) redirect(whatsappStepHref);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { acquisitionSource: true } });
  if (user?.acquisitionSource) redirect(welcomeHref);

  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  return (
    <AuthShell>
      <AuthHeading subtitle="Une seule réponse, et c’est parti : votre réponse nous aide à mieux faire connaître PrestAfrik." title={`${firstName}, comment avez-vous connu PrestAfrik ?`} />
      <AcquisitionForm next={welcomeHref} />
    </AuthShell>
  );
}
