import { describe, expect, it } from "vitest";
import { greetingWord, momentOfHour } from "@/components/dashboard/greeting";

describe("salutation de l'accueil vendeur", () => {
  it("suit l'heure : Bonjour le matin, Bon après-midi, puis Bonsoir", () => {
    expect(greetingWord(momentOfHour(5))).toBe("Bonjour");
    expect(greetingWord(momentOfHour(11))).toBe("Bonjour");
    expect(greetingWord(momentOfHour(12))).toBe("Bon après-midi");
    expect(greetingWord(momentOfHour(17))).toBe("Bon après-midi");
    expect(greetingWord(momentOfHour(18))).toBe("Bonsoir");
    expect(greetingWord(momentOfHour(23))).toBe("Bonsoir");
    expect(greetingWord(momentOfHour(2))).toBe("Bonsoir");
  });
});
