// Enregistreur des animations du guide (public/guide/*.webp) : pilote la vraie application dans un
// téléphone de 400 × 817 px — l'écran exact du cadre « Aperçu avant publication », barre d'état déduite —
// prend une image à chaque geste et assemble le tout en WebP animé (lu en boucle, comme un GIF).
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

export const SCREEN = { width: 400, height: 817 };
const SCALE = 1.5;
const OUTPUT = resolve("public/guide");

// Doigt (rond gris translucide) qui se déplace, appuie et laisse une onde, comme dans les tutoriels.
const fingerScript = () => {
  const install = () => {
    if (document.getElementById("guide-finger")) return;
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
      #guide-finger { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 38px; height: 38px; margin: -19px 0 0 -19px;
        border-radius: 50%; background: rgb(20 20 40 / 0.28); box-shadow: 0 0 0 3px rgb(255 255 255 / 0.9), 0 4px 14px rgb(0 0 0 / 0.25);
        pointer-events: none; opacity: 0; transition: none; }
      #guide-finger.is-down { transform: scale(0.78); background: rgb(20 20 40 / 0.42); }
      #guide-finger-ripple { position: fixed; z-index: 2147483646; width: 76px; height: 76px; margin: -38px 0 0 -38px; border-radius: 50%;
        border: 3px solid rgb(255 153 0 / 0.75); pointer-events: none; opacity: 0; }
      * { caret-color: transparent !important; }`;
    document.head.append(style);
    const finger = document.createElement("div");
    finger.id = "guide-finger";
    const ripple = document.createElement("div");
    ripple.id = "guide-finger-ripple";
    document.body.append(finger, ripple);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

// Le tournage se fait en local : les adresses affichées (lien de la boutique, adresse web de l'assistant)
// montrent le vrai domaine, prestafrik.com, au lieu de « localhost:3100 ». Affichage seulement.
const publicAddressScript = (localHost) => {
  const swap = (text) => text.replaceAll(`http://${localHost}`, "https://prestafrik.com").replaceAll(localHost, "prestafrik.com");
  const fix = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeValue.includes(localHost)) node.nodeValue = swap(node.nodeValue);
    }
    for (const input of root.querySelectorAll?.("input") ?? []) {
      if (input.value.includes(localHost)) input.value = swap(input.value);
    }
  };
  const start = () => {
    fix(document.body);
    new MutationObserver(() => fix(document.body)).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
};

export async function launch({ baseURL, storageState }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    storageState,
    viewport: SCREEN,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    timezoneId: "Africa/Douala",
  });
  // Popup d'accueil et encart « Installer l'application » déjà vus : l'écran du film reste sur l'essentiel.
  await context.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      return key.startsWith("prestafrik-popup:") || key.startsWith("prestafrik:pwa-") ? "1" : original.call(this, key);
    };
  });
  await context.addInitScript(fingerScript);
  await context.addInitScript(publicAddressScript, new URL(baseURL).host);
  return { browser, context };
}

/** Un film : une suite d'images, chacune avec sa durée d'affichage. */
export class Clip {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.frames = [];
    this.finger = { x: SCREEN.width / 2, y: SCREEN.height * 0.7, visible: false };
  }

  async setFinger({ x, y, visible, down = false, ripple = 0 }) {
    await this.page.evaluate(
      ({ x, y, visible, down, ripple }) => {
        const finger = document.getElementById("guide-finger");
        const wave = document.getElementById("guide-finger-ripple");
        if (!finger || !wave) return;
        finger.style.left = `${x}px`;
        finger.style.top = `${y}px`;
        finger.style.opacity = visible ? "1" : "0";
        finger.classList.toggle("is-down", down);
        wave.style.left = `${x}px`;
        wave.style.top = `${y}px`;
        wave.style.opacity = ripple ? String(1 - ripple) : "0";
        wave.style.transform = `scale(${0.4 + ripple * 0.8})`;
      },
      { x, y, visible, down, ripple },
    );
  }

  /** Image de l'écran affichée `ms` millisecondes. */
  async snap(ms = 120) {
    const buffer = await this.page.screenshot({ animations: "allow", caret: "hide", scale: "device" });
    this.frames.push({ buffer, delay: ms });
  }

  async hold(ms) {
    await this.snap(ms);
  }

  /** Laisse la page se poser (chargement, animation) puis prend une image. */
  async settle(ms = 700, show = 900) {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.waitForTimeout(ms);
    await this.restoreFinger();
    await this.snap(show);
  }

  /** Après un changement de page, le doigt est recréé par le script d'initialisation : on le replace. */
  async restoreFinger() {
    await this.setFinger({ ...this.finger }).catch(() => {});
  }

  async moveTo(x, y, steps = 6) {
    const from = { ...this.finger };
    if (!from.visible) {
      from.x = Math.min(SCREEN.width - 30, x + 70);
      from.y = Math.min(SCREEN.height - 40, y + 140);
    }
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await this.setFinger({ x: from.x + (x - from.x) * ease, y: from.y + (y - from.y) * ease, visible: true });
      await this.snap(45);
    }
    this.finger = { x, y, visible: true };
  }

  async hideFinger() {
    this.finger.visible = false;
    await this.setFinger({ ...this.finger });
  }

  /** Amène l'élément à l'écran si besoin (défilement visible), et renvoie son centre. */
  async reveal(locator) {
    await locator.waitFor({ state: "visible", timeout: 60_000 });
    let box = await locator.boundingBox();
    if (!box) throw new Error(`${this.name} : élément sans position`);
    // Élément d'une barre fixe (barre du bas, en-tête, fenêtre) : toujours à l'écran, on ne fait pas défiler la page.
    const pinned = await locator.evaluate((element) => {
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const { position } = getComputedStyle(node);
        if (position === "fixed" || position === "sticky") return true;
      }
      return false;
    });
    const top = 120;
    const bottom = SCREEN.height - 130;
    const onScreen = box.y >= 0 && box.y + box.height <= SCREEN.height;
    if (!(pinned && onScreen) && (box.y < top || box.y + box.height > bottom)) {
      const delta = box.y + box.height / 2 - SCREEN.height * 0.5;
      await this.scrollBy(delta);
      box = await locator.boundingBox();
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  /** Défilement doux, filmé. */
  async scrollBy(delta, steps = 8) {
    const start = await this.page.evaluate(() => window.scrollY);
    const max = await this.page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(max, start + delta));
    if (Math.abs(target - start) < 4) return;
    const wasVisible = this.finger.visible;
    if (wasVisible) await this.hideFinger();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await this.page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), start + (target - start) * ease);
      await this.snap(55);
    }
    await this.page.waitForTimeout(250);
    await this.snap(250);
  }

  async scrollTo(locator) {
    await this.reveal(locator);
  }

  /** Touche un élément : déplacement du doigt, appui, onde, puis action. */
  async tap(locator, { after = 900, action } = {}) {
    const { x, y } = await this.reveal(locator);
    await this.moveTo(x, y);
    await this.snap(180);
    await this.setFinger({ x, y, visible: true, down: true, ripple: 0.05 });
    await this.snap(90);
    for (const ripple of [0.35, 0.7]) {
      await this.setFinger({ x, y, visible: true, down: true, ripple });
      await this.snap(60);
    }
    await this.setFinger({ x, y, visible: true, down: false, ripple: 0 });
    if (action) await action();
    else await locator.tap();
    await this.page.waitForTimeout(after);
    await this.waitIdle();
    await this.restoreFinger();
    await this.snap(500);
  }

  /** Attend la fin d'un chargement de page (le serveur de développement compile parfois longtemps). */
  async waitIdle() {
    await this.page.locator(".app-loading").waitFor({ state: "detached", timeout: 180_000 }).catch(() => {});
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.waitForTimeout(300);
  }

  /** Saisie lettre par lettre (une image toutes les quelques lettres). */
  async type(locator, text, { perFrame = 2, tapFirst = true } = {}) {
    if (tapFirst) await this.tap(locator, { after: 250 });
    await this.hideFinger();
    for (let i = 0; i < text.length; i += perFrame) {
      await locator.pressSequentially(text.slice(i, i + perFrame), { delay: 10 });
      await this.snap(70);
    }
    await this.snap(500);
  }

  async goto(path, show = 1100) {
    await this.page.goto(path, { waitUntil: "networkidle", timeout: 180_000 });
    await this.page.waitForTimeout(600);
    await this.restoreFinger();
    await this.snap(show);
  }

  /** Assemble le film : WebP animé en boucle, avec une pause finale. */
  async save() {
    await mkdir(OUTPUT, { recursive: true });
    if (!this.frames.length) throw new Error(`${this.name} : aucune image`);
    this.frames.at(-1).delay = Math.max(this.frames.at(-1).delay, 2200);
    const width = Math.round(SCREEN.width * SCALE);
    const height = Math.round(SCREEN.height * SCALE);
    const raws = await Promise.all(
      this.frames.map((frame) => sharp(frame.buffer).resize(width, height, { fit: "cover", position: "top" }).png().toBuffer()),
    );
    const file = resolve(OUTPUT, `${this.name}.webp`);
    await sharp(raws, { join: { animated: true } })
      .webp({ quality: 72, effort: 5, loop: 0, delay: this.frames.map((frame) => frame.delay), smartSubsample: true })
      .toFile(file);
    // Couleur de la barre d'état : le haut de la première image (en-tête de la page).
    const { data } = await sharp(this.frames[0].buffer).extract({ left: 4, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    const [r, g, b] = data;
    const total = this.frames.reduce((sum, frame) => sum + frame.delay, 0);
    console.log(`✓ ${this.name}.webp — ${this.frames.length} images, ${(total / 1000).toFixed(1)} s`);
    return { name: this.name, statusBar: `rgb(${r} ${g} ${b})`, dark: 0.299 * r + 0.587 * g + 0.114 * b < 150, duration: total };
  }
}
