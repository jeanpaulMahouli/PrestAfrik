import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { texts } from "@/config/texts";
import { checkPassword, passwordMaxLength, passwordMinLength } from "@/modules/auth/password-policy";
import { getSmtpConfig } from "@/modules/email/config";
import { sendTransactionalEmail } from "@/modules/email/server";

const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const shouldValidateProductionConfig = isProduction && !isProductionBuild;
const authSecret = process.env.BETTER_AUTH_SECRET;
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
    },
  },
  hooks: {
    // La politique de mot de passe partagée fait foi côté serveur (brief §6.1).
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" && ctx.path !== "/reset-password") return;
      const body = (ctx.body ?? {}) as { password?: unknown; newPassword?: unknown; email?: unknown; name?: unknown };
      const password = typeof body.password === "string" ? body.password : body.newPassword;
      if (typeof password !== "string") return;
      const issue = checkPassword(password, {
        email: typeof body.email === "string" ? body.email : undefined,
        name: typeof body.name === "string" ? body.name : undefined,
      });
      if (issue === "tooCommon") {
        throw new APIError("BAD_REQUEST", { message: texts.auth.fields.passwordTooCommon });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: passwordMinLength,
    maxPasswordLength: passwordMaxLength,
    // Le compte est utilisable avant la vérification ; la publication de boutique l'exige.
    requireEmailVerification: false,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Réinitialise ton mot de passe PrestAfrik",
        heading: "Réinitialise ton mot de passe",
        message: "Nous avons reçu une demande de réinitialisation du mot de passe de ton compte PrestAfrik.",
        actionLabel: "Choisir un nouveau mot de passe",
        actionUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Confirme ton adresse e-mail PrestAfrik",
        heading: `Bienvenue sur PrestAfrik${user.name ? `, ${user.name}` : ""} !`,
        message: "Confirme ton adresse e-mail pour terminer la création de ton compte PrestAfrik.",
        actionLabel: "Confirmer mon adresse e-mail",
        actionUrl: url,
      });
    },
  },
});
