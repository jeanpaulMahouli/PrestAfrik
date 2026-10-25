import { BookOpen, LayoutDashboard, MessageCircle, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Page introuvable" };

/** Page 404 du site : menu, pistes pour continuer et pied de page, comme les autres pages publiques. */
export default async function NotFound() {
  const signedIn = await isSignedIn();
  const suggestions = [
    signedIn
      ? { icon: LayoutDashboard, href: "/dashboard", title: "Mon tableau de bord", text: "Retrouvez vos commandes, vos produits et vos clients." }
      : { icon: LayoutDashboard, href: "/connexion", title: "Me connecter", text: "Accédez à votre boutique, vos commandes et vos clients." },
    { icon: PlayCircle, href: "/demo", title: "Voir la démo", text: "Découvrez en vidéo comment créer et gérer votre boutique." },
    { icon: BookOpen, href: "/blog", title: "Lire le blog", text: "Conseils pratiques pour vendre plus en ligne." },
    { icon: MessageCircle, href: "/contact", title: "Nous contacter", text: "Un lien ne fonctionne pas ? Dites-le-nous, nous vous aidons." },
  ];

  return (
    <PageShell
      cta={false}
      hero={{
        kicker: "Erreur 404",
        title: "Oups, cette page est introuvable",
        subtitle: "Le lien est peut-être incomplet, ou la page a été déplacée. Pas d’inquiétude : voici de quoi reprendre votre chemin.",
        actions: <LandingButton href="/">Revenir à l’accueil</LandingButton>,
      }}
      signedIn={signedIn}
    >
      <section aria-label="Pistes pour continuer" className="lp-section lp-404">
        <ul className="lp-grid lp-grid--4">
          {suggestions.map(({ icon: Icon, href, title, text }) => (
            <li key={href}>
              <Link className="lp-card lp-card--link" href={href}>
                <span aria-hidden="true" className="lp-card__icon">
                  <Icon size={26} strokeWidth={1.8} />
                </span>
                <span className="lp-card__title">{title}</span>
                <span className="lp-card__text">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
