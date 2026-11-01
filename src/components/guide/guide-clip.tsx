"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PhoneMockup } from "@/components/shared/phone-mockup";
import clips from "./clips.json";

export type ClipName = keyof typeof clips;

/**
 * Illustration du guide : la vraie interface, filmée sur téléphone (scripts/guide), dans le même cadre
 * d'iPhone que l'« Aperçu avant publication ». Vidéo WebM (pause et relecture possibles) ; image animée
 * en secours pour les navigateurs sans WebM. Lecture seulement quand l'illustration est à l'écran.
 */
export function GuideClip({ name, label }: { name: ClipName; label: string }) {
  const meta = clips[name];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webm, setWebm] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedByUser = useRef(false);

  useEffect(() => {
    setWebm(document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "");
  }, []);

  // Lecture quand l'illustration est visible, arrêt hors de l'écran (batterie et données mobiles).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !webm) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pausedByUser.current) void video.play().catch(() => setPaused(true));
        else if (!entry.isIntersecting) video.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [webm]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByUser.current = false;
      void video.play();
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    pausedByUser.current = false;
    video.currentTime = 0;
    void video.play();
  };

  return (
    <figure className="guide-clip">
      <PhoneMockup maxWidth={340} statusBar={{ background: meta.statusBar, dark: meta.dark }}>
        {webm ? (
          <video
            aria-label={label}
            className="guide-clip-screen"
            loop
            muted
            onClick={toggle}
            onPause={() => setPaused(true)}
            onPlay={() => setPaused(false)}
            playsInline
            preload="metadata"
            ref={videoRef}
            src={`/guide/${name}.webm`}
          />
        ) : (
          <img alt={label} className="guide-clip-screen" decoding="async" loading="lazy" src={`/guide/${name}.webp`} />
        )}
      </PhoneMockup>
      {webm && (
        <div className="guide-clip-controls">
          <button aria-label={paused ? "Lire l’illustration" : "Mettre l’illustration en pause"} className="guide-clip-button" onClick={toggle} title={paused ? "Lire" : "Pause"} type="button">
            {paused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
          </button>
          <button aria-label="Revoir depuis le début" className="guide-clip-button" onClick={replay} title="Revoir" type="button">
            <RotateCcw aria-hidden="true" size={18} />
          </button>
        </div>
      )}
    </figure>
  );
}
