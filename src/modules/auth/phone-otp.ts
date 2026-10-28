import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Règles des codes à usage unique envoyés sur WhatsApp (inscription, mot de passe oublié).
// Module sans base de données : les décisions sont testées dans tests/phone-otp.test.ts.

export const otpLength = 6;
/** Durée de validité d'un code. */
export const otpTtlMs = 10 * 60_000;
/** Codes faux acceptés pour un même code ; au-delà, il faut en demander un nouveau. */
export const otpMaxAttempts = 5;
/** Délai minimum entre deux envois au même numéro. */
export const otpResendDelayMs = 60_000;
/** Codes envoyés au plus à un même numéro en 24 heures. */
export const otpMaxSendsPerWindow = 5;
export const otpSendWindowMs = 24 * 60 * 60_000;

export function generateOtp() {
  return String(randomInt(0, 10 ** otpLength)).padStart(otpLength, "0");
}

/** Empreinte du code : liée au numéro et à l'usage, jamais réversible sans le secret du serveur. */
export function hashOtp(secret: string, purpose: string, phoneNumber: string, code: string) {
  return createHmac("sha256", secret).update(`${purpose}:${phoneNumber}:${code}`).digest("hex");
}

export function otpMatches(secret: string, purpose: string, phoneNumber: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashOtp(secret, purpose, phoneNumber, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Saisie de l'utilisateur ramenée aux seuls chiffres (espaces et tirets tolérés). */
export function normalizeOtpInput(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

export type OtpRecord = {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  sendCount: number;
  windowStartedAt: Date;
  lastSentAt: Date;
  consumedAt: Date | null;
};

export type SendDecision =
  | { allowed: true; resetWindow: boolean }
  | { allowed: false; reason: "cooldown" | "daily-limit"; retryAfterSeconds: number };

/** Peut-on envoyer un nouveau code à ce numéro maintenant ? */
export function sendDecision(record: Pick<OtpRecord, "sendCount" | "windowStartedAt" | "lastSentAt"> | null, now: Date): SendDecision {
  if (!record) return { allowed: true, resetWindow: true };
  const sinceLast = now.getTime() - record.lastSentAt.getTime();
  if (sinceLast < otpResendDelayMs) {
    return { allowed: false, reason: "cooldown", retryAfterSeconds: Math.ceil((otpResendDelayMs - sinceLast) / 1000) };
  }
  const windowAge = now.getTime() - record.windowStartedAt.getTime();
  if (windowAge >= otpSendWindowMs) return { allowed: true, resetWindow: true };
  if (record.sendCount >= otpMaxSendsPerWindow) {
    return { allowed: false, reason: "daily-limit", retryAfterSeconds: Math.ceil((otpSendWindowMs - windowAge) / 1000) };
  }
  return { allowed: true, resetWindow: false };
}

export type VerifyOutcome = "ok" | "invalid" | "expired" | "used" | "too-many-attempts";

/** Résultat de la saisie d'un code (sans effet de bord : l'appelant enregistre la tentative). */
export function verifyOtp(record: OtpRecord, code: string, check: (code: string, hash: string) => boolean, now: Date): VerifyOutcome {
  if (record.consumedAt) return "used";
  if (record.attempts >= otpMaxAttempts) return "too-many-attempts";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return check(code, record.codeHash) ? "ok" : "invalid";
}

export function remainingAttempts(attemptsAfterFailure: number) {
  return Math.max(0, otpMaxAttempts - attemptsAfterFailure);
}

export function waitLabel(seconds: number) {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} heure${hours > 1 ? "s" : ""}`;
}
