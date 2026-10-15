// Ouvre un export de maquettes et décrit sa structure (étape 0 du brief).
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const file = resolve(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const failed = new Set();
page.on("requestfailed", (r) => failed.add(r.url().slice(0, 120)));
page.on("response", (r) => { if (r.status() >= 400) failed.add(`${r.status()} ${r.url().slice(0, 120)}`); });
await page.goto(pathToFileURL(file).href);
await page.waitForFunction(() => !document.getElementById("__bundler_loading"), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const frames = document.querySelectorAll("iframe").length;
  const sized = [...document.querySelectorAll("body *")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => [1280, 1440, 390, 720].includes(Math.round(r.width)) && r.height > 300);
  const roots = sized.filter(({ el }) => !sized.some((o) => o.el !== el && o.el.contains(el) && Math.round(o.r.width) === Math.round(el.getBoundingClientRect().width)));
  return {
    title: document.title,
    frames,
    bodyChildren: [...document.body.children].map((c) => `${c.tagName}#${c.id}.${c.className}`.slice(0, 80)),
    roots: roots.slice(0, 60).map(({ el, r }) => ({
      w: Math.round(r.width), h: Math.round(r.height),
      tag: el.tagName, cls: String(el.className).slice(0, 60),
      label: (el.getAttribute("data-name") || el.getAttribute("aria-label") || el.previousElementSibling?.textContent || "").slice(0, 80),
      text: el.innerText.slice(0, 80).replace(/\s+/g, " "),
    })),
  };
});
console.log(JSON.stringify(info, null, 1));
console.log("FAILED", [...failed]);
await browser.close();
