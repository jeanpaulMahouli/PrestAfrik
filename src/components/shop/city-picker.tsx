"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { cameroonCities, shopCityCookie } from "@/config/marketplace";

const regions = [...new Set(cameroonCities.map((city) => city.region))];

/**
 * « Livrer à » : liste déroulante des grandes villes du Cameroun, rangées par région. La ville est
 * détectée automatiquement (réseau) quand c'est possible, et modifiable ici. Le choix est gardé dans un
 * cookie et la page est rechargée avec les boutiques de cette ville.
 */
export function CityPicker({ current, label = "Livrer à" }: { current: string | null; label?: string }) {
  return (
    <label className="shop-city">
      <MapPin aria-hidden="true" size={18} />
      <span aria-hidden="true" className="shop-city-text">
        <small>{label}</small>
        <strong>{current ?? "Tout le Cameroun"}</strong>
      </span>
      <ChevronDown aria-hidden="true" className="shop-city-chevron" size={16} />
      <span className="visually-hidden">{label} : votre ville</span>
      <select
        onChange={(event) => {
          document.cookie = `${shopCityCookie}=${encodeURIComponent(event.target.value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          window.location.reload();
        }}
        value={current ?? "CM"}
      >
        <option value="CM">Tout le Cameroun</option>
        {regions.map((region) => (
          <optgroup key={region} label={region}>
            {cameroonCities
              .filter((city) => city.region === region)
              .map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
