import { expect, test } from "@playwright/test";

// Les points d'accès WhatsApp sont simulés : ces tests vérifient l'interface, sans dépendre de Meta.
const codeRequest = {
  phoneNumber: "+237699112233",
  maskedPhone: "+237 6•• ••• •33",
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  resendAt: new Date(Date.now() + 60_000).toISOString(),
  sent: true,
};

test("l’inscription demande seulement le nom, le numéro WhatsApp et le mot de passe", async ({ page }) => {
  await page.goto("/inscription");

  await expect(page.getByRole("heading", { name: "Créez votre compte" })).toBeVisible();
  await expect(page.getByLabel("Nom complet")).toBeVisible();
  await expect(page.getByLabel("Numéro WhatsApp")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mot de passe" })).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
});

test("l’inscription signale les données invalides", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill("A");
  await page.getByLabel("Nom complet").blur();
  await page.getByLabel("Numéro WhatsApp").fill("12");
  await page.getByLabel("Numéro WhatsApp").blur();
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("123");
  await page.getByRole("textbox", { name: "Mot de passe" }).blur();

  await expect(page.getByText("Indiquez votre nom (2 à 80 caractères).")).toBeVisible();
  await expect(page.getByText(/trop court pour l’indicatif \+237/)).toBeVisible();
  await expect(page.getByText(/au moins 8 caractères/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
});

test("l’inscription envoie le code, signale un code faux puis crée le compte", async ({ page }) => {
  let verifyCalls = 0;
  await page.route("**/api/auth/whatsapp/sign-up/start", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(codeRequest) }));
  await page.route("**/api/auth/whatsapp/delivery", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "delivered" }) }));
  await page.route("**/api/auth/whatsapp/sign-up/verify", (route) => {
    verifyCalls += 1;
    return verifyCalls === 1
      ? route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "INVALID_CODE", message: "Code incorrect. Vérifiez le message WhatsApp et réessayez (encore 4 essais)." }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill("Awa Ngono");
  await page.getByLabel("Numéro WhatsApp").fill("699112233");
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("Mboa-Style-2026");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByText("+237 6•• ••• •33")).toBeVisible();
  await expect(page.getByRole("button", { name: /Renvoyer le code dans/ })).toBeDisabled();
  await page.getByLabel("Code reçu sur WhatsApp").fill("000000");
  await page.getByRole("button", { name: "Vérifier et créer mon compte" }).click();
  await expect(page.getByText(/Code incorrect/)).toBeVisible();

  await page.getByLabel("Code reçu sur WhatsApp").fill("123456");
  await page.getByRole("button", { name: "Vérifier et créer mon compte" }).click();
  await page.waitForURL(/\/boutiques\/nouvelle|\/connexion/);
});

test("la connexion affiche le retour après réinitialisation du mot de passe", async ({ page }) => {
  await page.goto("/connexion?motDePasseModifie=1");

  await expect(page.getByRole("heading", { name: "Ravis de vous revoir !" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Votre mot de passe a été modifié. Vous pouvez vous connecter.");
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();
});

test("la connexion mobile par WhatsApp affiche une erreur compréhensible", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.route("**/api/auth/whatsapp/sign-in", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "INVALID_CREDENTIALS", message: "Numéro WhatsApp ou mot de passe incorrect." }) }),
    );
    await page.goto(`${process.env.E2E_BASE_URL ?? "http://localhost:3000"}/connexion`);
    await page.getByLabel("Numéro WhatsApp").fill("699112233");
    await page.getByRole("textbox", { name: "Mot de passe" }).fill("mot-de-passe-invalide");
    await page.getByRole("button", { name: "Me connecter" }).tap();

    await expect(page.locator(".auth-form [role='alert']")).toHaveText("Numéro WhatsApp ou mot de passe incorrect.");
    await expect(page.getByRole("button", { name: "Me connecter" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  } finally {
    await context.close();
  }
});

test("la connexion par e-mail reste possible pour les anciens comptes", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }) }),
  );
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Adresse e-mail", exact: true }).click();
  await page.getByLabel("Adresse e-mail").fill("ancien-compte@example.test");
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("mot-de-passe-invalide");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.locator(".auth-form [role='alert']")).toHaveText("E-mail ou mot de passe incorrect.");
});
