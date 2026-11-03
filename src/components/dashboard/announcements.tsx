"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardAnnouncement } from "@/modules/announcements/queries";

// Annonces de PrestAfrik en haut du tableau de bord (gérées dans Administration → Annonces).

function Slide({ item, priority }: { item: DashboardAnnouncement; priority?: boolean }) {
  // Images déjà converties en WebP au bon format à l'envoi : affichées telles quelles.
  const image = <img alt={item.altText} decoding="async" fetchPriority={priority ? "high" : "auto"} loading={priority ? "eager" : "lazy"} src={item.imageUrl} />;
  if (!item.linkUrl) return image;
  const external = /^https?:\/\//.test(item.linkUrl);
  return (
    <a href={item.linkUrl} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
      {image}
    </a>
  );
}

/**
 * Diaporama pleine largeur : une image toutes les 6 secondes, en pause au survol ou au clavier.
 * Pas de flèches : les points, et le glissement du doigt sur téléphone.
 */
export function AnnouncementCarousel({ items }: { items: DashboardAnnouncement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  return (
    <section
      aria-label="Annonces de PrestAfrik"
      aria-roledescription="diaporama"
      className="announce-carousel"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (start === null || count < 2) return;
        const delta = event.changedTouches[0].clientX - start;
        if (Math.abs(delta) > 40) setIndex((index + (delta < 0 ? 1 : -1) + count) % count);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
      }}
    >
      <div className="announce-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((item, position) => (
          <div aria-hidden={position !== index} aria-label={`${position + 1} sur ${count}`} aria-roledescription="diapositive" className="announce-slide" key={item.id} role="group">
            <Slide item={item} priority={position === 0} />
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="announce-dots">
          {items.map((item, position) => (
            <button aria-current={position === index} aria-label={`Afficher l’annonce ${position + 1}`} key={item.id} onClick={() => setIndex(position)} type="button" />
          ))}
        </div>
      )}
    </section>
  );
}

/** Bannière simple (hauteur normale), sous le diaporama. */
export function AnnouncementBanner({ item }: { item: DashboardAnnouncement | null }) {
  if (!item) return null;
  return (
    <aside aria-label="Annonce de PrestAfrik" className="announce-banner">
      <Slide item={item} />
    </aside>
  );
}
