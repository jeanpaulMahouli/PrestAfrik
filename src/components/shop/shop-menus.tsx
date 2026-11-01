"use client";

import { ChevronDown, LayoutList } from "lucide-react";
import { useEffect, useRef } from "react";

/** Budget sur téléphone : liste déroulante (les boutons de budget restent affichés sur ordinateur). */
export function BudgetSelect({ budgets }: { budgets: { label: string; href: string }[] }) {
  return (
    <label className="shop-budget-select">
      <span className="visually-hidden">Choisir un budget</span>
      <select
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) window.location.assign(event.target.value);
        }}
      >
        <option disabled value="">
          Choisir un budget
        </option>
        {budgets.map((budget) => (
          <option key={budget.href} value={budget.href}>
            {budget.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={16} />
    </label>
  );
}

/**
 * « Catégories » : liste déroulante en dernière position de la barre des rubriques. Se ferme au clic
 * à l'extérieur et avec Échap.
 */
export function CategoryMenu({ categories, active }: { categories: { slug: string; label: string; href: string }[]; active?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      const details = ref.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !details.contains(event.target as Node)) details.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  if (!categories.length) return null;
  const current = categories.find((category) => category.slug === active);

  return (
    <details className="shop-category-menu" ref={ref}>
      <summary aria-current={current ? "page" : undefined} className="shop-rubrique">
        <LayoutList aria-hidden="true" size={17} /> {current?.label ?? "Catégories"}
        <ChevronDown aria-hidden="true" className="shop-category-menu-chevron" size={15} />
      </summary>
      <ul>
        {categories.map((category) => (
          <li key={category.slug}>
            <a aria-current={category.slug === active ? "page" : undefined} href={category.href}>
              {category.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
