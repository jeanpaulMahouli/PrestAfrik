"use client";

import { CaretDown, Check, MapPin } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";
import { useMenuTop } from "./use-menu-top";
import { cameroonCities, shopCityCookie } from "@/config/marketplace";

const regions = [...new Set(cameroonCities.map((city) => city.region))];

function choose(value: string) {
  document.cookie = `${shopCityCookie}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}

/**
 * « Livrer à » : menu déroulant (même style que celui des univers) avec les grandes villes du Cameroun,
 * rangées par région. La ville est détectée automatiquement quand c'est possible, et modifiable ici. Le
 * choix est gardé dans un cookie et la page est rechargée avec les boutiques de cette ville.
 */
export function CityPicker({ current, label = "Livrer à" }: { current: string | null; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useMenuTop(open);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const option = (value: string, text: string, selected: boolean) => (
    <li key={value}>
      <button aria-current={selected ? "true" : undefined} onClick={() => (selected ? setOpen(false) : choose(value))} type="button">
        <span>{text}</span>
        {selected && <Check aria-hidden="true" className="sx-universe-check" size={16} />}
      </button>
    </li>
  );

  return (
    <div className="sx-universe sx-city" ref={ref}>
      <button aria-controls="sx-city-list" aria-expanded={open} aria-label={`${label} : ${current ?? "Tout le Cameroun"}`} className="sx-universe-button sx-city-button" onClick={() => setOpen((value) => !value)} ref={buttonRef} type="button">
        <MapPin aria-hidden="true" size={20} />
        <span className="sx-city-text">
          <small>{label}</small>
          <strong>{current ?? "Tout le Cameroun"}</strong>
        </span>
        <CaretDown aria-hidden="true" className="sx-caret" size={14} />
      </button>
      <div className="sx-universe-list sx-city-list" hidden={!open} id="sx-city-list">
        <ul>{option("CM", "Tout le Cameroun", !current)}</ul>
        {regions.map((region) => (
          <div key={region}>
            <p className="sx-city-region">{region}</p>
            <ul>
              {cameroonCities
                .filter((city) => city.region === region)
                .map((city) => option(city.name, city.name, current === city.name))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
