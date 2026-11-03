"use server";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminRole, logAdminAction, requirePlatformAdmin } from "@/modules/admin/context";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";

// Administration → Utilisateurs → Gérer le compte : l'administration a la main sur chaque compte
// (informations, confirmation, sessions, suppression). Chaque action est journalisée.

const idSchema = z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/);
const listPath = "/admin/utilisateurs";
const accountPath = (userId: string) => `${listPath}/${userId}`;

function back(path: string, message: string, kind: "succes" | "erreur" = "succes"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

/**
 * Compte visé, et droit de l'administrateur connecté à le modifier : personne ne se supprime lui-même,
 * et seul un super administrateur agit sur le compte d'un autre administrateur.
 */
async function targetAccount(formData: FormData, { allowSelf = true } = {}) {
  const admin = await requirePlatformAdmin();
  const userId = idSchema.safeParse(formData.get("userId"));
  if (!userId.success) back(listPath, "Compte introuvable.", "erreur");
  const user = await prisma.user.findUnique({
    where: { id: userId.data },
    select: { id: true, name: true, email: true, phoneNumber: true, platformRole: true, emailVerified: true },
  });
  if (!user) back(listPath, "Compte introuvable.", "erreur");
  if (!allowSelf && user.id === admin.id) back(accountPath(user.id), "Vous ne pouvez pas faire cela sur votre propre compte.", "erreur");
  if (user.id !== admin.id && isAdminRole(user.platformRole) && admin.platformRole !== "SUPER_ADMIN") {
    back(accountPath(user.id), "Seul un super administrateur peut modifier le compte d’un autre administrateur.", "erreur");
  }
  return { admin, user };
}

const accountSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80, "Le nom ne peut pas dépasser 80 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  phone: z.string().trim().max(24),
});

/** Nom, adresse e-mail et numéro WhatsApp du compte. */
export async function updateUserAccount(formData: FormData) {
  const { admin, user } = await targetAccount(formData);
  const parsed = accountSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone") ?? "" });
  if (!parsed.success) back(accountPath(user.id), parsed.error.issues[0]?.message ?? "Informations invalides.", "erreur");
  const { name, email } = parsed.data;

  let phoneNumber: string | null = null;
  if (parsed.data.phone) {
    const phone = parsePhoneNumberFromString(parsed.data.phone.replace(/[\s.-]/g, ""), "CM");
    if (!phone?.isValid()) back(accountPath(user.id), "Numéro WhatsApp invalide : indiquez-le avec l’indicatif, par exemple +237 6 99 00 00 00.", "erreur");
    phoneNumber = phone.number;
  }

  if (email !== user.email && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
    back(accountPath(user.id), "Cette adresse e-mail est déjà utilisée par un autre compte.", "erreur");
  }
  if (phoneNumber && phoneNumber !== user.phoneNumber && (await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } }))) {
    back(accountPath(user.id), "Ce numéro WhatsApp est déjà utilisé par un autre compte.", "erreur");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name, email, phoneNumber } });
    await logAdminAction(
      admin.id,
      { action: "user.update", targetType: "user", targetId: user.id, details: { before: { name: user.name, email: user.email, phone: user.phoneNumber }, after: { name, email, phone: phoneNumber } } },
      tx,
    );
  });
  revalidatePath("/admin", "layout");
  back(accountPath(user.id), "Informations du compte enregistrées.");
}

/** Adresse e-mail confirmée sans le code (personne identifiée par un autre moyen). */
export async function verifyUserEmail(formData: FormData) {
  const { admin, user } = await targetAccount(formData);
  if (user.emailVerified) back(accountPath(user.id), "L’adresse e-mail est déjà confirmée.", "erreur");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await logAdminAction(admin.id, { action: "user.verify-email", targetType: "user", targetId: user.id }, tx);
  });
  back(accountPath(user.id), `L’adresse ${user.email} est confirmée.`);
}

/** Déconnexion sur tous les appareils (sans suspendre le compte). */
export async function signOutUserEverywhere(formData: FormData) {
  const { admin, user } = await targetAccount(formData, { allowSelf: false });
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });
  await logAdminAction(admin.id, { action: "user.sign-out", targetType: "user", targetId: user.id, details: { sessions: count } });
  back(accountPath(user.id), count ? `${user.name} est déconnecté(e) de ${count} appareil${count > 1 ? "s" : ""}.` : `${user.name} n’était connecté(e) sur aucun appareil.`);
}

/**
 * Suppression définitive du compte, après avoir retapé son adresse e-mail.
 * Les boutiques dont la personne est la seule propriétaire sont supprimées avec tout leur contenu.
 * Dans les boutiques partagées, ce qu'elle a saisi (paiements, notes, rappels, campagnes) est rattaché
 * au propriétaire restant : l'historique de la boutique reste complet.
 */
export async function deleteUserAccount(formData: FormData) {
  const { admin, user } = await targetAccount(formData, { allowSelf: false });
  const confirmation = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  if (confirmation !== user.email.toLowerCase()) {
    back(accountPath(user.id), `Pour confirmer, tapez exactement l’adresse e-mail du compte : ${user.email}.`, "erreur");
  }

  const memberships = await prisma.storeMembership.findMany({
    where: { userId: user.id },
    select: {
      store: {
        select: { id: true, name: true, slug: true, memberships: { where: { role: "OWNER", userId: { not: user.id } }, orderBy: { createdAt: "asc" }, take: 1, select: { userId: true } } },
      },
      role: true,
    },
  });
  const deletedStores = memberships.filter((membership) => membership.role === "OWNER" && membership.store.memberships.length === 0).map((membership) => membership.store);
  const sharedStores = memberships.filter((membership) => !deletedStores.some((store) => store.id === membership.store.id)).map((membership) => membership.store);

  await prisma.$transaction(
    async (tx) => {
      for (const store of deletedStores) {
        // Paiements et commandes d'abord : ces liens empêchent la suppression en cascade (onDelete: Restrict).
        await tx.payment.updateMany({ where: { storeId: store.id }, data: { reversesId: null } });
        await tx.payment.deleteMany({ where: { storeId: store.id } });
        await tx.order.deleteMany({ where: { storeId: store.id } });
        await tx.store.delete({ where: { id: store.id } });
      }
      for (const store of sharedStores) {
        // Propriétaire restant, sinon l'administrateur qui supprime le compte.
        const heir = store.memberships[0]?.userId ?? admin.id;
        await tx.payment.updateMany({ where: { storeId: store.id, authorId: user.id }, data: { authorId: heir } });
        await tx.customerNote.updateMany({ where: { authorId: user.id, customer: { storeId: store.id } }, data: { authorId: heir } });
        await tx.customerReminder.updateMany({ where: { authorId: user.id, customer: { storeId: store.id } }, data: { authorId: heir } });
        await tx.marketingCampaign.updateMany({ where: { storeId: store.id, createdById: user.id }, data: { createdById: heir } });
      }
      // Restes éventuels hors boutique (ne devrait pas arriver) : rattachés à l'administrateur.
      await tx.payment.updateMany({ where: { authorId: user.id }, data: { authorId: admin.id } });
      await tx.customerNote.updateMany({ where: { authorId: user.id }, data: { authorId: admin.id } });
      await tx.customerReminder.updateMany({ where: { authorId: user.id }, data: { authorId: admin.id } });
      await tx.marketingCampaign.updateMany({ where: { createdById: user.id }, data: { createdById: admin.id } });
      await tx.verification.deleteMany({ where: { identifier: { contains: user.email } } });
      await tx.user.delete({ where: { id: user.id } });
      await logAdminAction(
        admin.id,
        {
          action: "user.delete",
          targetType: "user",
          targetId: user.id,
          details: { name: user.name, email: user.email, phone: user.phoneNumber, deletedStores: deletedStores.map((store) => store.name) },
        },
        tx,
      );
    },
    { timeout: 60_000 },
  );

  // Images des boutiques supprimées : en dehors de la transaction, sans bloquer en cas d'échec.
  if (deletedStores.length) {
    const { storage } = await import("@/lib/storage");
    await Promise.allSettled(deletedStores.flatMap((store) => [storage.deletePrefix(`stores/${store.id}`), storage.deletePrefix(store.id)]));
    for (const store of deletedStores) invalidateStorefrontCache(store.id, store.slug);
  }
  revalidatePath("/admin", "layout");
  back(
    listPath,
    deletedStores.length
      ? `Compte de ${user.name} supprimé, avec ${deletedStores.length > 1 ? `ses boutiques ${deletedStores.map((store) => `« ${store.name} »`).join(", ")}` : `sa boutique « ${deletedStores[0].name} »`}.`
      : `Compte de ${user.name} supprimé.`,
  );
}
