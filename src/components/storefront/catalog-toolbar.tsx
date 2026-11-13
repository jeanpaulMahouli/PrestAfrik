"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "@/components/ui/icons";

export const sortOptions = [
  { value: "", label: "Les plus récents" },
  { value: "prix-croissant", label: "Prix croissant" },
  { value: "prix-decroissant", label: "Prix décroissant" },
  { value: "promotions", label: "Meilleures réductions" },
] as const;

/**
 * Barre du catalogue (maquette « Products Page ») : « Filtres » (catégories) et tri.
 * Chaque choix recharge la liste par l'adresse (?categorie=…&tri=…), la recherche en cours est gardée.
 */
export function CatalogToolbar({ categories }: { categories: { slug: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("vue");
    const query = next.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}#produits`, { scroll: false });
  };

  return (
    <div className="sf-toolbar">
      <div className="sf-toolbar-controls">
        {categories.length > 0 && (
          <label className="sf-select">
            <span className="visually-hidden">Filtrer par catégorie</span>
            <select onChange={(event) => update("categorie", event.target.value)} value={params.get("categorie") ?? ""}>
              <option value="">Filtres</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
            <SlidersHorizontal aria-hidden="true" size={22} />
          </label>
        )}
        <label className="sf-select">
          <span className="visually-hidden">Trier les produits</span>
          <select onChange={(event) => update("tri", event.target.value)} value={params.get("tri") ?? ""}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={18} />
        </label>
      </div>
    </div>
  );
}
