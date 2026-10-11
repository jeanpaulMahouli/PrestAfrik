"use server";

import { createHash, randomBytes } from "node:crypto";
import { StoreRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";
import { getSmtpConfig } from "@/modules/email/config";
import { sendTransactionalEmail } from "@/modules/email/server";
import {
  invitationIdSchema,
  invitationTokenSchema,
  inviteTeamMemberSchema,
  membershipIdSchema,
  updateMemberRoleSchema,
} from "@/modules/team/validation";
import { requireStorePermission } from "@/modules/stores/context";
import {
  assertCanInviteMember,
  SubscriptionLimitError,
} from "@/modules/subscriptions/service";

const teamPath = "/dashboard/equipe";
const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function reportError(message: string): never {
  redirect(`${teamPath}?erreur=${encodeURIComponent(message)}`);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invitationUrl(token: string) {
  return new URL(
    `/invitations/accepter?token=${encodeURIComponent(token)}`,
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ).toString();
}

async function sendInvitationEmail(email: string, storeName: string, token: string) {
  getSmtpConfig();
  await sendTransactionalEmail({
    to: email,
    subject: `Invitation à rejoindre ${storeName} sur PrestAfrik`,
    heading: `Tu es invité(e) à rejoindre ${storeName}`,
    message: `Le propriétaire de la boutique ${storeName} t’invite à rejoindre son équipe sur PrestAfrik. Ce lien expire dans 7 jours et ne peut être utilisé qu’une seule fois.`,
    actionLabel: "Accepter l’invitation",
    actionUrl: invitationUrl(token),
  });
}

export async function inviteTeamMember(formData: FormData) {
  const parsed = inviteTeamMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) reportError("Saisis une adresse e-mail valide et choisis un rôle.");
  try {
    getSmtpConfig();
  } catch {
    reportError("smtp-config");
  }

  const { session, store } = await requireStorePermission("team.manage");
  const email = parsed.data.email.toLowerCase();
  const account = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (account) {
    const existingMembership = await prisma.storeMembership.findUnique({
      where: { storeId_userId: { storeId: store.id, userId: account.id } },
      select: { id: true },
    });
    if (existingMembership) reportError("Cette personne est déjà membre de ta boutique.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + invitationLifetimeMs);
  const invitationData = {
    role: parsed.data.role,
    token: hashToken(token),
    expiresAt,
    acceptedAt: null,
    acceptedById: null,
    invitedById: session.user.id,
  };

  try {
    await prisma.$transaction(async (transaction) => {
      const existingInvitation = await transaction.storeInvitation.findUnique({
        where: { storeId_email: { storeId: store.id, email } },
        select: { id: true, acceptedAt: true, expiresAt: true },
      });
      const alreadyInvited =
        existingInvitation?.acceptedAt === null &&
        existingInvitation.expiresAt > new Date();
      await assertCanInviteMember(transaction, store.id, alreadyInvited);
      if (existingInvitation) {
        await transaction.storeInvitation.update({
          where: { id: existingInvitation.id },
          data: invitationData,
        });
      } else {
        await transaction.storeInvitation.create({
          data: { storeId: store.id, email, ...invitationData },
        });
      }
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) reportError(error.message);
    throw error;
  }
  try {
    await sendInvitationEmail(email, store.name, token);
  } catch (error) {
    console.error("PrestAfrik could not send a team invitation email.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    reportError("smtp");
  }
  revalidatePath(teamPath);
  redirect(`${teamPath}?succes=invitation`);
}

export async function resendTeamInvitation(formData: FormData) {
  const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!parsed.success) reportError("Invitation invalide.");
  try {
    getSmtpConfig();
  } catch {
    reportError("smtp-config");
  }

  const { session, store } = await requireStorePermission("team.manage");
  const invitation = await prisma.storeInvitation.findFirst({
    where: { id: parsed.data, storeId: store.id, acceptedAt: null },
    select: { id: true, email: true },
  });
  if (!invitation) reportError("Cette invitation n’est plus disponible.");

  const token = randomBytes(32).toString("base64url");
  await prisma.storeInvitation.update({
    where: { id: invitation.id },
    data: {
      token: hashToken(token),
      expiresAt: new Date(Date.now() + invitationLifetimeMs),
      invitedById: session.user.id,
    },
  });
  try {
    await sendInvitationEmail(invitation.email, store.name, token);
  } catch (error) {
    console.error("PrestAfrik could not resend a team invitation email.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    reportError("smtp");
  }
  revalidatePath(teamPath);
  redirect(`${teamPath}?succes=renvoi`);
}

export async function cancelTeamInvitation(formData: FormData) {
  const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!parsed.success) reportError("Invitation invalide.");

  const { store } = await requireStorePermission("team.manage");
  const deleted = await prisma.storeInvitation.deleteMany({
    where: { id: parsed.data, storeId: store.id, acceptedAt: null },
  });
  if (deleted.count !== 1) reportError("Cette invitation n’est plus disponible.");
  revalidatePath(teamPath);
  redirect(`${teamPath}?succes=annulation`);
}

export async function updateTeamMemberRole(formData: FormData) {
  const parsed = updateMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });
  if (!parsed.success) reportError("Choisis un rôle valide.");

  const { store } = await requireStorePermission("team.manage");
  const updated = await prisma.storeMembership.updateMany({
    where: {
      id: parsed.data.membershipId,
      storeId: store.id,
      role: { not: StoreRole.OWNER },
    },
    data: { role: parsed.data.role },
  });
  if (updated.count !== 1) reportError("Membre introuvable ou rôle non modifiable.");
  revalidatePath(teamPath);
  redirect(`${teamPath}?succes=role`);
}

export async function removeTeamMember(formData: FormData) {
  const parsed = membershipIdSchema.safeParse(formData.get("membershipId"));
  if (!parsed.success) reportError("Membre invalide.");

  const { store } = await requireStorePermission("team.manage");
  const removed = await prisma.storeMembership.deleteMany({
    where: {
      id: parsed.data,
      storeId: store.id,
      role: { not: StoreRole.OWNER },
    },
  });
  if (removed.count !== 1) reportError("Membre introuvable ou impossible à retirer.");
  revalidatePath(teamPath);
  redirect(`${teamPath}?succes=retrait`);
}

export async function acceptTeamInvitation(formData: FormData) {
  const parsed = invitationTokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) redirect("/connexion?erreur=invitation-invalide");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/connexion?invitation=${encodeURIComponent(parsed.data)}`);

  const tokenHash = hashToken(parsed.data);
  const now = new Date();
  const invitation = await prisma.storeInvitation.findFirst({
    where: { token: tokenHash, acceptedAt: null, expiresAt: { gt: now } },
    include: { store: { select: { id: true } } },
  });
  if (!invitation) redirect("/connexion?erreur=invitation-expiree");
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    redirect(`/invitations/accepter?token=${encodeURIComponent(parsed.data)}&erreur=adresse`);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await assertCanInviteMember(transaction, invitation.storeId, true, now);
      const claimed = await transaction.storeInvitation.updateMany({
        where: {
          id: invitation.id,
          token: tokenHash,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now, acceptedById: session.user.id },
      });
      if (claimed.count !== 1) throw new Error("Cette invitation a déjà été utilisée ou a expiré.");
      await transaction.storeMembership.create({
        data: {
          storeId: invitation.storeId,
          userId: session.user.id,
          role: invitation.role,
        },
      });
    });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      redirect(`/invitations/accepter?token=${encodeURIComponent(parsed.data)}&erreur=quota`);
    }
    throw error;
  }

  (await cookies()).set("prestafrik-store", invitation.storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
