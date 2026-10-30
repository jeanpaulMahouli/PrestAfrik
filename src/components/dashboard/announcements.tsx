"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
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

/** Diaporama pleine largeur : une image toutes les 6 secondes, en pause au survol ou au clavier. */
export function AnnouncementCarousel({ items }: { items: DashboardAnnouncement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
    >
      <div className="announce-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((item, position) => (
          <div aria-hidden={position !== index} aria-label={`${position + 1} sur ${count}`} aria-roledescription="diapositive" className="announce-slide" key={item.id} role="group">
            <Slide item={item} priority={position === 0} />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button aria-label="Annonce précédente" className="announce-arrow announce-arrow-prev" onClick={() => setIndex((index - 1 + count) % count)} type="button">
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <button aria-label="Annonce suivante" className="announce-arrow announce-arrow-next" onClick={() => setIndex((index + 1) % count)} type="button">
            <ChevronRight aria-hidden="true" size={20} />
          </button>
          <div className="announce-dots">
            {items.map((item, position) => (
              <button aria-current={position === index} aria-label={`Afficher l’annonce ${position + 1}`} key={item.id} onClick={() => setIndex(position)} type="button" />
            ))}
          </div>
        </>
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
