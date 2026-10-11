"use server";

import { StoreTheme } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { hexColorSchema } from "@/modules/catalog/validation";
import { requireStorePermission } from "@/modules/stores/context";
import { cameroonCities, storeBusinessCategories } from "@/modules/stores/options";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  businessCategory: z.enum(storeBusinessCategories),
  city: z.enum(cameroonCities),
  description: z.string().trim().max(2000),
  theme: z.nativeEnum(StoreTheme),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
});

function toColor(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.toUpperCase();
}

export async function updateStoreSettings(formData: FormData) {
  const { store } = await requireStorePermission("store.manage");
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    businessCategory: formData.get("businessCategory") ?? "",
    city: formData.get("city"),
    description: formData.get("description") ?? "",
    theme: formData.get("theme"),
    primaryColor: toColor(formData.get("primaryColor")),
    secondaryColor: toColor(formData.get("secondaryColor")),
    accentColor: toColor(formData.get("accentColor")),
  });

  if (!parsed.success) {
    redirect(`/dashboard/boutique?erreur=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Vérifie tes informations.")}`);
  }

  const logoFile = formData.get("logo");
  let logoUrl: string | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      redirect("/dashboard/boutique?erreur=Le%20logo%20ne%20peut%20pas%20d%C3%A9passer%202%20Mo.");
    }
    const image = sharp(Buffer.from(await logoFile.arrayBuffer()), {
      failOn: "error",
      limitInputPixels: 25_000_000,
    });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      redirect("/dashboard/boutique?erreur=Choisis%20un%20logo%20PNG%2C%20JPG%20ou%20WebP.");
    }
    if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000) {
      redirect("/dashboard/boutique?erreur=Le%20logo%20ne%20peut%20pas%20d%C3%A9passer%205%20000%20pixels%20de%20c%C3%B4t%C3%A9.");
    }

    const filename = `${randomUUID()}.webp`;
    const directory = join(process.cwd(), "public", "uploads", store.id);
    await mkdir(directory, { recursive: true });
    await image.rotate().webp({ quality: 82, effort: 4 }).toFile(join(directory, filename));
    logoUrl = `/uploads/${store.id}/${filename}`;
  }

  try {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        ...(logoUrl ? { logoUrl } : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect("/dashboard/boutique?erreur=Cette%20adresse%20de%20boutique%20est%20d%C3%A9j%C3%A0%20utilis%C3%A9e.");
    }
    throw error;
  }

  revalidatePath("/dashboard/boutique");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/boutique?succes=1");
}

export async function resetStoreColors() {
  const { store } = await requireStorePermission("store.manage");
  await prisma.store.update({
    where: { id: store.id },
    data: {
      primaryColor: "#FF9900",
      secondaryColor: "#000026",
      accentColor: "#EF765E",
    },
  });
  revalidatePath("/dashboard/boutique");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/boutique?succes=couleurs");
}

export async function publishStore() {
  const { session, store } = await requireStorePermission("store.manage");
  if (!session.user.emailVerified) {
    redirect("/dashboard/boutique?erreur=Confirme%20ton%20adresse%20e-mail%20avant%20de%20publier%20ta%20boutique.");
  }

  await prisma.store.update({ where: { id: store.id }, data: { isPublished: true } });
  revalidatePath("/dashboard/boutique");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/boutique?succes=publication");
}

export async function unpublishStore() {
  const { store } = await requireStorePermission("store.manage");
  await prisma.store.update({ where: { id: store.id }, data: { isPublished: false } });
  revalidatePath("/dashboard/boutique");
  revalidatePath(`/boutique/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
  redirect("/dashboard/boutique?succes=brouillon");
}
