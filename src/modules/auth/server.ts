import "server-only";

import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { texts } from "@/config/texts";
import { checkPassword, passwordMaxLength, passwordMinLength } from "@/modules/auth/password-policy";
import { getSmtpConfig } from "@/modules/email/config";
import { sendEmail, sendEmailQuietly } from "@/modules/email/server";
import { googleSignInEnabled } from "@/modules/auth/google";
import { whatsappAuth } from "@/modules/auth/whatsapp-plugin";
import { formatDate, formatTime } from "@/lib/format";

const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const shouldValidateProductionConfig = isProduction && !isProductionBuild;
const authSecret = process.env.BETTER_AUTH_SECRET;
const whatsappSignUpEnabled = process.env.WHATSAPP_SIGNUP_ENABLED === "true";
/** Durée de validité du code de confirmation envoyé par e-mail (10 minutes). */
const emailCodeTtlSeconds = 10 * 60;
// Connexion avec Google : active seulement quand les identifiants OAuth sont renseignés (docs/google-oauth.md).
const googleProvider = googleSignInEnabled()
  ? { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" as const }
  : null;
/** Points d'accès du plugin de code par e-mail inutilisés : connexion sans mot de passe, changement d'adresse… */
const disabledEmailOtpPaths = new Set([
  "/sign-in/email-otp",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
  "/email-otp/reset-password",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
  "/email-otp/create-verification-otp",
  "/email-otp/get-verification-otp",
]);
const unconfirmedSelect = { id: true, emailVerified: true, phoneNumberVerified: true, createdAt: true, _count: { select: { memberships: true } } } as const;

/**
 * Supprime une inscription jamais confirmée (aucun code saisi, aucune boutique, moins de 7 jours) pour
 * laisser recommencer. Renvoie false si le compte est réel : l'adresse ou le numéro est alors bien pris.
 */
async function releaseUnconfirmedAccount(user: { id: string; emailVerified: boolean; phoneNumberVerified: boolean; createdAt: Date; _count: { memberships: number } }) {
  const recent = Date.now() - user.createdAt.getTime() < 7 * 86_400_000;
  if (user.emailVerified || user.phoneNumberVerified || user._count.memberships > 0 || !recent) return false;
  return prisma.user.delete({ where: { id: user.id } }).then(() => true, () => false);
}

const authBaseUrl =
  process.env.BETTER_AUTH_URL ?? (isProduction ? "" : "http://localhost:3000");

function localDevelopmentOrigin(request?: Request) {
  if (isProduction || !request) return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    const octets = hostname.split(".").map(Number);
    const isPrivateIpv4 =
      octets.length === 4 &&
      octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
      (octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168));
    return isLocalhost || isPrivateIpv4 ? url.origin : null;
  } catch {
    return null;
  }
}

if (
  shouldValidateProductionConfig &&
  (!authSecret ||
    authSecret.length < 32 ||
    /^(?:replace-with|generate|set_|to_complete|your[-_])/i.test(authSecret))
) {
  throw new Error("BETTER_AUTH_SECRET doit contenir au moins 32 caractères en production.");
}

if (shouldValidateProductionConfig) {
  if (!authBaseUrl) {
    throw new Error("BETTER_AUTH_URL doit être configurée avec le domaine public HTTPS en production.");
  }
  let parsedAuthBaseUrl: URL;
  try {
    parsedAuthBaseUrl = new URL(authBaseUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL doit être une URL publique valide en production.");
  }
  if (
    parsedAuthBaseUrl.protocol !== "https:" ||
    parsedAuthBaseUrl.username ||
    parsedAuthBaseUrl.password ||
    parsedAuthBaseUrl.pathname !== "/" ||
    parsedAuthBaseUrl.search ||
    parsedAuthBaseUrl.hash ||
    ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(parsedAuthBaseUrl.hostname)
  ) {
    throw new Error("BETTER_AUTH_URL doit être l’origine HTTPS publique de l’application en production.");
  }
  getSmtpConfig();
}

export const auth = betterAuth({
  appName: "PrestAfrik",
  baseURL: authBaseUrl,
  trustedOrigins: async (request) => [
    authBaseUrl,
    localDevelopmentOrigin(request),
  ],
  secret: authSecret ?? "prestafrik-local-development-only-secret-0001",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  plugins: [
    // Inscription : code à 6 chiffres envoyé par e-mail pour confirmer l'adresse (remplace le lien de confirmation).
    emailOTP({
      otpLength: 6,
      expiresIn: emailCodeTtlSeconds,
      allowedAttempts: 5,
      storeOTP: "hashed",
      disableSignUp: true,
      overrideDefaultEmailVerification: true,
      rateLimit: { window: 60, max: 5 },
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "email-verification") return;
        const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });
        const firstName = user?.name.trim().split(/\s+/)[0] || email.split("@")[0];
        await sendEmail("E01", email, { prenom: firstName, code: otp });
      },
    }),
    // Inscription par numéro WhatsApp avec code envoyé par l'API Meta : désactivée pour le moment
    // (WHATSAPP_SIGNUP_ENABLED="true" pour la réactiver, voir docs/whatsapp-meta.md).
    ...(whatsappSignUpEnabled ? [whatsappAuth()] : []),
  ],
  user: {
    additionalFields: {
      // Numéro WhatsApp du vendeur : obligatoire à l'inscription par e-mail (contrôlé dans hooks.before).
      phoneNumber: { type: "string", required: false, unique: true, returned: true, input: true },
      phoneNumberVerified: { type: "boolean", required: false, returned: true, input: false, defaultValue: false },
    },
  },
  socialProviders: googleProvider ? { google: googleProvider } : {},
  account: {
    // Un compte Google dont l'adresse est déjà inscrite rejoint ce compte (adresse confirmée par Google).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    // « Rester connecté 30 jours » ; sans la case, le cookie disparaît à la fermeture du navigateur.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 20 },
      "/sign-up/email": { window: 15 * 60, max: 10 },
      "/request-password-reset": { window: 15 * 60, max: 5 },
      "/send-verification-email": { window: 15 * 60, max: 5 },
      "/email-otp/send-verification-otp": { window: 15 * 60, max: 6 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Compte suspendu par l'administration : aucune connexion possible, quel que soit le parcours.
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { suspendedAt: true } });
          if (user?.suspendedAt) {
            throw new APIError("FORBIDDEN", { message: "L’accès à ce compte a été suspendu. Écrivez-nous pour en savoir plus." });
          }
        },
      },
    },
  },
  hooks: {
    // Politique de mot de passe partagée (brief §6.1) et numéro WhatsApp : contrôlés côté serveur.
    before: createAuthMiddleware(async (ctx) => {
      if (disabledEmailOtpPaths.has(ctx.path)) throw new APIError("NOT_FOUND");
      const body = (ctx.body ?? {}) as { password?: unknown; newPassword?: unknown; email?: unknown; name?: unknown; phoneNumber?: unknown };

      if (ctx.path === "/sign-up/email" || ctx.path === "/reset-password") {
        const password = typeof body.password === "string" ? body.password : body.newPassword;
        const issue =
          typeof password === "string"
            ? checkPassword(password, { email: typeof body.email === "string" ? body.email : undefined, name: typeof body.name === "string" ? body.name : undefined })
            : null;
        if (issue === "tooCommon") throw new APIError("BAD_REQUEST", { message: texts.auth.fields.passwordTooCommon });
      }

      // Numéro WhatsApp : obligatoire à l'inscription, au format international, un seul compte par numéro.
      if (ctx.path === "/sign-up/email" || (ctx.path === "/update-user" && body.phoneNumber !== undefined)) {
        const raw = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
        const parsed = /^\+\d{8,15}$/.test(raw) ? parsePhoneNumberFromString(raw) : undefined;
        if (!parsed?.isValid()) throw new APIError("BAD_REQUEST", { code: "INVALID_PHONE", message: "Indiquez un numéro WhatsApp valide, avec l’indicatif du pays." });
        const phoneNumber = parsed.number;
        const session = ctx.path === "/update-user" ? await getSessionFromCtx(ctx) : null;
        if (ctx.path === "/sign-up/email") {
          // Nouvelle tentative (actualisation, adresse corrigée) : l'inscription non confirmée précédente est remplacée.
          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
          const sameEmail = email ? await prisma.user.findUnique({ where: { email }, select: unconfirmedSelect }) : null;
          if (sameEmail && !(await releaseUnconfirmedAccount(sameEmail))) {
            throw new APIError("CONFLICT", { code: "EMAIL_TAKEN", message: texts.auth.signUp.emailTaken });
          }
        }
        const owner = await prisma.user.findUnique({ where: { phoneNumber }, select: unconfirmedSelect });
        if (owner && owner.id !== session?.user.id && (ctx.path !== "/sign-up/email" || !(await releaseUnconfirmedAccount(owner)))) {
          throw new APIError("CONFLICT", { code: "PHONE_TAKEN", message: texts.auth.signUp.phoneTaken });
        }
        return { context: { body: { ...body, phoneNumber } } };
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: passwordMinLength,
    maxPasswordLength: passwordMaxLength,
    // L'inscription se termine par le code reçu par e-mail : pas de connexion avant (un nouveau code part alors).
    requireEmailVerification: true,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // E04 — lien de réinitialisation (60 minutes).
    sendResetPassword: async ({ user, url }) => {
      await sendEmail("E04", user.email, { email: user.email }, url);
    },
    // E05 — alerte de sécurité après le changement (les sessions sont déjà révoquées).
    onPasswordReset: async ({ user }) => {
      const now = new Date();
      await sendEmailQuietly("E05", user.email, { date: formatDate(now), heure: formatTime(now) }, `${authBaseUrl || "http://localhost:3000"}/connexion`);
    },
  },
  emailVerification: {
    // E01 — code de confirmation (plugin emailOTP ci-dessus), à l'inscription et à la connexion d'un compte non confirmé.
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    // E02 — bienvenue, une fois l'adresse confirmée.
    afterEmailVerification: async (user) => {
      const firstName = user.name?.trim().split(/\s+/)[0] || user.email.split("@")[0];
      await sendEmailQuietly("E02", user.email, { prenom: firstName }, `${authBaseUrl || "http://localhost:3000"}/boutiques/nouvelle`);
    },
  },
});
