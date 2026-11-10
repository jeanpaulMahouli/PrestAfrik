// Enregistreur des démos « boutique publique » et « marketplace » : pilote les sites EN LIGNE
// (prestafrik-shop.prestafrik.com, shop.prestafrik.com) en version téléphone (doigt) et PC (curseur),
// puis assemble chaque film en GIF + WebP animés, dans un cadre d'iPhone ou une fenêtre de navigateur.
// Rien n'est jamais envoyé : aucune commande, aucun avis, aucun message.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

export const DEVICES = {
  telephone: { width: 400, height: 817, scale: 1.5, mobile: true },
  pc: { width: 1280, height: 720, scale: 1, mobile: false },
};

const pointerScript = (mobile) => {
  const install = () => {
    if (document.getElementById("demo-pointer")) return;
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
      #demo-pointer { position: fixed; z-index: 2147483647; left: 0; top: 0; pointer-events: none; opacity: 0; }
      #demo-pointer.finger { width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50%;
        background: rgb(20 20 40 / 0.28); box-shadow: 0 0 0 3px rgb(255 255 255 / 0.9), 0 4px 14px rgb(0 0 0 / 0.25); }
      #demo-pointer.finger.is-down { transform: scale(0.78); background: rgb(20 20 40 / 0.42); }
      #demo-pointer.cursor { width: 26px; height: 26px; margin: -2px 0 0 -4px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l15 11.5-6.6.9 3.9 7.3-2.9 1.5-3.9-7.4L4 20z' fill='%23111' stroke='%23fff' stroke-width='1.4' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center/contain;
        filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3)); }
      #demo-pointer.cursor.is-down { transform: scale(0.9); }
      #demo-ripple { position: fixed; z-index: 2147483646; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%;
        border: 3px solid rgb(255 153 0 / 0.8); pointer-events: none; opacity: 0; }
      * { caret-color: transparent !important; }`;
    document.head.append(style);
    const pointer = document.createElement("div");
    pointer.id = "demo-pointer";
    pointer.className = mobile ? "finger" : "cursor";
    const ripple = document.createElement("div");
    ripple.id = "demo-ripple";
    document.body.append(pointer, ripple);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

/** Contexte de navigation : `welcome` laisse la fenêtre d'accueil de la marketplace, `popup` celle de la boutique. */
export async function launch(deviceName, { welcome = false, popup = false } = {}) {
  const device = DEVICES[deviceName];
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    isMobile: device.mobile,
    hasTouch: device.mobile,
    locale: "fr-FR",
    timezoneId: "Africa/Douala",
    userAgent: device.mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  await context.addInitScript((popup) => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("prestafrik:pwa-") || key === "prestafrik:app-ouverte") return key === "prestafrik:app-ouverte" ? new Date().toISOString().slice(0, 10) : "1";
      if (!popup && key.startsWith("prestafrik-popup:")) return "1";
      return original.call(this, key);
    };
  }, popup);
  if (!welcome) await context.addCookies([{ name: "shop_univers", value: "vente", domain: "shop.prestafrik.com", path: "/" }]);
  await context.addInitScript(pointerScript, device.mobile);
  const page = await context.newPage();
  return { browser, context, page, device };
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export class Clip {
  constructor(page, device, name) {
    this.page = page;
    this.device = device;
    this.mobile = device.mobile;
    this.name = name;
    this.frames = [];
    this.pointer = { x: device.width / 2, y: device.height * 0.7, visible: false };
  }

  async setPointer({ x, y, visible, down = false, ripple = 0 }) {
    await this.page.evaluate(
      ({ x, y, visible, down, ripple }) => {
        const pointer = document.getElementById("demo-pointer");
        const wave = document.getElementById("demo-ripple");
        if (!pointer || !wave) return;
        pointer.style.left = `${x}px`;
        pointer.style.top = `${y}px`;
        pointer.style.opacity = visible ? "1" : "0";
        pointer.classList.toggle("is-down", down);
        wave.style.left = `${x}px`;
        wave.style.top = `${y}px`;
        wave.style.opacity = ripple ? String(1 - ripple) : "0";
        wave.style.transform = `scale(${0.4 + ripple * 0.8})`;
      },
      { x, y, visible, down, ripple },
    );
  }

  async snap(ms = 120) {
    const buffer = await this.page.screenshot({ animations: "allow", caret: "hide", scale: "device" });
    this.frames.push({ buffer, delay: ms, url: this.page.url() });
  }

  async hold(ms) {
    await this.snap(ms);
  }

  async restorePointer() {
    await this.setPointer({ ...this.pointer }).catch(() => {});
  }

  async waitIdle(ms = 500) {
    await this.page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await this.page.waitForTimeout(ms);
    await this.restorePointer();
  }

  async goto(url, show = 1300) {
    await this.page.goto(url, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => {});
    await this.page.waitForTimeout(900);
    await this.restorePointer();
    await this.snap(show);
  }

  async moveTo(x, y, steps = this.mobile ? 6 : 9) {
    const from = { ...this.pointer };
    if (!from.visible && this.mobile) {
      from.x = Math.min(this.device.width - 30, x + 70);
      from.y = Math.min(this.device.height - 40, y + 140);
    }
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await this.setPointer({ x: from.x + (x - from.x) * t, y: from.y + (y - from.y) * t, visible: true });
      await this.snap(40);
    }
    this.pointer = { x, y, visible: true };
    if (!this.mobile) await this.page.mouse.move(x, y);
  }

  async hidePointer() {
    if (!this.mobile) return; // sur PC le curseur reste à l'écran
    this.pointer.visible = false;
    await this.setPointer({ ...this.pointer });
  }

  /** Amène l'élément à l'écran (défilement filmé) et renvoie son centre. */
  async reveal(locator) {
    await locator.waitFor({ state: "visible", timeout: 60_000 });
    let box = await locator.boundingBox();
    if (!box) throw new Error(`${this.name} : élément sans position`);
    const pinned = await locator.evaluate((element) => {
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const { position } = getComputedStyle(node);
        if (position === "fixed" || position === "sticky") return true;
      }
      return false;
    });
    const top = this.mobile ? 120 : 90;
    const bottom = this.device.height - (this.mobile ? 130 : 60);
    const onScreen = box.y >= 0 && box.y + box.height <= this.device.height;
    if (!(pinned && onScreen) && (box.y < top || box.y + box.height > bottom)) {
      await this.scrollBy(box.y + box.height / 2 - this.device.height * 0.5);
      box = await locator.boundingBox();
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async scrollBy(delta, steps = 9) {
    const start = await this.page.evaluate(() => window.scrollY);
    const max = await this.page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(max, start + delta));
    if (Math.abs(target - start) < 4) return;
    if (this.pointer.visible) await this.hidePointer();
    for (let i = 1; i <= steps; i++) {
      await this.page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), start + (target - start) * ease(i / steps));
      await this.page.waitForTimeout(40);
      await this.snap(55);
    }
    await this.page.waitForTimeout(450);
    await this.snap(300);
  }

  /** Défile la page jusqu'à l'élément, sans geste. */
  async scrollTo(locator) {
    await this.reveal(locator);
    await this.hold(700);
  }

  async tap(locator, { after = 1200, action } = {}) {
    const { x, y } = await this.reveal(locator);
    await this.moveTo(x, y);
    await this.snap(200);
    await this.setPointer({ x, y, visible: true, down: true, ripple: 0.05 });
    await this.snap(90);
    for (const ripple of [0.35, 0.7]) {
      await this.setPointer({ x, y, visible: true, down: true, ripple });
      await this.snap(60);
    }
    await this.setPointer({ x, y, visible: true, down: false, ripple: 0 });
    if (action) await action();
    else if (this.mobile) await locator.tap();
    else await locator.click();
    await this.page.waitForTimeout(after);
    await this.waitIdle(300);
    await this.snap(600);
  }

  /** Survol (PC) : le curseur se pose sur l'élément sans cliquer. */
  async point(locator, show = 1200) {
    const { x, y } = await this.reveal(locator);
    await this.moveTo(x, y);
    if (!this.mobile) await locator.hover().catch(() => {});
    await this.page.waitForTimeout(300);
    await this.snap(show);
  }

  async type(locator, text, { perFrame = 2, tapFirst = true } = {}) {
    if (tapFirst) await this.tap(locator, { after: 300 });
    await this.hidePointer();
    for (let i = 0; i < text.length; i += perFrame) {
      await locator.pressSequentially(text.slice(i, i + perFrame), { delay: 10 });
      await this.snap(75);
    }
    await this.snap(500);
  }

  /** Assemble le film : téléphone dans un cadre d'iPhone, PC dans une fenêtre de navigateur. */
  async save(folder) {
    await mkdir(folder, { recursive: true });
    if (!this.frames.length) throw new Error(`${this.name} : aucune image`);
    this.frames.at(-1).delay = Math.max(this.frames.at(-1).delay, 2500);
    const framed = this.mobile ? await phoneFrames(this.frames) : await browserFrames(this.frames);
    const delay = this.frames.map((frame) => frame.delay);
    await sharp(framed, { join: { animated: true } }).webp({ quality: 78, effort: 5, loop: 0, delay }).toFile(resolve(folder, `${this.name}.webp`));
    await sharp(framed, { join: { animated: true } }).gif({ loop: 0, delay, colours: 128, effort: 7, dither: 0.6 }).toFile(resolve(folder, `${this.name}.gif`));
    const total = delay.reduce((sum, ms) => sum + ms, 0);
    console.log(`✓ ${this.mobile ? "téléphone" : "pc"}/${this.name} — ${this.frames.length} images, ${(total / 1000).toFixed(1)} s`);
  }
}

/* ---------- Cadre d'iPhone (mêmes mesures que scripts/guide/export.mjs) ---------- */
const PHONE = { width: 430, height: Math.round((430 * 2217) / 1068) };
const PHONE_SCREEN = {
  left: Math.round(PHONE.width * 0.0356),
  top: Math.round(PHONE.height * 0.0131),
  right: Math.round(PHONE.width * (1 - 0.0328)),
  bottom: Math.round(PHONE.height * (1 - 0.0135)),
};
const STATUS_HEIGHT = 52;
const PADDING = 24;

function statusBar(width, background, dark) {
  const color = dark ? "#fff" : "#111";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${STATUS_HEIGHT}">
    <rect width="100%" height="100%" fill="${background}"/>
    <text x="42" y="34" font-family="Poppins, Arial, sans-serif" font-size="15" font-weight="600" fill="${color}">9:41</text>
    <g transform="translate(${width - 30 - 72} 21)" fill="${color}">
      <rect height="4" rx="1" width="3" y="7"/><rect height="6" rx="1" width="3" x="5" y="5"/>
      <rect height="8.5" rx="1" width="3" x="10" y="2.5"/><rect height="11" rx="1" width="3" x="15"/>
      <g transform="translate(23 0)" fill="none" stroke="${color}" stroke-linecap="round" stroke-width="1.8">
        <path d="M1.5 4a9.5 9.5 0 0 1 13 0M4 6.8a5.7 5.7 0 0 1 8 0"/><circle cx="8" cy="9.4" fill="${color}" r="1.3" stroke="none"/>
      </g>
      <g transform="translate(44 -0.5)">
        <rect fill="none" height="11" opacity="0.45" rx="3.5" stroke="${color}" width="23" x="0.5" y="0.5"/>
        <rect height="8" rx="2" width="17" x="2" y="2"/><path d="M25 4v4c.8-.3 1.5-1.1 1.5-2S25.8 4.3 25 4Z" opacity="0.5"/>
      </g>
    </g>
  </svg>`);
}

async function topColor(buffer) {
  const { data } = await sharp(buffer).extract({ left: 4, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  return { color: `rgb(${r} ${g} ${b})`, dark: 0.299 * r + 0.587 * g + 0.114 * b < 150 };
}

async function phoneFrames(frames) {
  const screenWidth = PHONE_SCREEN.right - PHONE_SCREEN.left;
  const screenHeight = PHONE_SCREEN.bottom - PHONE_SCREEN.top;
  const pageHeight = screenHeight - STATUS_HEIGHT;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="100%" height="100%" rx="58" ry="58"/></svg>`);
  const frameImage = await sharp(resolve("public/landing/screens/cadre-iphone.webp")).resize(PHONE.width, PHONE.height).png().toBuffer();
  const width = PHONE.width + PADDING * 2;
  const height = PHONE.height + PADDING * 2;
  const out = [];
  for (const frame of frames) {
    const { color, dark } = await topColor(frame.buffer);
    const bar = await sharp(statusBar(screenWidth, color, dark)).png().toBuffer();
    const shot = await sharp(frame.buffer).resize(screenWidth, pageHeight, { fit: "cover", position: "top" }).png().toBuffer();
    const screen = await sharp({ create: { width: screenWidth, height: screenHeight, channels: 4, background: "#ffffff" } })
      .composite([{ input: bar, top: 0, left: 0 }, { input: shot, top: STATUS_HEIGHT, left: 0 }, { input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    out.push(
      await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
        .composite([
          { input: screen, top: PADDING + PHONE_SCREEN.top, left: PADDING + PHONE_SCREEN.left },
          { input: frameImage, top: PADDING, left: PADDING },
        ])
        .png()
        .toBuffer(),
    );
  }
  return out;
}

/* ---------- Fenêtre de navigateur (PC) ---------- */
const BAR = 46;
const WIN_PADDING = 20;
const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function browserBar(width, url) {
  // Application locale (scripts/demo-sites/parcours.mjs) : la barre affiche l'adresse publique.
  const shown = escapeXml(url.replace(/^http:\/\/localhost:3000/, "https://prestafrik.com").replace(/^https?:\/\//, "").replace(/\/$/, ""));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BAR}">
    <rect width="100%" height="100%" fill="#eef0f3"/>
    <circle cx="22" cy="23" r="6" fill="#ff5f57"/><circle cx="42" cy="23" r="6" fill="#febc2e"/><circle cx="62" cy="23" r="6" fill="#28c840"/>
    <g fill="none" stroke="#7a8089" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M96 17l-6 6 6 6"/><path d="M116 17l6 6-6 6"/>
    </g>
    <rect x="146" y="9" width="${width - 230}" height="28" rx="14" fill="#fff" stroke="#dde0e5"/>
    <g transform="translate(162 16)" fill="none" stroke="#4f8a5b" stroke-width="1.8"><rect x="0.9" y="6" width="10" height="8" rx="1.6"/><path d="M3 6V4a3 3 0 0 1 6 0v2"/></g>
    <text x="184" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#2b2f36">${shown}</text>
    <rect x="1" y="${BAR - 1}" width="${width}" height="1" fill="#d8dbe0"/>
  </svg>`);
}

async function browserFrames(frames) {
  const { width: w, height: h } = DEVICES.pc;
  const width = w + WIN_PADDING * 2;
  const height = h + BAR + WIN_PADDING * 2;
  const windowMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + BAR}"><rect width="100%" height="100%" rx="12" ry="12"/></svg>`);
  const shadow = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="s" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <rect x="${WIN_PADDING}" y="${WIN_PADDING + 4}" width="${w}" height="${h + BAR}" rx="12" fill="rgb(0 0 0 / 0.22)" filter="url(#s)"/></svg>`),
  ).png().toBuffer();
  const bars = new Map();
  const out = [];
  for (const frame of frames) {
    if (!bars.has(frame.url)) bars.set(frame.url, await sharp(browserBar(w, frame.url)).png().toBuffer());
    const win = await sharp({ create: { width: w, height: h + BAR, channels: 4, background: "#ffffff" } })
      .composite([{ input: bars.get(frame.url), top: 0, left: 0 }, { input: frame.buffer, top: BAR, left: 0 }, { input: windowMask, blend: "dest-in" }])
      .png()
      .toBuffer();
    out.push(
      await sharp({ create: { width, height, channels: 4, background: "#f4f5f7" } })
        .composite([{ input: shadow, top: 0, left: 0 }, { input: win, top: WIN_PADDING, left: WIN_PADDING }])
        .png()
        .toBuffer(),
    );
  }
  return out;
}
