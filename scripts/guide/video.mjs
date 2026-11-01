// Convertit les films du guide (public/guide/*.webp animés) en vidéos WebM (VP9) : le guide peut ainsi
// mettre une illustration en pause. Utilise le ffmpeg installé avec Playwright (npx playwright install).
//
//   node scripts/guide/video.mjs [nom-du-film …]
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

const FPS = 25;
const source = resolve("public/guide");

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright"), join(homedir(), ".cache", "ms-playwright"), join(homedir(), "Library", "Caches", "ms-playwright")].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const folder of readdirSync(root).filter((name) => name.startsWith("ffmpeg")).sort().reverse()) {
      const binary = readdirSync(join(root, folder)).find((name) => name.startsWith("ffmpeg"));
      if (binary) return join(root, folder, binary);
    }
  }
  throw new Error("ffmpeg introuvable : lancez « npx playwright install » ou définissez FFMPEG.");
}

const ffmpeg = findFfmpeg();

async function convert(name) {
  const file = resolve(source, `${name}.webp`);
  const { pages, delay = [], width, pageHeight } = await sharp(file, { animated: true }).metadata();
  // Dimensions paires (exigence de l'encodeur).
  const outWidth = width - (width % 2);
  const outHeight = pageHeight - (pageHeight % 2);
  const encoder = spawn(
    ffmpeg,
    ["-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", resolve(source, `${name}.webm`)],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((ok, fail) => encoder.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg : code ${code}`)))));
  let frames = 0;
  for (let page = 0; page < pages; page++) {
    const jpeg = await sharp(file, { page }).resize(outWidth, outHeight, { fit: "cover", position: "top" }).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
    // Chaque image est répétée selon sa durée (cadence fixe de 25 images par seconde).
    const repeat = Math.max(1, Math.round((delay[page] ?? 100) / (1000 / FPS)));
    for (let i = 0; i < repeat; i++) {
      if (!encoder.stdin.write(jpeg)) await new Promise((ok) => encoder.stdin.once("drain", ok));
      frames++;
    }
  }
  encoder.stdin.end();
  await done;
  console.log(`✓ ${name}.webm (${(frames / FPS).toFixed(1)} s)`);
}

const only = process.argv.slice(2);
const names = (await readdir(source)).filter((file) => file.endsWith(".webp")).map((file) => basename(file, ".webp"));
for (const name of names) if (!only.length || only.includes(name)) await convert(name);
