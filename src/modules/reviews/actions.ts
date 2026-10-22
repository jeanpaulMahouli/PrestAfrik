"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request-ip";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { requireStorePermission } from "@/modules/stores/context";

/* ---------- Côté visiteur : laisser un avis ---------- */

export type ReviewFormState = null | { ok: true; message: string } | { ok: false; message: string; field?: string };

// 3 avis par adresse IP toutes les 10 minutes : assez pour un client, dissuasif pour le spam.
const reviewLimiter = createRateLimiter({ limit: 3, windowMs: 10 * 60_000 });

const reviewSchema = z.object({
  productId: z.string().min(10).max(40),
  authorName: z.string().trim().min(2, "Indiquez votre prénom (2 caractères au moins).").max(60, "Votre nom ne peut pas dépasser 60 caractères."),
  rating: z.coerce.number().int().min(1, "Choisissez une note de 1 à 5 étoiles.").max(5, "Choisissez une note de 1 à 5 étoiles."),
  comment: z.string().trim().min(10, "Votre avis doit contenir au moins 10 caractères.").max(1000, "Votre avis ne peut pas dépasser 1 000 caractères."),
});

/** Publie l'avis immédiatement ; la boutique peut ensuite le retirer depuis « Avis clients ». */
export async function submitReview(_previous: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  // Champ piège invisible : un humain le laisse vide.
  if (String(formData.get("website") ?? "")) return { ok: true, message: "Merci ! Votre avis est publié." };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId") ?? "",
    authorName: formData.get("authorName") ?? "",
    rating: formData.get("rating") ?? 0,
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Vérifiez votre avis.", field: String(issue?.path[0] ?? "") };
  }

  // Le produit doit être en vente dans une boutique publiée qui accepte les avis.
  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: "ACTIVE", store: { isPublished: true, suspendedAt: null, reviewsEnabled: true } },
    select: { id: true, storeId: true, store: { select: { slug: true } } },
  });
  if (!product) return { ok: false, message: "Les avis ne sont pas disponibles pour ce produit." };

  if (!reviewLimiter.consume(clientIpFrom(await headers())).allowed) {
    return { ok: false, message: "Vous avez déjà laissé plusieurs avis. Réessayez dans quelques minutes." };
  }

  await prisma.productReview.create({
    data: {
      storeId: product.storeId,
      productId: product.id,
      authorName: parsed.data.authorName,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      status: "APPROVED",
      moderatedAt: new Date(),
    },
  });
  // Note et liste d'avis à jour tout de suite sur la fiche et le catalogue.
  invalidateStorefrontCache(product.storeId, product.store.slug);
  return { ok: true, message: "Merci ! Votre avis est publié." };
}

/* ---------- Côté vendeur : modération et activation ---------- */

const reviewsPath = "/dashboard/avis";

async function refreshStorefront(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } });
  if (store) invalidateStorefrontCache(storeId, store.slug);
  revalidatePath(reviewsPath);
}

export async function moderateReview(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  const id = String(formData.get("reviewId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision === "delete") {
    await prisma.productReview.deleteMany({ where: { id, storeId: store.id } });
  } else if (decision === "APPROVED" || decision === "REJECTED") {
    // storeId dans le filtre : un vendeur ne peut modérer que les avis de sa boutique.
    await prisma.productReview.updateMany({ where: { id, storeId: store.id }, data: { status: decision, moderatedAt: new Date() } });
  }
  await refreshStorefront(store.id);
}

export async function setReviewsEnabled(formData: FormData) {
  const { store } = await requireStorePermission("products.manage");
  await prisma.store.update({ where: { id: store.id }, data: { reviewsEnabled: formData.get("enabled") === "true" } });
  await refreshStorefront(store.id);
}
