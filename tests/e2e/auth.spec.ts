import { expect, test } from "@playwright/test";

test("l’inscription reprend la maquette et affiche les champs requis", async ({ page }) => {
  await page.goto("/inscription");

  await expect(page.getByRole("heading", { name: "Crée ton compte" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ta boutique prend vie !" })).toBeVisible();
  await expect(page.getByLabel("Ton nom")).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
  await expect(page.getByLabel("Mot de passe (10 caractères minimum)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeVisible();
});

test("la connexion affiche le retour après réinitialisation du mot de passe", async ({ page }) => {
  await page.goto("/connexion?motDePasseModifie=1");

  await expect(page.getByRole("heading", { name: "Content de te revoir" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Ton mot de passe a été modifié. Tu peux te connecter.",
  );
  await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();
});

test("la connexion mobile envoie le formulaire et affiche une erreur compréhensible", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.route("**/api/auth/sign-in/email", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        }),
      }),
    );
    await page.goto("http://localhost:3000/connexion");
    await page.getByLabel("Adresse e-mail").fill("mobile-test@example.com");
    await page.getByLabel("Mot de passe").fill("mot-de-passe-invalide");
    await page.getByRole("button", { name: "Me connecter" }).tap();

    await expect(page.locator(".auth-form [role='alert']")).toHaveText(
      "Adresse e-mail ou mot de passe incorrect.",
    );
    await expect(page.getByRole("button", { name: "Me connecter" })).toBeEnabled();
    await expect(page.locator(".auth-layout")).toHaveCSS("grid-template-columns", "390px");
  } finally {
    await context.close();
  }
});

test("un formulaire sans JavaScript n’expose pas les identifiants dans l’URL", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  let submittedBody = "";
  try {
    const page = await context.newPage();
    await page.route("**/connexion", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      submittedBody = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>Formulaire reçu</body></html>",
      });
    });
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("no-js-test@example.com");
    await page.getByLabel("Mot de passe").fill("mot-de-passe-fictif");
    await page.getByRole("button", { name: "Me connecter" }).click();

    await expect(page).toHaveURL("http://localhost:3000/connexion");
    expect(submittedBody).toContain("email=no-js-test%40example.com");
    expect(submittedBody).toContain("password=mot-de-passe-fictif");
    expect(page.url()).not.toContain("mot-de-passe-fictif");
  } finally {
    await context.close();
  }
});
