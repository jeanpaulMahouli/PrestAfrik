// Contrôle de lisibilité des couleurs de boutique (WCAG 2.2 : 4,5:1 pour le texte).

const darkText = "#000026";
const lightText = "#FFFFFF";

function channel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Texte le plus lisible sur un fond : blanc ou bleu nuit. */
export function textColorFor(background: string) {
  return contrastRatio(background, darkText) >= contrastRatio(background, lightText) ? darkText : lightText;
}

export function colorReadability(background: string) {
  const text = textColorFor(background);
  const ratio = contrastRatio(background, text);
  return { text, ratio, readable: ratio >= 4.5, label: text === darkText ? "Texte foncé" : "Texte blanc" };
}
