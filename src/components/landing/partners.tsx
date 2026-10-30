import Image from "next/image";
import { getSocialProof } from "@/modules/marketplace/social-proof";
import { LandingButton } from "./buttons";
import { partners } from "./content";

type Item = { key: string; node: React.ReactNode };

/**
 * Boutiques qui vendent avec PrestAfrik : logos qui défilent en continu (logos d'illustration puis vraies
 * boutiques publiées, avec leur lien), compteurs réels en dessous, et un lien vers toutes les boutiques.
 */
export async function Partners() {
  const { stores, counters } = await getSocialProof().catch(() => ({ stores: [], counters: [] }));
  const items: Item[] = [
    ...partners.logos.map((logo) => ({ key: logo.src, node: <Image alt={logo.alt} height={logo.height} src={logo.src} width={logo.width} /> })),
    ...stores.map((store) => ({
      key: store.href,
      node: (
        <a className="lp-partner" href={store.href}>
          {/* Logo déjà optimisé (WebP carré) : affiché tel quel. */}
          <img alt="" height={40} loading="lazy" src={store.logoUrl} width={40} />
          <span>{store.name}</span>
        </a>
      ),
    })),
  ];

  const row = (reverse: boolean) => (
    <div className={`lp-marquee${reverse ? " lp-marquee--reverse" : ""}`}>
      {/* La liste est doublée pour que le défilement boucle sans saut ; la copie est ignorée des lecteurs d'écran. */}
      <ul className="lp-marquee__track">
        {[...items, ...items].map((item, i) => (
          <li aria-hidden={i >= items.length} inert={i >= items.length} key={`${item.key}-${i}`}>
            {item.node}
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
      {counters.length > 0 && (
        <ul aria-label="PrestAfrik en chiffres" className="lp-counters">
          {counters.map((counter) => (
            <li key={counter.id}>
              <strong>{new Intl.NumberFormat("fr-FR").format(counter.value)}</strong>
              <span>{counter.label}</span>
            </li>
          ))}
        </ul>
      )}
      {row(false)}
      <div className="lp-partners__second">{row(true)}</div>
      <div className="lp-find-stores">
        <LandingButton href="/nos-boutiques" variant="glass">
          {partners.findCta}
        </LandingButton>
      </div>
    </section>
  );
}
