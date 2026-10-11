import { describe, expect, it } from "vitest";
import { getSmtpConfig } from "../src/modules/email/config";

const smtpEnvironment = {
  SMTP_HOST: "smtp.example.cm",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "prestafrik",
  SMTP_PASSWORD: "a-test-password",
  SMTP_FROM: "PrestAfrik <no-reply@example.cm>",
};

describe("configuration SMTP", () => {
  it("lit les paramètres SMTP et convertit le port et le chiffrement", () => {
    expect(getSmtpConfig(smtpEnvironment)).toEqual({
      host: "smtp.example.cm",
      port: 587,
      secure: false,
      user: "prestafrik",
      password: "a-test-password",
      from: "PrestAfrik <no-reply@example.cm>",
    });
  });

  it("accepte TLS implicite sur le port 465", () => {
    expect(getSmtpConfig({ ...smtpEnvironment, SMTP_PORT: "465", SMTP_SECURE: "true" })).toMatchObject({
      port: 465,
      secure: true,
    });
  });

  it("refuse une configuration incomplète sans inclure le mot de passe dans l’erreur", () => {
    expect(() => getSmtpConfig({ SMTP_PASSWORD: "sensitive-test-value" })).toThrow(
      "Configuration SMTP absente ou invalide",
    );
    try {
      getSmtpConfig({ SMTP_PASSWORD: "sensitive-test-value" });
    } catch (error) {
      expect(String(error)).not.toContain("sensitive-test-value");
    }
  });

  it("refuse un port ou un mode TLS invalide", () => {
    expect(() => getSmtpConfig({ ...smtpEnvironment, SMTP_PORT: "70000" })).toThrow(
      "SMTP_PORT",
    );
    expect(() => getSmtpConfig({ ...smtpEnvironment, SMTP_SECURE: "yes" })).toThrow(
      "SMTP_SECURE",
    );
  });

  it("ne considère pas un exemple de configuration comme SMTP prêt", () => {
    expect(() =>
      getSmtpConfig({
        ...smtpEnvironment,
        SMTP_HOST: "smtp.your-provider.example",
        SMTP_USER: "your-sender-account",
        SMTP_PASSWORD: "SET_IN_HOST_SECRET_MANAGER",
        SMTP_FROM: "PrestAfrik <no-reply@your-domain.cm>",
      }),
    ).toThrow("Configuration SMTP absente ou invalide");
  });
});
