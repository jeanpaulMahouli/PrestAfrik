import { describe, expect, it } from "vitest";
import {
  generateOtp,
  hashOtp,
  normalizeOtpInput,
  otpMatches,
  otpMaxAttempts,
  otpMaxSendsPerWindow,
  otpResendDelayMs,
  otpSendWindowMs,
  otpTtlMs,
  remainingAttempts,
  sendDecision,
  verifyOtp,
  waitLabel,
  type OtpRecord,
} from "../src/modules/auth/phone-otp";
import { accountContact, formatPhoneForDisplay, isAccountVerified, isPlaceholderEmail, placeholderEmailFor } from "../src/modules/auth/phone-account";

const secret = "secret-de-test-assez-long-pour-hmac";
const phone = "+237699000042";
const now = new Date("2026-10-28T10:00:00Z");

function record(overrides: Partial<OtpRecord> = {}): OtpRecord {
  return {
    codeHash: hashOtp(secret, "SIGN_UP", phone, "123456"),
    expiresAt: new Date(now.getTime() + otpTtlMs),
    attempts: 0,
    sendCount: 1,
    windowStartedAt: now,
    lastSentAt: now,
    consumedAt: null,
    ...overrides,
  };
}

const check = (code: string, hash: string) => otpMatches(secret, "SIGN_UP", phone, code, hash);

describe("codes à usage unique", () => {
  it("génère toujours 6 chiffres", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("lie l'empreinte au numéro et à l'usage", () => {
    const hash = hashOtp(secret, "SIGN_UP", phone, "123456");
    expect(hash).not.toContain("123456");
    expect(otpMatches(secret, "SIGN_UP", phone, "123456", hash)).toBe(true);
    expect(otpMatches(secret, "PASSWORD_RESET", phone, "123456", hash)).toBe(false);
    expect(otpMatches(secret, "SIGN_UP", "+237699000043", "123456", hash)).toBe(false);
    expect(otpMatches("autre-secret", "SIGN_UP", phone, "123456", hash)).toBe(false);
  });

  it("accepte les espaces et tirets dans la saisie", () => {
    expect(normalizeOtpInput(" 123 456 ")).toBe("123456");
    expect(normalizeOtpInput("123-456")).toBe("123456");
    expect(normalizeOtpInput("12345")).toBeNull();
    expect(normalizeOtpInput("12a456")).toBeNull();
  });

  it("code correct, incorrect, expiré, déjà utilisé, trop d'essais", () => {
    expect(verifyOtp(record(), "123456", check, now)).toBe("ok");
    expect(verifyOtp(record(), "654321", check, now)).toBe("invalid");
    expect(verifyOtp(record({ expiresAt: new Date(now.getTime() - 1) }), "123456", check, now)).toBe("expired");
    expect(verifyOtp(record({ consumedAt: now }), "123456", check, now)).toBe("used");
    expect(verifyOtp(record({ attempts: otpMaxAttempts }), "123456", check, now)).toBe("too-many-attempts");
    expect(remainingAttempts(otpMaxAttempts - 1)).toBe(1);
    expect(remainingAttempts(otpMaxAttempts + 3)).toBe(0);
  });

  it("impose un délai entre deux envois et une limite par 24 h", () => {
    expect(sendDecision(null, now)).toEqual({ allowed: true, resetWindow: true });
    const soon = sendDecision(record(), new Date(now.getTime() + 10_000));
    expect(soon).toEqual({ allowed: false, reason: "cooldown", retryAfterSeconds: (otpResendDelayMs - 10_000) / 1000 });
    expect(sendDecision(record(), new Date(now.getTime() + otpResendDelayMs))).toEqual({ allowed: true, resetWindow: false });
    const limited = record({ sendCount: otpMaxSendsPerWindow, lastSentAt: new Date(now.getTime() - otpResendDelayMs) });
    expect(sendDecision(limited, now)).toMatchObject({ allowed: false, reason: "daily-limit" });
    expect(sendDecision(limited, new Date(now.getTime() + otpSendWindowMs))).toEqual({ allowed: true, resetWindow: true });
  });

  it("formule les délais d'attente", () => {
    expect(waitLabel(1)).toBe("1 seconde");
    expect(waitLabel(45)).toBe("45 secondes");
    expect(waitLabel(61)).toBe("2 minutes");
    expect(waitLabel(5000)).toBe("2 heures");
  });
});

describe("comptes WhatsApp", () => {
  it("utilise une adresse technique jamais affichée", () => {
    const email = placeholderEmailFor(phone);
    expect(email).toBe("237699000042@whatsapp.prestafrik.invalid");
    expect(isPlaceholderEmail(email)).toBe(true);
    expect(isPlaceholderEmail("awa@example.com")).toBe(false);
    expect(accountContact({ email, emailVerified: false, phoneNumber: phone, phoneNumberVerified: true })).toBe("+237 699 00 00 42");
    expect(accountContact({ email: "awa@example.com", emailVerified: true })).toBe("awa@example.com");
  });

  it("considère le compte confirmé par le numéro ou par l'e-mail", () => {
    expect(isAccountVerified({ email: "x", emailVerified: false, phoneNumberVerified: true })).toBe(true);
    expect(isAccountVerified({ email: "x", emailVerified: true, phoneNumberVerified: false })).toBe(true);
    expect(isAccountVerified({ email: "x", emailVerified: false, phoneNumberVerified: false })).toBe(false);
  });

  it("présente les numéros lisiblement", () => {
    expect(formatPhoneForDisplay("+33612345678")).toBe("+33 6 12 34 56 78");
  });
});
