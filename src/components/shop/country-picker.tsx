"use client";

import { ChevronDown, MapPin } from "lucide-react";

/**
 * Pays du visiteur sur la marketplace (nom du pays seul) : détecté à la connexion, modifiable ici. Le choix
 * est gardé dans un cookie (aucune donnée envoyée ailleurs) et la page est rechargée avec les boutiques de
 * ce pays. Le nom affiché et la flèche qui le suit couvrent une liste native invisible (accessible au clavier).
 */
export function CountryPicker({ current, countries, cookieName }: { current: string; countries: { iso: string; name: string }[]; cookieName: string }) {
  const name = countries.find((country) => country.iso === current)?.name ?? "Zone CEMAC";
  return (
    <label className="shop-country">
      <MapPin aria-hidden="true" size={15} />
      <span aria-hidden="true">{name}</span>
      <ChevronDown aria-hidden="true" className="shop-country-chevron" size={15} />
      <span className="visually-hidden">Votre pays</span>
      <select
        onChange={(event) => {
          document.cookie = `${cookieName}=${event.target.value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          window.location.reload();
        }}
        value={current}
      >
        <option value="CEMAC">Zone CEMAC</option>
        {countries.map((country) => (
          <option key={country.iso} value={country.iso}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}
