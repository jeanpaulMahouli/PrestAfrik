import { colorReadability } from "@/lib/contrast";

// Couleurs de boutique tirées du logo (pipette automatique) : principale = couleur vive dominante,
// secondaire = couleur foncée du logo (ou version foncée de la principale), accent = autre teinte vive.
// Chaque couleur est ajustée pour rester lisible (même contrôle que le formulaire, WCAG 4,5:1).

export type StorePalette = { primaryColor: string; secondaryColor: string; accentColor: string };

type Hsl = { h: number; s: number; l: number };

function toHsl(r: number, g: number, b: number): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function toHex({ h, s, l }: Hsl) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

/** Assombrit (ou éclaircit) progressivement jusqu'à obtenir un texte lisible sur la couleur. */
function readable(color: Hsl): string {
  let current = { ...color };
  for (let i = 0; i < 20 && !colorReadability(toHex(current)).readable; i++) {
    current = { ...current, l: Math.max(0.05, current.l - 0.04) };
  }
  return toHex(current);
}

/**
 * Palette à partir des pixels RGBA d'un logo (ImageData.data). Renvoie null si le logo
 * n'a pas assez de pixels opaques (logo vide ou entièrement transparent).
 */
export function paletteFromPixels(data: ArrayLike<number>): StorePalette | null {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // Regroupement par teintes proches (4 bits par canal).
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const colors = [...buckets.values()]
    .map((bucket) => ({ count: bucket.count, hsl: toHsl(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count) }))
    .sort((a, b) => b.count - a.count);
  const total = colors.reduce((sum, color) => sum + color.count, 0);
  if (total < 20) return null;

  // Couleurs vives : ni grises, ni presque blanches, ni presque noires ; pondérées par la saturation.
  const vivid = colors
    .filter(({ hsl }) => hsl.s >= 0.25 && hsl.l > 0.12 && hsl.l < 0.88)
    .map((color) => ({ ...color, score: color.count * (0.5 + color.hsl.s) }))
    .sort((a, b) => b.score - a.score);
  const dark = colors.filter(({ hsl, count }) => hsl.l < 0.3 && count / total > 0.02);

  const primary = vivid[0]?.hsl ?? dark[0]?.hsl ?? colors[0].hsl;
  // Secondaire : la couleur foncée du logo s'il en a une, sinon une version foncée de la principale.
  const secondary = (dark[0] && dark[0].hsl !== primary ? dark[0].hsl : null) ?? { h: primary.h, s: Math.min(primary.s, 0.6), l: 0.16 };
  // Accent : autre teinte vive, assez claire pour se distinguer de la secondaire (souvent foncée).
  const accent = vivid.find(({ hsl }) => hsl !== secondary && hsl.l >= 0.3 && hueDistance(hsl.h, primary.h) > 30)?.hsl ?? { h: (primary.h + 25) % 360, s: Math.max(primary.s, 0.5), l: Math.min(0.62, primary.l + 0.1) };

  return { primaryColor: readable(primary), secondaryColor: readable(secondary), accentColor: toHex(accent) };
}

/** Charge l'image (fichier choisi ou logo enregistré) et en tire la palette, dans le navigateur. */
export function paletteFromImage(src: string): Promise<StorePalette | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, size, size);
        resolve(paletteFromPixels(context.getImageData(0, 0, size, size).data));
      } catch {
        // Image d'une autre origine sans autorisation de lecture : on garde les couleurs actuelles.
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
