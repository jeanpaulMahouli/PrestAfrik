"use client";

import { Play, X } from "lucide-react";
import { useRef, useState } from "react";
import { LandingButton } from "./buttons";
import { demoVideo } from "./content";
import { demoVideoSource } from "./demo-video";

/**
 * « Voir la démo » : ouvre la vidéo de démonstration dans une fenêtre (élément <dialog> : Échap et focus gérés par le navigateur).
 * Sans vidéo configurée, le bouton reste un simple lien vers la démo sur téléphone (#demo).
 */
export function DemoVideoButton({ label, fallbackHref }: { label: string; fallbackHref: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);
  const source = demoVideoSource(demoVideo.url);

  if (!source) {
    return (
      <LandingButton href={fallbackHref} variant="secondary">
        {label}
      </LandingButton>
    );
  }

  const open = () => {
    setPlaying(true);
    dialogRef.current?.showModal();
  };
  // Fermer arrête la lecture : le lecteur est retiré de la page.
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button className="lp-btn lp-btn--secondary" onClick={open} type="button">
        <span>{label}</span>
        <Play aria-hidden="true" className="lp-video__play" size={18} />
      </button>
      <dialog
        aria-label={demoVideo.title}
        className="lp-video"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => setPlaying(false)}
        ref={dialogRef}
      >
        <button aria-label="Fermer la vidéo" className="lp-video__close" onClick={close} type="button">
          <X aria-hidden="true" size={22} />
        </button>
        <div className="lp-video__frame">
          {playing &&
            (source.kind === "iframe" ? (
              <iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen src={source.src} title={demoVideo.title} />
            ) : (
              <video autoPlay controls playsInline src={source.src}>
                <track kind="captions" />
              </video>
            ))}
        </div>
      </dialog>
    </>
  );
}
