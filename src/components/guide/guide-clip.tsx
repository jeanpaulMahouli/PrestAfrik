"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { PhoneMockup } from "@/components/shared/phone-mockup";
import clips from "./clips.json";

export type ClipName = keyof typeof clips;

/**
 * Film du guide : la vraie interface, filmée sur téléphone (scripts/guide/capture.mjs), dans le même
 * cadre d'iPhone que l'« Aperçu avant publication ». L'image animée se lit en boucle, comme un GIF.
 */
export function GuideClip({ name, label }: { name: ClipName; label: string }) {
  const meta = clips[name];
  const [round, setRound] = useState(0);
  const seconds = Math.round(meta.duration / 1000);
  return (
    <figure className="guide-clip">
      <PhoneMockup maxWidth={340} statusBar={{ background: meta.statusBar, dark: meta.dark }}>
        {/* Recharger l'image la relance depuis la première image. */}
        <img alt={label} className="guide-clip-screen" decoding="async" key={round} loading="lazy" src={`/guide/${name}.webp${round ? `?r=${round}` : ""}`} />
      </PhoneMockup>
      <figcaption>
        <span>{label}</span>
        <button className="guide-replay" onClick={() => setRound((value) => value + 1)} type="button">
          <RotateCcw aria-hidden="true" size={15} /> Revoir ({seconds} s)
        </button>
      </figcaption>
    </figure>
  );
}
