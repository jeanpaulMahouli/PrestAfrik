import Image from "next/image";
import Link from "next/link";
import { texts } from "@/config/texts";

/** Mise en page des écrans d'authentification : logo et formulaire centrés, sans panneau de présentation. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <main className="auth-main">
        <Link aria-label="PrestAfrik, accueil" className="auth-brand" href="/">
          <Image alt="PrestAfrik" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
        </Link>
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
