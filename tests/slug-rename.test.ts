import { describe, expect, it } from "vitest";
import { slugForRenamedStore } from "../src/modules/stores/slug-rename";

const takenSet = (...slugs: string[]) => async (slug: string) => slugs.includes(slug);

describe("store address after a rename", () => {
  it("follows the new name when the address is free", async () => {
    expect(await slugForRenamedStore("Mama Pagne", "ancienne-boutique", takenSet())).toEqual({ slug: "mama-pagne", base: "mama-pagne", suffixed: false, reason: null });
  });

  it("does nothing when the name gives the current address", async () => {
    expect(await slugForRenamedStore("Mama  Pagne", "mama-pagne", takenSet())).toBeNull();
  });

  it("adds a dash and a short id when another store already uses the address", async () => {
    const result = await slugForRenamedStore("Mama Pagne", "ancienne-boutique", takenSet("mama-pagne"), () => "k3f9a2");
    expect(result).toEqual({ slug: "mama-pagne-k3f9a2", base: "mama-pagne", suffixed: true, reason: "taken" });
  });

  it("adds an id to names reserved by PrestAfrik", async () => {
    const result = await slugForRenamedStore("Contact", "ma-boutique", takenSet(), () => "abc234");
    expect(result).toMatchObject({ slug: "contact-abc234", suffixed: true, reason: "reserved" });
  });

  it("tries another id if the first one is taken too", async () => {
    const ids = ["aaaaaa", "bbbbbb"];
    const result = await slugForRenamedStore("Mama Pagne", "x-shop", takenSet("mama-pagne", "mama-pagne-aaaaaa"), () => ids.shift()!);
    expect(result?.slug).toBe("mama-pagne-bbbbbb");
  });

  it("keeps the address within 40 characters", async () => {
    const result = await slugForRenamedStore("Une boutique au nom vraiment très très long pour tester", "x-shop", takenSet(slugifyLong()), () => "zzzzzz");
    expect(result!.slug.length).toBeLessThanOrEqual(40);
  });
});

function slugifyLong() {
  return "une-boutique-au-nom-vraiment-tres-tres";
}
