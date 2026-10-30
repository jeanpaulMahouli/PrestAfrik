import Image from "next/image";
import { shopUrl } from "@/lib/urls";
import { getSocialProof } from "@/modules/marketplace/social-proof";
import { LandingButton } from "./buttons";
import { partners } from "./content";

/**
 * Bandeau de l'accueil : logos d'illustration (boutiques fictives, aucune vraie boutique mêlée) qui défilent
 * en continu, compteurs réels en dessous, et un lien vers toutes les boutiques.
 */
export async function Partners() {
  const { counters } = await getSocialProof().catch(() => ({ counters: [] }));
  const logos = partners.logos;

  const row = (reverse: boolean) => (
    <div className={`lp-marquee${reverse ? " lp-marquee--reverse" : ""}`}>
      {/* La liste est doublée pour que le défilement boucle sans saut ; la copie est ignorée des lecteurs d'écran. */}
      <ul className="lp-marquee__track">
        {[...logos, ...logos].map((logo, i) => (
          <li aria-hidden={i >= logos.length} key={`${logo.src}-${i}`}>
            <Image alt={i < logos.length ? logo.alt : ""} height={logo.height} src={logo.src} width={logo.width} />
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
      {partners.showStoresLink && (
        <div className="lp-find-stores">
          <LandingButton href={shopUrl("/")} variant="glass">
            {partners.findCta}
          </LandingButton>
        </div>
      )}
    </section>
  );
}
