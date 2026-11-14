import { describe, expect, it } from "vitest";
import { fuzzyRank, searchTokens } from "@/lib/fuzzy-search";

const products = [
  { name: "Ordinateur Portable DELL 5580", description: "Core i5, 8 Go" },
  { name: "Eau de parfum Kayali 50ml", description: null },
  { name: "Sneakers Nike", description: "Baskets blanches" },
  { name: "Robe de soirée sirène", description: "Paillettes" },
  { name: "Bijoux fantaisie", description: null },
  { name: "Écouteurs sans fil", description: "Bluetooth" },
];
const search = (query: string) => fuzzyRank(products, query, (item) => [{ text: item.name, weight: 1 }, { text: item.description, weight: 0.6 }]).map((item) => item.name);

describe("recherche tolérante", () => {
  it("ignore accents, majuscules, pluriels et mots vides", () => {
    expect(searchTokens("Les Robes de SOIRÉE")).toEqual(["robe", "soiree"]);
    expect(search("robes")).toEqual(["Robe de soirée sirène"]);
    expect(search("bijou")).toEqual(["Bijoux fantaisie"]);
    expect(search("ecouteur")).toEqual(["Écouteurs sans fil"]);
  });

  it("trouve un début de mot et tolère les fautes de frappe", () => {
    expect(search("ordi")).toContain("Ordinateur Portable DELL 5580");
    expect(search("parfun")).toEqual(["Eau de parfum Kayali 50ml"]);
    expect(search("ordinatuer")).toEqual(["Ordinateur Portable DELL 5580"]);
  });

  it("utilise les synonymes courants", () => {
    expect(search("pc")).toEqual(["Ordinateur Portable DELL 5580"]);
    expect(search("chaussures")).toEqual(["Sneakers Nike"]);
    expect(search("airpods")).toEqual(["Écouteurs sans fil"]);
  });

  it("ne renvoie rien quand rien ne correspond", () => {
    expect(search("voiture")).toEqual([]);
    expect(search("robe nike")).toEqual([]);
  });
});
