import { expect, type Page } from "@playwright/test";

// Parcours de bout en bout sur la base de démonstration (npx tsx prisma/seed.ts, SEED_DEMO_PASSWORD).
export const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo-PrestAfrik-2026";
export const demoStore = "mboa-style";
export const demoVendor = "vendeur1@example.test";
export const demoAdmin = "admin@prestafrik.example.test";

/** Connexion par le formulaire ; le bouton reste désactivé tant que la page n'est pas prête. */
export async function signIn(page: Page, email: string, next = "/dashboard") {
  await page.goto(`/connexion?next=${encodeURIComponent(next)}`);
  // Les comptes de démonstration ont une adresse e-mail : la connexion par numéro WhatsApp est proposée d'abord.
  await page.getByRole("button", { name: "Adresse e-mail", exact: true }).click();
  const button = page.getByRole("button", { name: "Me connecter" });
  await expect(async () => {
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.locator("input[name=password]").fill(demoPassword);
    await expect(button).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 120_000 });
  await button.click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"), { timeout: 120_000, waitUntil: "commit" });
}

/** Considère le popup d’accueil comme déjà vu (il couvrirait la page pendant les autres tests). */
export async function skipWelcomePopup(page: Page) {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return key.startsWith("prestafrik-popup:") ? "1" : original.call(this, key);
    };
  });
}
