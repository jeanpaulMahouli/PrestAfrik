"use client";

import { ArrowLeft, ArrowRight, LayoutDashboard, ListOrdered, Megaphone, Package, Rocket, ShoppingBag, Star, Store, Truck, Users, UsersRound, Wallet, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GuideChapter } from "./chapters";
import { GuideClip } from "./guide-clip";

const icons: Record<GuideChapter["icon"], LucideIcon> = {
  rocket: Rocket,
  dashboard: LayoutDashboard,
  package: Package,
  bag: ShoppingBag,
  star: Star,
  truck: Truck,
  users: Users,
  wallet: Wallet,
  store: Store,
  megaphone: Megaphone,
  team: UsersRound,
};

/**
 * Guide vendeur : sommaire fixe à gauche (bouton flottant sur téléphone) ; toucher un chapitre l'affiche
 * à droite, avec une phrase courte et l'illustration de chaque étape. L'adresse (#chapitre) suit la lecture.
 */
export function GuideBrowser({ chapters }: { chapters: GuideChapter[] }) {
  const [activeId, setActiveId] = useState(chapters[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const index = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const chapter = chapters[index];

  // Lien direct vers un chapitre (#produits) et boutons Précédent / Suivant du navigateur.
  useEffect(() => {
    const read = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (chapters.some((item) => item.id === id)) setActiveId(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [chapters]);

  const open = useCallback((id: string) => {
    setActiveId(id);
    setTocOpen(false);
    window.history.replaceState(null, "", `#${id}`);
    document.getElementById("guide-chapitre")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!tocOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setTocOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [tocOpen]);

  const toc = (
    <ol className="guide-toc-list">
      {chapters.map((item, position) => {
        const Icon = icons[item.icon];
        return (
          <li key={item.id}>
            <button aria-current={item.id === chapter.id ? "true" : undefined} onClick={() => open(item.id)} type="button">
              <span aria-hidden="true" className="guide-toc-icon">
                <Icon size={18} />
              </span>
              <span className="guide-toc-text">
                <small>{position + 1}</small>
                {item.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  const ChapterIcon = icons[chapter.icon];
  const previous = chapters[index - 1];
  const next = chapters[index + 1];

  return (
    <div className="guide">
      <nav aria-label="Sommaire du guide" className="guide-toc">
        <p className="guide-toc-title">Sommaire</p>
        {toc}
      </nav>

      <section aria-labelledby="guide-chapitre-titre" className="guide-chapter" id="guide-chapitre">
        <header className="guide-chapter-head">
          <span aria-hidden="true" className="guide-chapter-icon">
            <ChapterIcon size={26} />
          </span>
          <div>
            <p className="guide-chapter-step">Étape {index + 1} sur {chapters.length}</p>
            <h2 id="guide-chapitre-titre">{chapter.title}</h2>
            <p>{chapter.summary}</p>
          </div>
        </header>

        <div className="guide-lessons">
          {chapter.lessons.map((lesson, position) => (
            <article aria-labelledby={`${lesson.id}-titre`} className="guide-lesson" key={`${chapter.id}-${lesson.id}`}>
              <div className="guide-lesson-text">
                <span aria-hidden="true" className="guide-lesson-number">{position + 1}</span>
                <h3 id={`${lesson.id}-titre`}>{lesson.title}</h3>
                <p>{lesson.summary}</p>
              </div>
              {lesson.clip && <GuideClip label={`${lesson.title} : ${lesson.summary}`} name={lesson.clip} />}
            </article>
          ))}
        </div>

        <nav aria-label="Chapitres voisins" className="guide-pager">
          {previous ? (
            <button onClick={() => open(previous.id)} type="button">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>
                <small>Précédent</small>
                {previous.title}
              </span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button className="is-next" onClick={() => open(next.id)} type="button">
              <span>
                <small>Suivant</small>
                {next.title}
              </span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          )}
        </nav>
      </section>

      {/* Téléphone : sommaire derrière un petit bouton flottant. */}
      <button aria-controls="guide-toc-sheet" aria-expanded={tocOpen} aria-label="Afficher le sommaire" className="guide-toc-fab" onClick={() => setTocOpen(true)} type="button">
        <ListOrdered aria-hidden="true" size={22} />
      </button>
      {tocOpen && (
        <div className="guide-toc-layer">
          <button aria-label="Fermer le sommaire" className="guide-toc-backdrop" onClick={() => setTocOpen(false)} tabIndex={-1} type="button" />
          <div aria-label="Sommaire du guide" aria-modal="true" className="guide-toc-sheet" id="guide-toc-sheet" role="dialog">
            <div className="guide-toc-sheet-head">
              <p className="guide-toc-title">Sommaire</p>
              <button aria-label="Fermer le sommaire" autoFocus className="guide-toc-close" onClick={() => setTocOpen(false)} type="button">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            {toc}
          </div>
        </div>
      )}
    </div>
  );
}
