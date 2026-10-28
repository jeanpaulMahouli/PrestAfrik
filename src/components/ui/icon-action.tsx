"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Boutons d'action réduits à une icône (liste des commandes). Chacun garde :
//   - un nom accessible complet (aria-label), lu par les lecteurs d'écran ;
//   - une infobulle au survol et au focus clavier (ordinateur) ;
//   - une courte légende sous l'icône sur les écrans tactiles, où le survol n'existe pas ;
//   - une zone cliquable d'au moins 44 × 44 px.

/** label : nom accessible complet ; hint : infobulle ; caption : légende courte des écrans tactiles. */
type IconActionProps = { label: string; hint: string; caption: string; icon: ReactNode; tone?: "primary" | "secondary" };

/** Lien icône (ex. « Voir la commande »). */
export function IconLink({ href, label, hint, caption, icon, tone = "secondary" }: IconActionProps & { href: string }) {
  return (
    <Link aria-label={label} className={`icon-action icon-action-${tone}`} data-tooltip={hint} href={href}>
      {icon}
      <span aria-hidden="true" className="icon-action-caption">{caption}</span>
    </Link>
  );
}

/** Bouton d'envoi icône : pendant l'envoi, roue de chargement et bouton désactivé (pas de double envoi). */
export function IconSubmit({ label, hint, caption, icon, pendingLabel, tone = "primary" }: IconActionProps & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button aria-busy={pending || undefined} aria-label={pending ? pendingLabel : label} className={`icon-action icon-action-${tone}`} data-tooltip={pending ? pendingLabel : hint} disabled={pending} type="submit">
      {pending ? <span aria-hidden="true" className="loading-spinner loading-spinner-inline" /> : icon}
      <span aria-hidden="true" className="icon-action-caption">{pending ? "…" : caption}</span>
    </button>
  );
}
