"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { deleteUserAvatar, ImageUploadError, saveUserAvatar } from "@/lib/uploads";
import { auth } from "@/modules/auth/server";

export type AvatarState = null | { ok: boolean; message: string; image?: string | null };

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Votre session a expiré. Reconnectez-vous pour continuer.");
  return session.user;
}

/** Remplace la photo de profil : la nouvelle image est enregistrée avant la suppression de l'ancienne. */
export async function updateAvatar(_previous: AvatarState, formData: FormData): Promise<AvatarState> {
  const user = await requireUser();
  let image: string | null;
  try {
    image = await saveUserAvatar(formData.get("avatar"), user.id);
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, message: error.message };
    throw error;
  }
  if (!image) return { ok: false, message: "Choisissez une photo à envoyer." };

  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { image: true } });
  await prisma.user.update({ where: { id: user.id }, data: { image } });
  await deleteUserAvatar(previous?.image);
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo de profil mise à jour.", image };
}

export async function removeAvatar(): Promise<AvatarState> {
  const user = await requireUser();
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { image: true } });
  if (previous?.image) {
    await prisma.user.update({ where: { id: user.id }, data: { image: null } });
    await deleteUserAvatar(previous.image);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo de profil retirée.", image: null };
}

export type NameState = null | { ok: boolean; message: string; name?: string };

/** Modifie le nom affiché du compte (mêmes règles qu'à l'inscription : 2 à 80 caractères). */
export async function updateName(_previous: NameState, formData: FormData): Promise<NameState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return { ok: false, message: "Votre nom doit contenir au moins 2 caractères." };
  if (name.length > 80) return { ok: false, message: "Votre nom ne peut pas dépasser 80 caractères." };
  if (name === user.name) return { ok: true, message: "Aucun changement.", name };

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Nom mis à jour.", name };
}
