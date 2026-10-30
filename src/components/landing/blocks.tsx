import type { LucideIcon } from "lucide-react";
import { Check, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

// Blocs des pages publiques secondaires, dans le style de la landing (cartes douces, grands arrondis, orange).

export function SectionHead({ title, lead, id }: { title: string; lead?: string; id?: string }) {
  return (
    <header className="lp-section__head">
      <Reveal as="h2" className="lp-title" id={id}>
        {title}
      </Reveal>
      {lead && <p className="lp-lead">{lead}</p>}
    </header>
  );
}

/** Icône Lucide, ou tout composant qui accepte `size` et `strokeWidth` (ex. logo WhatsApp). */
export type FeatureItem = { icon: LucideIcon | React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>; title: string; text: string };

/** Grille de cartes « icône, titre, texte ». */
export function FeatureGrid({ items, columns = 3 }: { items: FeatureItem[]; columns?: 2 | 3 | 4 }) {
  return (
    <ul className={`lp-grid lp-grid--${columns}`}>
      {items.map(({ icon: Icon, title, text }) => (
        <li className="lp-card" key={title}>
          <span aria-hidden="true" className="lp-card__icon">
            <Icon size={26} strokeWidth={1.8} />
          </span>
          <h3 className="lp-card__title">{title}</h3>
          <p className="lp-card__text">{text}</p>
        </li>
      ))}
    </ul>
  );
}

export type ShowcaseImage = { src: string; width: number; height: number; alt: string; kind: "screen" | "phone" };

/** Ligne « texte + visuel » ; le visuel passe à gauche une ligne sur deux (reverse). */
export function SplitFeature({
  title,
  text,
  points = [],
  image,
  reverse = false,
  children,
}: {
  title: string;
  text: string;
  points?: string[];
  image: ShowcaseImage;
  reverse?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className={`lp-split${reverse ? " lp-split--reverse" : ""}`}>
      <div className="lp-split__copy">
        <h3 className="lp-split__title">{title}</h3>
        <p className="lp-split__text">{text}</p>
        {points.length > 0 && (
          <ul className="lp-checklist">
            {points.map((point) => (
              <li key={point}>
                <Check aria-hidden="true" size={18} strokeWidth={2.4} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
      <div className={`lp-split__visual lp-split__visual--${image.kind}`}>
        {image.kind === "screen" ? (
          <div className="lp-browser">
            <span aria-hidden="true" className="lp-browser__bar">
              <i />
              <i />
              <i />
            </span>
            <Image alt={image.alt} height={image.height} sizes="(max-width: 1023px) 92vw, 46vw" src={image.src} width={image.width} />
          </div>
        ) : (
          <Image alt={image.alt} className="lp-split__phone" height={image.height} sizes="(max-width: 1023px) 60vw, 22vw" src={image.src} width={image.width} />
        )}
      </div>
    </article>
  );
}

/** Étapes numérotées (1, 2, 3…). */
export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="lp-steps">
      {items.map((item, i) => (
        <li className="lp-steps__item" key={item.title}>
          <span aria-hidden="true" className="lp-steps__number">
            {i + 1}
          </span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Comparatif « Avant / Avec PrestAfrik ». */
export function Compare({ rows, beforeTitle = "Sans PrestAfrik", afterTitle = "Avec PrestAfrik" }: { rows: { before: string; after: string }[]; beforeTitle?: string; afterTitle?: string }) {
  return (
    <div className="lp-compare">
      <div className="lp-compare__col lp-compare__col--before">
        <h3>{beforeTitle}</h3>
        <ul>
          {rows.map((row) => (
            <li key={row.before}>
              <X aria-hidden="true" size={18} strokeWidth={2.4} />
              <span>{row.before}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-compare__col lp-compare__col--after">
        <h3>{afterTitle}</h3>
        <ul>
          {rows.map((row) => (
            <li key={row.after}>
              <Check aria-hidden="true" size={18} strokeWidth={2.4} />
              <span>{row.after}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
