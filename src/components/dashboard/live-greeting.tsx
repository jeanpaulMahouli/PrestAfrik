"use client";

import { useEffect, useState } from "react";
import { DayMomentIcon, greetingWord, momentOfHour, type DayMoment } from "./greeting";

/**
 * Salutation de l'accueil vendeur à l'heure de l'appareil du vendeur (Bonjour, Bon après-midi, Bonsoir),
 * recalculée chaque minute : elle change d'elle-même si la page reste ouverte. Le serveur fournit une
 * première valeur (heure d'Afrique centrale) en attendant le navigateur.
 */
export function LiveGreeting({ firstName, initial }: { firstName: string; initial: DayMoment }) {
  const [moment, setMoment] = useState(initial);

  useEffect(() => {
    const update = () => setMoment(momentOfHour(new Date().getHours()));
    update();
    const timer = window.setInterval(update, 60_000);
    // Retour sur l'onglet après une longue absence : mise à jour immédiate.
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <>
      <DayMomentIcon moment={moment} />
      {greetingWord(moment)} {firstName} !
    </>
  );
}
