import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

type AuthShellProps = {
  children: React.ReactNode;
  heading: string;
  message: string;
};

export function AuthShell({ children, heading, message }: AuthShellProps) {
  return (
    <main className="auth-layout">
      <section aria-label="PrestAfrik" className="auth-story">
        <div className="auth-logo">
          <BrandLogo priority />
        </div>
        <div>
          <h1>Ta boutique prend vie&nbsp;!</h1>
          <p>
            Crée ta boutique, reçois tes commandes et fais-les confirmer par tes clients sur
            WhatsApp.
          </p>
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <h2>{heading}</h2>
          <p className="auth-subtitle">{message}</p>
          {children}
        </div>
        <nav aria-label="Informations légales PrestAfrik" className="subscription-legal-links">
          <Link href="/legal/conditions-generales">Conditions générales</Link>
          <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
          <Link href="/legal/mentions-legales">Mentions légales</Link>
        </nav>
      </section>
    </main>
  );
}
