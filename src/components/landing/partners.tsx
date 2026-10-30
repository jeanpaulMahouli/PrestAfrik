import { getSocialProof } from "@/modules/marketplace/social-proof";
import { LandingButton } from "./buttons";
import { partners } from "./content";

/**
 * Boutiques qui vendent déjà avec PrestAfrik : de vraies boutiques publiées (logo et lien), qui défilent en
 * continu ; compteurs réels en dessous. Rien ne s'affiche tant que les chiffres sont trop faibles.
 */
export async function Partners() {
  const { stores, counters } = await getSocialProof().catch(() => ({ stores: [], counters: [] }));
  const proof = stores.length > 0 || counters.length > 0;

  const row = (reverse: boolean) => (
    <div className={`lp-marquee${reverse ? " lp-marquee--reverse" : ""}`}>
      {/* La liste est doublée pour que le défilement boucle sans saut ; la copie est ignorée des lecteurs d'écran. */}
      <ul className="lp-marquee__track">
        {[...stores, ...stores].map((store, i) => (
          <li aria-hidden={i >= stores.length} key={i}>
            <a className="lp-partner" href={store.href} tabIndex={i >= stores.length ? -1 : undefined}>
              {/* Logo déjà optimisé (WebP carré) : affiché tel quel. */}
              <img alt="" height={40} loading="lazy" src={store.logoUrl} width={40} />
              <span>{store.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section aria-labelledby={proof ? "partners-title" : "find-stores-title"} className="lp-partners">
      {proof && (
        <h2 className="lp-partners__title" id="partners-title">
          {partners.title}
        </h2>
      )}
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
      {stores.length > 0 && (
        <>
          {row(false)}
          <div className="lp-partners__second">{row(true)}</div>
        </>
      )}
      <div className="lp-find-stores">
        <h2 id="find-stores-title">{partners.findTitle}</h2>
        <p>{partners.findText}</p>
        <LandingButton href="/nos-boutiques">{partners.findCta}</LandingButton>
      </div>
    </section>
  );
}
