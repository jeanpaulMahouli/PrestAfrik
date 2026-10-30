"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStoreContext } from "@/modules/stores/context";

// Messages des vendeurs depuis leur tableau de bord (bloc Communauté) : avis noté sur PrestAfrik,
// suggestion ou question. Ils arrivent dans Administration → Messages et avis, où l'équipe répond
// par e-mail (même circuit que les demandes d'aide).

export type FeedbackState = null | { ok: boolean; message: string };

const kinds = { REVIEW: "Avis sur PrestAfrik", SUGGESTION: "Suggestion", QUESTION: "Question" } as const;
/** Au plus 10 messages par vendeur et par jour (protection contre les envois en rafale). */
const dailyLimit = 10;

const schema = z
  .object({
    kind: z.enum(["REVIEW", "SUGGESTION", "QUESTION"]),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    message: z.string().trim().max(2000, "Votre message ne peut pas dépasser 2 000 caractères."),
  })
  .superRefine((value, context) => {
    if (value.kind === "REVIEW" && !value.rating) context.addIssue({ code: "custom", message: "Choisissez une note de 1 à 5 étoiles." });
    if (value.kind !== "REVIEW" && value.message.length < 5) context.addIssue({ code: "custom", message: "Écrivez votre message (5 caractères au moins)." });
  });

export async function sendVendorFeedback(_previous: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const { session, store } = await getStoreContext();
  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    rating: formData.get("rating") || undefined,
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Vérifiez votre message." };

  const since = new Date(Date.now() - 86_400_000);
  const recent = await prisma.supportTicket.count({ where: { requesterId: session.user.id, kind: { not: "CONTACT" }, createdAt: { gte: since } } });
  if (recent >= dailyLimit) return { ok: false, message: "Vous avez déjà envoyé beaucoup de messages aujourd’hui. Réessayez demain, ou écrivez-nous sur WhatsApp." };

  const { kind, rating, message } = parsed.data;
  await prisma.supportTicket.create({
    data: {
      kind,
      rating: kind === "REVIEW" ? rating : null,
      subject: kind === "REVIEW" ? `${kinds.REVIEW} : ${rating}/5` : `${kinds[kind]} de ${store.name}`.slice(0, 120),
      message: message || "(note sans commentaire)",
      requesterName: session.user.name.slice(0, 120),
      requesterEmail: session.user.email,
      requesterId: session.user.id,
      storeId: store.id,
    },
  });
  revalidatePath("/admin/avis");
  return {
    ok: true,
    message:
      kind === "REVIEW"
        ? "Merci pour votre avis ! Il aide toute l’équipe à améliorer PrestAfrik."
        : kind === "SUGGESTION"
          ? "Merci pour votre idée ! L’équipe la lit avec attention."
          : `Question bien reçue. L’équipe vous répond par e-mail à ${session.user.email}.`,
  };
}
