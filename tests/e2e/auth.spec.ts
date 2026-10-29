import { expect, test } from "@playwright/test";

// Les points d'accès de l'authentification sont simulés : ces tests vérifient l'interface.
const json = (status: number, body: unknown) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

async function fillSignUp(page: import("@playwright/test").Page) {
  await page.getByLabel("Votre nom").fill("Awa Ngono");
  await page.getByLabel("Adresse e-mail").fill("awa@example.test");
  await page.getByLabel("Numéro WhatsApp").fill("699112233");
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("Mboa-Style-2026");
  await page.getByRole("checkbox").check();
}

test("l’inscription demande le nom, l’e-mail, le numéro WhatsApp et le mot de passe", async ({ page }) => {
  await page.goto("/inscription");

  await expect(page.getByRole("heading", { name: "Créez votre compte" })).toBeVisible();
  await expect(page.getByLabel("Votre nom")).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
  await expect(page.getByLabel("Numéro WhatsApp")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mot de passe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
});

test("le numéro WhatsApp est obligatoire pour s’inscrire", async ({ page }) => {
  await page.goto("/inscription");
  await fillSignUp(page);
  await page.getByLabel("Numéro WhatsApp").fill("12");
  await page.getByLabel("Numéro WhatsApp").blur();

  await expect(page.getByText(/trop court pour l’indicatif \+237/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
  await expect(page.getByText(/Pour continuer : votre numéro WhatsApp/)).toBeVisible();
});

test("l’inscription envoie un code par e-mail, signale un code faux puis ouvre le tableau de bord", async ({ page }) => {
  let signUpBody: Record<string, unknown> = {};
  let verifyCalls = 0;
  await page.route("**/api/auth/sign-up/email", (route) => {
    signUpBody = route.request().postDataJSON();
    return route.fulfill(json(200, { token: null, user: { id: "u1", email: "awa@example.test", emailVerified: false } }));
  });
  await page.route("**/api/auth/email-otp/verify-email", (route) => {
    verifyCalls += 1;
    return route.fulfill(verifyCalls === 1 ? json(400, { code: "INVALID_OTP", message: "Invalid OTP" }) : json(200, { status: true, token: "t", user: {} }));
  });

  await page.goto("/inscription");
  await fillSignUp(page);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByText("awa@example.test")).toBeVisible();
  expect(signUpBody.phoneNumber).toBe("+237699112233");
  await expect(page.getByRole("button", { name: /Renvoyer le code dans/ })).toBeDisabled();

  await page.getByLabel("Code reçu par e-mail").fill("000000");
  await page.getByRole("button", { name: "Valider et terminer mon inscription" }).click();
  await expect(page.getByText("Code incorrect. Vérifiez l’e-mail reçu et réessayez.")).toBeVisible();

  await page.getByLabel("Code reçu par e-mail").fill("123456");
  await page.getByRole("button", { name: "Valider et terminer mon inscription" }).click();
  await page.waitForURL(/\/dashboard\?bienvenue=1|\/connexion/);
});

test("la connexion affiche le retour après réinitialisation du mot de passe", async ({ page }) => {
  await page.goto("/connexion?motDePasseModifie=1");

  await expect(page.getByRole("heading", { name: "Ravis de vous revoir !" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Votre mot de passe a été modifié. Vous pouvez vous connecter.");
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();
});

test("la connexion mobile affiche une erreur compréhensible", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.route("**/api/auth/sign-in/email", (route) => route.fulfill(json(401, { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" })));
    await page.goto(`${process.env.E2E_BASE_URL ?? "http://localhost:3000"}/connexion`);
    await page.getByLabel("Adresse e-mail").fill("mobile-test@example.test");
    await page.getByRole("textbox", { name: "Mot de passe" }).fill("mot-de-passe-invalide");
    await page.getByRole("button", { name: "Me connecter" }).tap();

    await expect(page.locator(".auth-form [role='alert']")).toHaveText("E-mail ou mot de passe incorrect.");
    await expect(page.getByRole("button", { name: "Me connecter" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  } finally {
    await context.close();
  }
});

test("un compte non confirmé reçoit un code à la connexion", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) => route.fulfill(json(403, { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" })));
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("ancien@example.test");
  await page.getByRole("textbox", { name: "Mot de passe" }).fill("mot-de-passe-valide");
  await page.getByRole("button", { name: "Me connecter" }).click();

  await expect(page.getByText(/Votre adresse e-mail n’est pas encore confirmée/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Valider et me connecter" })).toBeVisible();
});
