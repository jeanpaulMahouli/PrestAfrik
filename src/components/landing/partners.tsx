import Image from "next/image";
import { partners } from "./content";

/** Logos des boutiques partenaires qui défilent en continu (deux rangées en sens inverse sur mobile). */
export function Partners() {
  const row = (reverse: boolean) => (
    <div className={`lp-marquee${reverse ? " lp-marquee--reverse" : ""}`}>
      {/* La liste est doublée pour que le défilement boucle sans saut. */}
      <ul className="lp-marquee__track">
        {[...partners.logos, ...partners.logos].map((logo, i) => (
          <li aria-hidden={i >= partners.logos.length} key={i}>
            <Image alt={i < partners.logos.length ? logo.alt : ""} height={logo.height} src={logo.src} width={logo.width} />
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section aria-labelledby="partners-title" className="lp-partners">
      <h2 className="lp-partners__title" id="partners-title">
        {partners.title}
      </h2>
      {row(false)}
      <div className="lp-partners__second">{row(true)}</div>
    </section>
  );
}
