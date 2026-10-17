import Image from "next/image";
import { LandingButton } from "./buttons";
import { finalCta } from "./content";
import { TwinkleIcon } from "./icons";
import { Reveal } from "./reveal";

/** Dernier appel à l'action : carte orangée, colonnes décoratives et étoiles scintillantes. */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="cta-title" className="lp-cta" id="contact">
      <div aria-hidden="true" className="lp-cta__decor">
        <span className="lp-pillar lp-cta__pillar lp-cta__pillar--1" />
        <span className="lp-pillar lp-cta__pillar lp-cta__pillar--2" />
        <span className="lp-pillar lp-cta__pillar lp-cta__pillar--3" />
        <span className="lp-pillar lp-cta__pillar lp-cta__pillar--4" />
        {[1, 2, 3, 4].map((n) => (
          <TwinkleIcon className={`lp-twinkle lp-twinkle--${n}`} key={n} />
        ))}
      </div>

      <div className="lp-cta__content">
        <p className="lp-cta__kicker">{finalCta.kicker}</p>
        <Reveal as="h2" className="lp-title lp-title--display" id="cta-title">
          {finalCta.title}
        </Reveal>
        <p className="lp-cta__subtitle">{finalCta.subtitle}</p>
        <div className="lp-cta__actions">
          <LandingButton href={signedIn ? "/dashboard" : finalCta.primary.href}>{finalCta.primary.label}</LandingButton>
          <LandingButton
            href={finalCta.secondary.href}
            icon={<Image alt="" height={16} src="/landing/icons/calendrier.svg" width={16} />}
            variant="secondary"
          >
            {finalCta.secondary.label}
          </LandingButton>
        </div>
      </div>
    </section>
  );
}
