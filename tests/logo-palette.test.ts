import { describe, expect, it } from "vitest";
import { colorReadability } from "../src/lib/contrast";
import { paletteFromPixels } from "../src/lib/logo-palette";

/** Image RGBA factice : liste de [couleur, nombre de pixels]. */
function pixels(parts: [[number, number, number, number], number][]) {
  const data: number[] = [];
  for (const [[r, g, b, a], count] of parts) for (let i = 0; i < count; i++) data.push(r, g, b, a);
  return data;
}

describe("logo palette", () => {
  it("takes the dominant vivid colour as primary and the logo's dark colour as secondary", () => {
    const palette = paletteFromPixels(pixels([[[255, 255, 255, 255], 2000], [[220, 30, 40, 255], 900], [[10, 20, 60, 255], 300], [[30, 160, 70, 255], 200]]));
    expect(palette).not.toBeNull();
    const { primaryColor, secondaryColor, accentColor } = palette!;
    // Rouge dominant (le blanc du fond est ignoré), bleu nuit en secondaire, vert en accent.
    expect(parseInt(primaryColor.slice(1, 3), 16)).toBeGreaterThan(150);
    expect(parseInt(secondaryColor.slice(5, 7), 16)).toBeGreaterThan(parseInt(secondaryColor.slice(1, 3), 16));
    expect(parseInt(accentColor.slice(3, 5), 16)).toBeGreaterThan(parseInt(accentColor.slice(1, 3), 16));
  });

  it("always returns colours that keep button text readable", () => {
    // Jaune très clair : illisible tel quel, il doit être assombri.
    const palette = paletteFromPixels(pixels([[[255, 240, 120, 255], 1000]]))!;
    expect(colorReadability(palette.primaryColor).readable).toBe(true);
    expect(colorReadability(palette.secondaryColor).readable).toBe(true);
  });

  it("builds a dark secondary from the primary when the logo has no dark colour", () => {
    const palette = paletteFromPixels(pixels([[[255, 153, 0, 255], 800]]))!;
    expect(colorReadability(palette.secondaryColor).text).toBe("#FFFFFF");
  });

  it("never repeats the dark secondary as accent", () => {
    // Logo rouge et bleu nuit, sans autre couleur : l'accent est dérivé du rouge, pas du bleu nuit.
    const palette = paletteFromPixels(pixels([[[255, 255, 255, 255], 1500], [[214, 40, 57, 255], 900], [[12, 28, 74, 255], 300]]))!;
    expect(palette.accentColor).not.toBe(palette.secondaryColor);
    expect(parseInt(palette.secondaryColor.slice(5, 7), 16)).toBeGreaterThan(parseInt(palette.secondaryColor.slice(1, 3), 16));
  });

  it("ignores transparent logos", () => {
    expect(paletteFromPixels(pixels([[[255, 0, 0, 0], 500]]))).toBeNull();
  });
});
