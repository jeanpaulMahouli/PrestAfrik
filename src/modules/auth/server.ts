import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: true,
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
