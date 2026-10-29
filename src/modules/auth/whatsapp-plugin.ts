import "server-only";

import { Prisma, type PhoneVerificationPurpose } from "@prisma/client";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { texts } from "@/config/texts";
import { prisma } from "@/lib/prisma";
import { checkPassword, passwordMaxLength, passwordMinLength } from "@/modules/auth/password-policy";
import { placeholderEmailFor } from "@/modules/auth/phone-account";
import {
  generateOtp,
  hashOtp,
  normalizeOtpInput,
  otpMatches,
  otpMaxAttempts,
  otpResendDelayMs,
  otpTtlMs,
  remainingAttempts,
  sendDecision,
  verifyOtp,
  waitLabel,
} from "@/modules/auth/phone-otp";
import { maskPhone, sendOtpMessage } from "@/modules/whatsapp/platform";

// Inscription, connexion et mot de passe oublié avec un numéro WhatsApp (Better Auth).
//   POST /api/auth/whatsapp/sign-up/start     nom, numéro, mot de passe → code envoyé sur WhatsApp
//   POST /api/auth/whatsapp/sign-up/resend    nouveau code (délai d'attente, limite par 24 h)
//   POST /api/auth/whatsapp/sign-up/verify    code → compte créé et session ouverte
//   POST /api/auth/whatsapp/sign-in           numéro et mot de passe
//   POST /api/auth/whatsapp/password/start    code pour changer de mot de passe
//   POST /api/auth/whatsapp/password/reset    code et nouveau mot de passe
//   POST /api/auth/whatsapp/delivery          état de distribution du dernier code (webhook Meta)
// Le compte n'existe qu'après la vérification du code : actualiser la page ou recommencer réutilise la
// même demande (une ligne PhoneVerification par numéro et par usage), sans jamais créer de doublon.

const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => /^\+\d{8,15}$/.test(value) && Boolean(parsePhoneNumberFromString(value)?.isValid()), "Ce numéro WhatsApp ne semble pas valide.");

const nameSchema = z.string().trim().min(2, texts.auth.signUp.nameInvalid).max(80, texts.auth.signUp.nameInvalid);
const passwordSchema = z.string().min(passwordMinLength, texts.auth.fields.passwordTooShort).max(passwordMaxLength, texts.auth.fields.passwordTooLong);
const codeSchema = z.string().max(12);

/** Erreur lisible par l'interface : `code` permet d'adapter l'écran, `message` s'affiche tel quel. */
function fail(status: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "TOO_MANY_REQUESTS" | "SERVICE_UNAVAILABLE", code: string, message: string, extra: Record<string, unknown> = {}): never {
  throw new APIError(status, { code, message, ...extra });
}

function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) fail("BAD_REQUEST", "INVALID_INPUT", parsed.error.issues[0]?.message ?? texts.common.genericError);
  return parsed.data;
}

const findRecord = (purpose: PhoneVerificationPurpose, phoneNumber: string) =>
  prisma.phoneVerification.findUnique({ where: { purpose_phoneNumber: { purpose, phoneNumber } } });

type Sent = { phoneNumber: string; maskedPhone: string; expiresAt: string; resendAt: string; sent: boolean };

/**
 * Prépare et envoie un code. Si un code valide vient d'être envoyé (actualisation, double clic), aucun
 * nouveau message ne part : l'écran de saisie s'affiche simplement de nouveau.
 */
async function issueCode(
  secret: string,
  purpose: PhoneVerificationPurpose,
  phoneNumber: string,
  fields: { name?: string; passwordHash?: string },
  { forceNew }: { forceNew: boolean },
): Promise<Sent> {
  const now = new Date();
  const existing = await findRecord(purpose, phoneNumber);
  const active = existing && !existing.consumedAt ? existing : null;
  const decision = sendDecision(active, now);
  if (!decision.allowed) {
    const stillValid = active && active.expiresAt > now && active.attempts < otpMaxAttempts;
    if (decision.reason === "cooldown" && stillValid && !forceNew) {
      if (fields.name || fields.passwordHash) await prisma.phoneVerification.update({ where: { id: active.id }, data: fields });
      return { phoneNumber, maskedPhone: maskPhone(phoneNumber), expiresAt: active.expiresAt.toISOString(), resendAt: new Date(active.lastSentAt.getTime() + otpResendDelayMs).toISOString(), sent: false };
    }
    if (decision.reason === "cooldown") {
      fail("TOO_MANY_REQUESTS", "RESEND_TOO_SOON", `Patientez encore ${waitLabel(decision.retryAfterSeconds)} avant de demander un nouveau code.`, { retryAfterSeconds: decision.retryAfterSeconds });
    }
    fail("TOO_MANY_REQUESTS", "DAILY_LIMIT", `Trop de codes ont été demandés pour ce numéro. Réessayez dans ${waitLabel(decision.retryAfterSeconds)}, ou écrivez-nous si le problème continue.`, { retryAfterSeconds: decision.retryAfterSeconds });
  }

  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + otpTtlMs);
  const codeFields = {
    codeHash: hashOtp(secret, purpose, phoneNumber, code),
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    consumedAt: null,
    messageId: null,
    deliveryStatus: null,
    deliveryError: null,
    ...fields,
  };
  const record = existing
    ? await prisma.phoneVerification.update({
        where: { id: existing.id },
        data: { ...codeFields, ...(decision.resetWindow ? { sendCount: 1, windowStartedAt: now } : { sendCount: { increment: 1 } }) },
      })
    : await prisma.phoneVerification
        .create({ data: { purpose, phoneNumber, sendCount: 1, windowStartedAt: now, ...codeFields } })
        .catch(async (error: unknown) => {
          // Deux demandes simultanées pour le même numéro : la première l'emporte.
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const winner = await findRecord(purpose, phoneNumber);
            if (winner) return null;
          }
          throw error;
        });
  if (!record) {
    const winner = (await findRecord(purpose, phoneNumber))!;
    return { phoneNumber, maskedPhone: maskPhone(phoneNumber), expiresAt: winner.expiresAt.toISOString(), resendAt: new Date(winner.lastSentAt.getTime() + otpResendDelayMs).toISOString(), sent: false };
  }

  const result = await sendOtpMessage(phoneNumber, code);
  if (!result.ok) {
    // L'envoi a échoué : la demande ne compte pas, l'utilisateur peut réessayer tout de suite.
    await prisma.phoneVerification.update({
      where: { id: record.id },
      data: { lastSentAt: new Date(0), sendCount: { decrement: 1 }, deliveryStatus: "failed", deliveryError: result.error.slice(0, 200) },
    });
    fail(result.reason === "not-configured" ? "SERVICE_UNAVAILABLE" : "BAD_REQUEST", "SEND_FAILED", result.error);
  }
  await prisma.phoneVerification.update({ where: { id: record.id }, data: { messageId: result.messageId, deliveryStatus: "sent" } });
  return { phoneNumber, maskedPhone: maskPhone(phoneNumber), expiresAt: expiresAt.toISOString(), resendAt: new Date(now.getTime() + otpResendDelayMs).toISOString(), sent: true };
}

/** Vérifie un code et le marque comme utilisé (une seule fois, même en cas de double envoi). */
async function consumeCode(secret: string, purpose: PhoneVerificationPurpose, phoneNumber: string, rawCode: string) {
  const code = normalizeOtpInput(rawCode);
  if (!code) fail("BAD_REQUEST", "INVALID_CODE", "Le code contient 6 chiffres. Recopiez-le depuis le message WhatsApp de PrestAfrik.");
  const record = await findRecord(purpose, phoneNumber);
  if (!record) fail("NOT_FOUND", "NO_PENDING_CODE", "Aucun code n’a été demandé pour ce numéro. Touchez « Renvoyer le code ».");

  const now = new Date();
  const outcome = verifyOtp(record, code, (value, hash) => otpMatches(secret, purpose, phoneNumber, value, hash), now);
  if (outcome === "used") fail("BAD_REQUEST", "CODE_USED", "Ce code a déjà été utilisé. Demandez-en un nouveau si besoin.");
  if (outcome === "too-many-attempts") fail("TOO_MANY_REQUESTS", "TOO_MANY_ATTEMPTS", "Trop de codes incorrects. Demandez un nouveau code pour réessayer.");
  if (outcome === "expired") fail("BAD_REQUEST", "CODE_EXPIRED", "Ce code a expiré (il est valable 10 minutes). Demandez-en un nouveau.");
  if (outcome === "invalid") {
    const updated = await prisma.phoneVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
    const left = remainingAttempts(updated.attempts);
    fail(
      "BAD_REQUEST",
      left > 0 ? "INVALID_CODE" : "TOO_MANY_ATTEMPTS",
      left > 0
        ? `Code incorrect. Vérifiez le message WhatsApp et réessayez (encore ${left} essai${left > 1 ? "s" : ""}).`
        : "Code incorrect. Trop d’essais : demandez un nouveau code.",
      { remainingAttempts: left },
    );
  }
  const claimed = await prisma.phoneVerification.updateMany({ where: { id: record.id, consumedAt: null, codeHash: record.codeHash }, data: { consumedAt: now } });
  if (claimed.count !== 1) fail("BAD_REQUEST", "CODE_USED", "Ce code vient d’être utilisé. Si votre compte est créé, connectez-vous.");
  return record;
}

/** Remet un code en service si l'étape suivante échoue (l'utilisateur peut réessayer avec le même code). */
const releaseCode = (id: string) => prisma.phoneVerification.update({ where: { id }, data: { consumedAt: null } }).catch(() => undefined);

const phoneTaken = () =>
  fail("CONFLICT", "PHONE_TAKEN", "Un compte PrestAfrik existe déjà avec ce numéro WhatsApp. Connectez-vous, ou utilisez « Mot de passe oublié ».");

export const whatsappAuth = () =>
  ({
    id: "whatsapp-auth",
    // Les champs User.phoneNumber et User.phoneNumberVerified sont déclarés dans la configuration principale
    // (user.additionalFields) : ils servent aussi quand ce plugin est désactivé.
    endpoints: {
      whatsappSignUpStart: createAuthEndpoint("/whatsapp/sign-up/start", { method: "POST", body: z.object({ name: z.string(), phoneNumber: z.string(), password: z.string() }) }, async (ctx) => {
        const input = parseBody(z.object({ name: nameSchema, phoneNumber: phoneSchema, password: passwordSchema }), ctx.body);
        const name = input.name.replace(/\s+/g, " ");
        const issue = checkPassword(input.password, { name });
        if (issue) fail("BAD_REQUEST", "WEAK_PASSWORD", issue === "tooShort" ? texts.auth.fields.passwordTooShort : issue === "tooLong" ? texts.auth.fields.passwordTooLong : texts.auth.fields.passwordTooCommon);
        if (await prisma.user.findUnique({ where: { phoneNumber: input.phoneNumber }, select: { id: true } })) phoneTaken();
        const passwordHash = await ctx.context.password.hash(input.password);
        return ctx.json(await issueCode(ctx.context.secret, "SIGN_UP", input.phoneNumber, { name, passwordHash }, { forceNew: false }));
      }),

      whatsappSignUpResend: createAuthEndpoint("/whatsapp/sign-up/resend", { method: "POST", body: z.object({ phoneNumber: z.string() }) }, async (ctx) => {
        const { phoneNumber } = parseBody(z.object({ phoneNumber: phoneSchema }), ctx.body);
        const record = await findRecord("SIGN_UP", phoneNumber);
        if (!record?.passwordHash || !record.name) fail("NOT_FOUND", "NO_PENDING_SIGN_UP", "Votre inscription a expiré. Remplissez de nouveau le formulaire.");
        if (await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } })) phoneTaken();
        return ctx.json(await issueCode(ctx.context.secret, "SIGN_UP", phoneNumber, {}, { forceNew: true }));
      }),

      whatsappSignUpVerify: createAuthEndpoint(
        "/whatsapp/sign-up/verify",
        { method: "POST", body: z.object({ phoneNumber: z.string(), code: codeSchema, rememberMe: z.boolean().optional() }) },
        async (ctx) => {
          const { phoneNumber } = parseBody(z.object({ phoneNumber: phoneSchema }), { phoneNumber: ctx.body.phoneNumber });
          const pending = await findRecord("SIGN_UP", phoneNumber);
          if (pending?.consumedAt && (await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } }))) {
            fail("CONFLICT", "ALREADY_VERIFIED", "Votre numéro est déjà confirmé et votre compte est créé. Connectez-vous pour continuer.");
          }
          const record = await consumeCode(ctx.context.secret, "SIGN_UP", phoneNumber, ctx.body.code);
          if (!record.passwordHash || !record.name) {
            await releaseCode(record.id);
            fail("NOT_FOUND", "NO_PENDING_SIGN_UP", "Votre inscription a expiré. Remplissez de nouveau le formulaire.");
          }

          let user;
          try {
            user = await ctx.context.internalAdapter.createUser(
              { email: placeholderEmailFor(phoneNumber), name: record.name, emailVerified: false, phoneNumber, phoneNumberVerified: true },
              { method: "whatsapp" } as never,
            );
          } catch (error) {
            await releaseCode(record.id);
            if (await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } })) phoneTaken();
            ctx.context.logger.error("Création du compte WhatsApp impossible", error);
            fail("BAD_REQUEST", "CREATE_FAILED", texts.common.genericError);
          }
          if (!user) {
            await releaseCode(record.id);
            fail("BAD_REQUEST", "CREATE_FAILED", texts.common.genericError);
          }
          await ctx.context.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: record.passwordHash });
          // Le mot de passe haché ne sert plus : il n'est pas gardé dans la demande.
          await prisma.phoneVerification.update({ where: { id: record.id }, data: { passwordHash: null } });

          const session = await ctx.context.internalAdapter.createSession(user.id, ctx.body.rememberMe === false);
          if (!session) fail("BAD_REQUEST", "SESSION_FAILED", "Votre compte est créé. Connectez-vous pour continuer.");
          await setSessionCookie(ctx, { session, user }, ctx.body.rememberMe === false);
          return ctx.json({ ok: true, userId: user.id });
        },
      ),

      whatsappSignIn: createAuthEndpoint(
        "/whatsapp/sign-in",
        { method: "POST", body: z.object({ phoneNumber: z.string(), password: z.string(), rememberMe: z.boolean().optional() }) },
        async (ctx) => {
          const invalid = () => fail("UNAUTHORIZED", "INVALID_CREDENTIALS", "Numéro WhatsApp ou mot de passe incorrect.");
          const parsed = phoneSchema.safeParse(ctx.body.phoneNumber);
          if (!parsed.success || ctx.body.password.length > passwordMaxLength) invalid();
          const user = await ctx.context.adapter.findOne<{ id: string; email: string; name: string; emailVerified: boolean; createdAt: Date; updatedAt: Date }>({
            model: "user",
            where: [{ field: "phoneNumber", value: parsed.data! }],
          });
          const account = user ? await ctx.context.internalAdapter.findCredentialAccount(user.id) : null;
          // Même temps de réponse que le compte existe ou non (le hachage est toujours calculé).
          const valid = account?.password
            ? await ctx.context.password.verify({ hash: account.password, password: ctx.body.password })
            : (await ctx.context.password.hash(ctx.body.password), false);
          if (!user || !valid) invalid();
          const session = await ctx.context.internalAdapter.createSession(user!.id, ctx.body.rememberMe === false);
          if (!session) fail("BAD_REQUEST", "SESSION_FAILED", texts.common.genericError);
          await setSessionCookie(ctx, { session, user: user! }, ctx.body.rememberMe === false);
          return ctx.json({ ok: true });
        },
      ),

      whatsappPasswordStart: createAuthEndpoint("/whatsapp/password/start", { method: "POST", body: z.object({ phoneNumber: z.string() }) }, async (ctx) => {
        const { phoneNumber } = parseBody(z.object({ phoneNumber: phoneSchema }), ctx.body);
        const user = await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true, suspendedAt: true } });
        if (!user) fail("NOT_FOUND", "NO_ACCOUNT", "Aucun compte PrestAfrik n’utilise ce numéro WhatsApp. Vérifiez-le, ou créez un compte.");
        if (user.suspendedAt) fail("FORBIDDEN", "SUSPENDED", "L’accès à ce compte a été suspendu. Écrivez-nous pour en savoir plus.");
        return ctx.json(await issueCode(ctx.context.secret, "PASSWORD_RESET", phoneNumber, {}, { forceNew: false }));
      }),

      whatsappPasswordResend: createAuthEndpoint("/whatsapp/password/resend", { method: "POST", body: z.object({ phoneNumber: z.string() }) }, async (ctx) => {
        const { phoneNumber } = parseBody(z.object({ phoneNumber: phoneSchema }), ctx.body);
        if (!(await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true } }))) fail("NOT_FOUND", "NO_ACCOUNT", "Aucun compte PrestAfrik n’utilise ce numéro WhatsApp.");
        return ctx.json(await issueCode(ctx.context.secret, "PASSWORD_RESET", phoneNumber, {}, { forceNew: true }));
      }),

      whatsappPasswordReset: createAuthEndpoint(
        "/whatsapp/password/reset",
        { method: "POST", body: z.object({ phoneNumber: z.string(), code: codeSchema, newPassword: z.string() }) },
        async (ctx) => {
          const { phoneNumber, newPassword } = parseBody(z.object({ phoneNumber: phoneSchema, newPassword: passwordSchema }), ctx.body);
          const user = await prisma.user.findUnique({ where: { phoneNumber }, select: { id: true, name: true } });
          if (!user) fail("NOT_FOUND", "NO_ACCOUNT", "Aucun compte PrestAfrik n’utilise ce numéro WhatsApp.");
          const issue = checkPassword(newPassword, { name: user.name });
          if (issue) fail("BAD_REQUEST", "WEAK_PASSWORD", issue === "tooShort" ? texts.auth.fields.passwordTooShort : issue === "tooLong" ? texts.auth.fields.passwordTooLong : texts.auth.fields.passwordTooCommon);
          const record = await consumeCode(ctx.context.secret, "PASSWORD_RESET", phoneNumber, ctx.body.code);
          try {
            const hash = await ctx.context.password.hash(newPassword);
            const account = await ctx.context.internalAdapter.findCredentialAccount(user.id);
            if (account) await ctx.context.internalAdapter.updatePassword(user.id, hash);
            else await ctx.context.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });
            // Toutes les sessions ouvertes sont fermées, comme pour la réinitialisation par e-mail.
            await ctx.context.internalAdapter.deleteUserSessions(user.id);
            await prisma.user.update({ where: { id: user.id }, data: { phoneNumberVerified: true } });
          } catch (error) {
            await releaseCode(record.id);
            throw error;
          }
          return ctx.json({ ok: true });
        },
      ),

      whatsappDelivery: createAuthEndpoint(
        "/whatsapp/delivery",
        { method: "POST", body: z.object({ phoneNumber: z.string(), purpose: z.enum(["sign-up", "password"]) }) },
        async (ctx) => {
          const { phoneNumber } = parseBody(z.object({ phoneNumber: phoneSchema }), { phoneNumber: ctx.body.phoneNumber });
          const record = await findRecord(ctx.body.purpose === "sign-up" ? "SIGN_UP" : "PASSWORD_RESET", phoneNumber);
          return ctx.json({ status: record?.deliveryStatus ?? null });
        },
      ),
    },
    rateLimit: [
      { pathMatcher: (path: string) => path === "/whatsapp/sign-up/start" || path === "/whatsapp/password/start", window: 15 * 60, max: 10 },
      { pathMatcher: (path: string) => path.endsWith("/resend"), window: 15 * 60, max: 8 },
      { pathMatcher: (path: string) => path === "/whatsapp/sign-up/verify" || path === "/whatsapp/password/reset", window: 15 * 60, max: 30 },
      { pathMatcher: (path: string) => path === "/whatsapp/sign-in", window: 15 * 60, max: 20 },
      { pathMatcher: (path: string) => path === "/whatsapp/delivery", window: 60, max: 30 },
    ],
  }) satisfies BetterAuthPlugin;
