import Image from "next/image";
import { LandingButton } from "./buttons";
import { hero } from "./content";
import { DemoVideoButton } from "./demo-video-button";
import { SiteHeader } from "./site-header";

/** Héros : carte orangée avec la navigation, le titre, les boutons et le téléphone entouré d'éléments flottants. */
export function Hero({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/dashboard" : hero.primaryCta.href;

  return (
    <section aria-labelledby="hero-title" className="lp-hero" id="accueil">
      <SiteHeader signedIn={signedIn} />

      <div className="lp-hero__copy">
        <h1 className="lp-hero__title lp-intro" id="hero-title">
          {hero.title}
        </h1>
        <p className="lp-hero__subtitle lp-intro lp-intro--2">{hero.subtitle}</p>
        <div className="lp-hero__actions lp-intro lp-intro--3">
          <LandingButton href={primaryHref}>{signedIn ? "Aller à mon espace" : hero.primaryCta.label}</LandingButton>
          <DemoVideoButton fallbackHref={hero.secondaryCta.href} label={hero.secondaryCta.label} />
        </div>
      </div>

      {/* Scène illustrée : les positions sont exprimées en % de sa largeur (unités cqw), elle s'adapte donc à tout écran. */}
      <div aria-hidden="true" className="lp-hero__stage">
        <span className="lp-pillar lp-hero__pillar lp-hero__pillar--left" />
        <span className="lp-pillar lp-hero__pillar lp-hero__pillar--center" />
        <span className="lp-pillar lp-hero__pillar lp-hero__pillar--right" />

        <div className="lp-phone lp-hero__phone">
          <span className="lp-phone__island" />
          <Image alt="" className="lp-phone__screen" height={2532} priority sizes="(max-width: 767px) 70vw, 34vw" src={hero.phoneScreen} width={1170} />
        </div>
        <span className="lp-hero__fade" />

        <div className="lp-float lp-hero__community">
          {hero.community.map((src) => (
            <Image alt="" height={70} key={src} src={src} width={70} />
          ))}
        </div>
        <div className="lp-float lp-float--slow lp-tile lp-hero__tile lp-hero__tile--basket">
          <Image alt="" height={27} src="/landing/icons/panier.svg" width={29} />
        </div>
        <div className="lp-float lp-float--fast lp-tile lp-hero__tile lp-hero__tile--money">
          <Image alt="" height={36} src="/landing/icons/sac-argent.svg" width={36} />
        </div>
        <figure className="lp-float lp-float--late lp-hero__quote">
          <Image alt="" className="lp-hero__quote-cursor" height={18} src="/landing/icons/curseur.svg" width={20} />
          <Image alt="" className="lp-hero__quote-photo" height={68} src={hero.quote.photo} width={68} />
          <figcaption>
            <strong>{hero.quote.name}</strong>
            <span>
              {hero.quote.text}
              {"\u00a0" /* espace insécable : l’emoji reste collé au texte */}
              <Image alt="" height={24} src="/landing/emoji/amoureux.webp" width={24} />
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
