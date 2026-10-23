"use client";

import { Clock } from "lucide-react";
import { useId, useState } from "react";
import { demoPage, type DemoVideo } from "./content";
import { demoVideoSource, youtubeThumbnail } from "./demo-video";

/** Bouton lecture de la maquette : anneau blanc et triangle. */
function PlayButton() {
  return (
    <svg aria-hidden="true" className="lp-player__play" viewBox="0 0 120 120">
      <circle cx="60" cy="60" fill="rgba(0,0,0,0.18)" r="54" stroke="#fff" strokeWidth="8" />
      <path d="M50 38 84 60 50 82Z" fill="#fff" />
    </svg>
  );
}

/** Lecteur : image d'attente assombrie + bouton lecture, puis la vidéo dans le cadre (lecture automatique). */
function Player({ video, playing, onPlay }: { video: DemoVideo; playing: boolean; onPlay: () => void }) {
  const source = demoVideoSource(video.url);
  const poster = video.poster ?? youtubeThumbnail(video.url);

  if (!source) {
    return (
      <div className="lp-player__frame lp-player__frame--soon">
        <Clock aria-hidden="true" size={40} strokeWidth={1.6} />
        <p className="lp-player__soon-title">{video.label}</p>
        <p>Vidéo bientôt disponible. En attendant, regardez « {demoPage.videos[0].label} ».</p>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="lp-player__frame">
        {source.kind === "iframe" ? (
          <iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen src={source.src} title={video.title} />
        ) : (
          <video
            autoPlay
            onClick={(event) => (event.currentTarget.paused ? void event.currentTarget.play() : event.currentTarget.pause())}
            playsInline
            src={source.src}
          >
            <track kind="captions" />
          </video>
        )}
      </div>
    );
  }

  return (
    <button aria-label={`Lire la vidéo : ${video.title}`} className="lp-player__frame lp-player__cover" onClick={onPlay} type="button">
      {/* Image d'attente : locale (déjà optimisée) ou miniature YouTube. */}
      {poster && <img alt="" className="lp-player__poster" src={poster} />}
      <span aria-hidden="true" className="lp-player__shade" />
      <PlayButton />
    </button>
  );
}

/**
 * Page Démo (maquette « Démo ») : grand lecteur qui chevauche le héros, puis les onglets
 * « Choisissez ce que vous voulez apprendre ». Changer d'onglet change la vidéo (et arrête la lecture).
 */
export function DemoVideos() {
  const [activeId, setActiveId] = useState(demoPage.videos[0].id);
  const [playing, setPlaying] = useState(false);
  const baseId = useId();
  const active = demoPage.videos.find((video) => video.id === activeId) ?? demoPage.videos[0];

  const select = (id: string) => {
    setActiveId(id);
    setPlaying(false);
  };

  return (
    <section aria-label="Vidéos de démonstration" className="lp-demo">
      <div aria-labelledby={`${baseId}-tab-${active.id}`} className="lp-player" id={`${baseId}-panel`} role="tabpanel">
        <Player key={active.id} onPlay={() => setPlaying(true)} playing={playing} video={active} />
      </div>

      <h2 className="lp-demo__choose">{demoPage.chooseTitle}</h2>
      <div aria-label={demoPage.chooseTitle} className="lp-demo__tabs" role="tablist">
        {demoPage.videos.map((video, index) => (
          <button
            aria-controls={`${baseId}-panel`}
            aria-selected={video.id === active.id}
            className={`lp-demo__tab${video.id === active.id ? " is-active" : ""}`}
            id={`${baseId}-tab-${video.id}`}
            key={video.id}
            onClick={() => select(video.id)}
            onKeyDown={(event) => {
              // Flèches gauche / droite pour passer d'un onglet à l'autre (motif ARIA « tablist »).
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const next = demoPage.videos[(index + (event.key === "ArrowRight" ? 1 : -1) + demoPage.videos.length) % demoPage.videos.length];
              select(next.id);
              document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
            }}
            role="tab"
            tabIndex={video.id === active.id ? 0 : -1}
            type="button"
          >
            {video.label}
          </button>
        ))}
      </div>
    </section>
  );
}
