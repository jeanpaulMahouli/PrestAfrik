// Exporte les films du guide (public/guide/*.webp) dans le cadre d'iPhone de l'« Aperçu avant publication »,
// en GIF et en WebP animés, dans le dossier « extrait demo » (à partager : réseaux sociaux, WhatsApp, présentations).
//
//   node scripts/guide/export.mjs [nom-du-film …]
import { mkdir, readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";

const PHONE = { width: 430, height: Math.round((430 * 2217) / 1068) };
// Écran : zone transparente du cadre (mêmes marges que styles/phone-mockup.css).
const SCREEN = {
  left: Math.round(PHONE.width * 0.0356),
  top: Math.round(PHONE.height * 0.0131),
  right: Math.round(PHONE.width * (1 - 0.0328)),
  bottom: Math.round(PHONE.height * (1 - 0.0135)),
};
const STATUS_HEIGHT = 52;
const PADDING = 24;
const source = resolve("public/guide");
const output = resolve("extrait demo");
const meta = JSON.parse(await readFile(resolve("src/components/guide/clips.json"), "utf8"));

const screenWidth = SCREEN.right - SCREEN.left;
const screenHeight = SCREEN.bottom - SCREEN.top;
const pageHeight = screenHeight - STATUS_HEIGHT;

function statusBar(background, dark) {
  const color = dark ? "#fff" : "#111";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${STATUS_HEIGHT}">
    <rect width="100%" height="100%" fill="${background}"/>
    <text x="42" y="34" font-family="Poppins, Arial, sans-serif" font-size="15" font-weight="600" fill="${color}">9:41</text>
    <g transform="translate(${screenWidth - 30 - 72} 21)" fill="${color}">
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

const roundedMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="100%" height="100%" rx="58" ry="58"/></svg>`);
const frameImage = await sharp(resolve("public/landing/screens/cadre-iphone.webp")).resize(PHONE.width, PHONE.height).png().toBuffer();

async function exportClip(name) {
  const file = resolve(source, `${name}.webp`);
  const info = await sharp(file, { animated: true }).metadata();
  const { pages, delay = [] } = info;
  const bar = await sharp(statusBar(meta[name]?.statusBar ?? "#fff", meta[name]?.dark ?? false)).png().toBuffer();
  const width = PHONE.width + PADDING * 2;
  const height = PHONE.height + PADDING * 2;

  const frames = [];
  for (let page = 0; page < pages; page++) {
    const shot = await sharp(file, { page }).resize(screenWidth, pageHeight, { fit: "cover", position: "top" }).png().toBuffer();
    const screen = await sharp({ create: { width: screenWidth, height: screenHeight, channels: 4, background: "#ffffff" } })
      .composite([{ input: bar, top: 0, left: 0 }, { input: shot, top: STATUS_HEIGHT, left: 0 }, { input: roundedMask, blend: "dest-in" }])
      .png()
      .toBuffer();
    frames.push(
      await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
        .composite([
          { input: screen, top: PADDING + SCREEN.top, left: PADDING + SCREEN.left },
          { input: frameImage, top: PADDING, left: PADDING },
        ])
        .png()
        .toBuffer(),
    );
  }

  const delays = frames.map((_, index) => delay[index] ?? 100);
  await sharp(frames, { join: { animated: true } }).webp({ quality: 80, effort: 5, loop: 0, delay: delays }).toFile(resolve(output, `${name}.webp`));
  await sharp(frames, { join: { animated: true } }).gif({ loop: 0, delay: delays, colours: 128, effort: 7, dither: 0.6 }).toFile(resolve(output, `${name}.gif`));
  console.log(`✓ ${name} (${pages} images)`);
}

await mkdir(output, { recursive: true });
const only = process.argv.slice(2);
const names = (await readdir(source)).filter((file) => file.endsWith(".webp")).map((file) => basename(file, ".webp"));
for (const name of names) if (!only.length || only.includes(name)) await exportClip(name);
