import Image from "next/image";
import Link from "next/link";
import { texts } from "@/config/texts";

type AuthShellProps = {
  children: React.ReactNode;
  storyTitle: string;
  storyText: string;
  benefits?: readonly string[];
};

/** Mise en page des écrans d'authentification (maquettes « Connexion » et « Inscription »). */
export function AuthShell({ children, storyTitle, storyText, benefits }: AuthShellProps) {
  return (
    <div className="auth-page">
      <section aria-labelledby="auth-story-title" className="auth-story">
        <div aria-hidden="true" className="auth-story-glow" />
        <div aria-hidden="true" className="auth-map">
          <div className="africa-dots" />
          <span className="map-marker">
            <span className="map-marker-dot" />
            <span className="map-marker-ring" />
          </span>
        </div>
        <div className="auth-story-content">
          <Link className="auth-brand" href="/">
            <Image alt="PrestAfrik" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
          </Link>
          <h2 id="auth-story-title">{storyTitle}</h2>
          <p>{storyText}</p>
          {benefits && (
            <ul className="auth-benefits">
              {benefits.map((benefit) => (
                <li key={benefit}>
                  <span aria-hidden="true">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div aria-live="off" className="auth-tips">
          {texts.auth.tips.map((tip, index) => (
            <p className="auth-tip" key={tip.title} style={{ animationDelay: `${index * 6}s` }}>
              <strong>{tip.title}</strong>
              {tip.text}
            </p>
          ))}
        </div>
      </section>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
        <nav aria-label="Informations légales" className="auth-legal">
          <Link href="/legal/conditions-generales">{texts.legalLinks.terms}</Link>
          <Link href="/legal/politique-de-confidentialite">{texts.legalLinks.privacy}</Link>
          <Link href="/legal/mentions-legales">{texts.legalLinks.notice}</Link>
        </nav>
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
    </>
  );
}
