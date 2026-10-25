"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { auth } from "@/modules/auth/server";
import { clientIpFrom } from "@/lib/request-ip";
import { contactSubjects, isContactSubject } from "@/modules/contact/subjects";
import { sendEmailQuietly, sendTeamEmail } from "@/modules/email/server";

export type ContactState = null | { ok: true; message: string } | { ok: false; message: string; field?: string };

// 5 messages par adresse IP toutes les 15 minutes : largement assez pour un humain, dissuasif pour un robot.
const limiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(80, "Votre nom ne peut pas dépasser 80 caractères."),
  email: z.string().trim().toLowerCase().email("Indiquez une adresse e-mail valide.").max(254),
  phone: z
    .string()
    .trim()
    .max(30, "Le numéro ne peut pas dépasser 30 caractères.")
    .regex(/^[+\d\s().-]*$/, "Le numéro ne peut contenir que des chiffres, des espaces et « + »."),
  store: z.string().trim().max(80),
  subject: z.string().refine(isContactSubject, "Choisissez un sujet."),
  message: z.string().trim().min(10, "Votre message doit contenir au moins 10 caractères.").max(3000, "Votre message ne peut pas dépasser 3 000 caractères."),
});

/** Formulaire de contact : message transmis à l'équipe et accusé de réception (E24) à l'expéditeur. */
export async function sendContactMessage(_previous: ContactState, formData: FormData): Promise<ContactState> {
  // Champ piège invisible : un humain le laisse vide. On répond « envoyé » sans rien faire.
  if (String(formData.get("website") ?? "")) return { ok: true, message: "Merci ! Votre message a bien été envoyé." };

  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    store: formData.get("store") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Vérifiez le formulaire.", field: String(issue?.path[0] ?? "") };
  }

  const ip = clientIpFrom(await headers());
  if (!limiter.consume(ip).allowed) {
    return { ok: false, message: "Vous avez envoyé plusieurs messages en peu de temps. Réessayez dans quelques minutes." };
  }

  const input = parsed.data;
  const subjectLabel = isContactSubject(input.subject) ? contactSubjects[input.subject] : "Autre demande";
  const text = [
    `Sujet : ${subjectLabel}`,
    `Nom : ${input.name}`,
    `E-mail : ${input.email}`,
    input.phone ? `Téléphone / WhatsApp : ${input.phone}` : null,
    input.store ? `Boutique : ${input.store}` : null,
    "",
    input.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  // Demande d'aide suivie dans l'administration (Alertes → Tickets), même si l'e-mail à l'équipe échoue.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const ticket = await prisma.supportTicket
    .create({
      data: {
        subject: `${subjectLabel}${input.store ? ` · ${input.store}` : ""}`.slice(0, 120),
        message: [input.phone ? `Téléphone / WhatsApp : ${input.phone}` : null, input.message].filter(Boolean).join("\n\n").slice(0, 4000),
        requesterName: input.name,
        requesterEmail: input.email,
        requesterId: session?.user.id ?? null,
      },
      select: { id: true },
    })
    .catch(() => null);

  try {
    await sendTeamEmail({ subject: `[Contact] ${subjectLabel} · ${input.name}`, text, replyTo: input.email });
  } catch (error) {
    console.error("Échec de l’envoi du message de contact.", error instanceof Error ? error.message : error);
    if (!ticket) return { ok: false, message: "Votre message n’a pas pu partir. Réessayez, ou écrivez-nous directement par e-mail." };
  }

  // E24 : accusé de réception (au mieux : son échec n'empêche pas le message d'être transmis).
  const firstName = input.name.split(/\s+/)[0];
  await sendEmailQuietly("E24", input.email, { prenom: firstName, message: input.message.length > 600 ? `${input.message.slice(0, 600)}…` : input.message });

  return { ok: true, message: `Merci ${firstName} ! Votre message a bien été envoyé. Nous vous répondons très vite par e-mail.` };
}
