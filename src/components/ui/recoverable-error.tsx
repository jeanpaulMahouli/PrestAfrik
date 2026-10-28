"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Écran d'erreur des espaces vendeur et de l'assistant (fichiers error.tsx). Coupure réseau pendant un
 * enregistrement, serveur momentanément indisponible : le vendeur est rassuré (sa saisie est gardée dans
 * l'onglet, voir use-form-persistence) et peut réessayer sans tout recommencer.
 */
export function RecoverableError({ error, retry, homeHref = "/dashboard" }: { error: unknown; retry: () => void; homeHref?: string }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="recoverable-error-title" className="v-card v-empty recoverable-error" role="alert">
      <h1 id="recoverable-error-title">{offline ? "Vous semblez hors connexion" : "La page n’a pas pu se charger"}</h1>
      <p>
        {offline
          ? "Vérifiez votre connexion internet (données mobiles ou Wi-Fi), puis réessayez."
          : "Le serveur n’a pas répondu à temps. Réessayez dans un instant."}{" "}
        Ce que vous aviez saisi est conservé sur cet appareil.
      </p>
      <div className="recoverable-error-actions">
        <button className="btn btn-primary" onClick={() => retry()} type="button">
          Réessayer
        </button>
        <Link className="btn btn-secondary" href={homeHref}>
          Retour à l’accueil
        </Link>
      </div>
    </section>
  );
}
