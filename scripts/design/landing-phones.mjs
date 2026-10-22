// Convertit les captures de téléphone (JPG sur fond blanc) en WebP détourés pour la section « Côté client ».
// Le blanc relié aux bords de l'image devient transparent ; l'écran, lui, n'est pas touché (il est entouré du cadre).
//
//   node scripts/design/landing-phones.mjs
import sharp from "sharp";

const source = "PrestAfrik maquettes UX UI/images utilisée pour la landing page";
// Noms distincts des anciennes captures (landing-shots.mjs) : aucun cache ne ressert l'ancienne image.
const targets = { 1: "telephone-1-boutique", 2: "telephone-2-detail", 3: "telephone-3-commande", 4: "telephone-4-suivi" };

for (const [index, name] of Object.entries(targets)) {
  const { data, info } = await sharp(`${source}/${index}.jpg`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const light = (i) => Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const outside = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  // Remplissage depuis les bords : on avance tant que le pixel est presque blanc.
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || light(i) < 235) continue;
    outside[i] = 1;
    const x = i % width;
    if (x > 0) stack.push(i - 1);
    if (x < width - 1) stack.push(i + 1);
    if (i >= width) stack.push(i - width);
    if (i < width * (height - 1)) stack.push(i + width);
  }
  for (let i = 0; i < width * height; i++) {
    if (outside[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    // Contour adouci : un pixel clair voisin du fond devient partiellement transparent.
    const x = i % width;
    const nearOutside = (x > 0 && outside[i - 1]) || (x < width - 1 && outside[i + 1]) || (i >= width && outside[i - width]) || (i < width * (height - 1) && outside[i + width]);
    if (nearOutside) data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(((255 - light(i)) / 120) * 255)));
  }
  const output = `public/landing/screens/${name}.webp`;
  await sharp(data, { raw: { width, height, channels: 4 } }).webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(output);
  console.log(`${index}.jpg → ${output}`);
}
