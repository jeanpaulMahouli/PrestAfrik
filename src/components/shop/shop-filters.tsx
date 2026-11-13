"use client";

import { CaretDown, SlidersHorizontal, X } from "@phosphor-icons/react/ssr";
import { useState, type ReactNode } from "react";

/**
 * Colonne des filtres de la page de résultats : toujours affichée sur ordinateur ; sur téléphone, un
 * bouton « Filtrer » l'ouvre au-dessus des résultats.
 */
export function FiltersPanel({ children, activeCount }: { children: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <aside aria-label="Filtres" className="sx-filters" data-open={open || undefined}>
      <button aria-expanded={open} className="sx-filters-toggle" onClick={() => setOpen((value) => !value)} type="button">
        {open ? <X aria-hidden="true" size={20} /> : <SlidersHorizontal aria-hidden="true" size={20} />}
        {open ? "Fermer les filtres" : "Filtrer"}
        {activeCount > 0 && !open && <span className="sx-filters-count">{activeCount}</span>}
      </button>
      <div className="sx-filters-body">{children}</div>
    </aside>
  );
}

/** Tri : liste déroulante qui ouvre la page triée. */
export function SortSelect({ options, current }: { options: { value: string; label: string; href: string }[]; current: string }) {
  return (
    <label className="sx-sort">
      <span>Trier par</span>
      <span className="sx-sort-field">
        <select
          defaultValue={current}
          onChange={(event) => {
            const option = options.find((item) => item.value === event.target.value);
            if (option) window.location.assign(option.href);
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown aria-hidden="true" size={14} />
      </span>
    </label>
  );
}
