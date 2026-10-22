import { CalendarDays, Mail, MessageCircle, Store } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/landing/contact-form";
import { Faq } from "@/components/landing/faq";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { site } from "@/config/site";
import { isContactSubject } from "@/modules/contact/subjects";

export const metadata: Metadata = {
  title: { absolute: "Contact · PrestAfrik" },
  description: "Une question, une démo personnalisée ou besoin d’aide pour votre boutique ? Écrivez à l’équipe PrestAfrik : une vraie personne vous répond.",
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [signedIn, params] = await Promise.all([isSignedIn(), searchParams]);
  const defaultSubject = isContactSubject(params.sujet) ? params.sujet : "question";
  const whatsappLink = site.whatsapp ? `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Bonjour PrestAfrik, ")}` : null;

  return (
    <PageShell
      cta={false}
      hero={{
        title: "Parlons de votre boutique",
        subtitle: "Une question, une démo personnalisée ou un coup de main pour démarrer ? Écrivez-nous : une vraie personne vous répond, en français, avec plaisir.",
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="contact-title" className="lp-section">
        <div className="lp-contact">
          <div className="lp-contact__form">
            <h2 className="lp-split__title" id="contact-title">
              Envoyez-nous un message
            </h2>
            <p className="lp-split__text">Tous les champs marqués d’un astérisque sont obligatoires.</p>
            <ContactForm defaultSubject={defaultSubject} />
          </div>
          <aside aria-label="Autres moyens de nous joindre" className="lp-contact__aside">
            <a className="lp-contact__card" href={`mailto:${site.email}`}>
              <span aria-hidden="true" className="lp-card__icon">
                <Mail size={24} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Par e-mail</strong>
                <span>{site.email}</span>
              </span>
            </a>
            {whatsappLink && (
              <a className="lp-contact__card" href={whatsappLink} rel="noreferrer" target="_blank">
                <span aria-hidden="true" className="lp-card__icon">
                  <MessageCircle size={24} strokeWidth={1.8} />
                </span>
                <span>
                  <strong>Sur WhatsApp</strong>
                  <span>Réponse rapide aux heures ouvrables</span>
                </span>
              </a>
            )}
            <a className="lp-contact__card" href="/contact?sujet=demo#contact-title">
              <span aria-hidden="true" className="lp-card__icon">
                <CalendarDays size={24} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Démo personnalisée</strong>
                <span>Découvrez PrestAfrik avec vos propres produits</span>
              </span>
            </a>
            <a className="lp-contact__card" href={signedIn ? "/dashboard" : "/inscription"}>
              <span aria-hidden="true" className="lp-card__icon">
                <Store size={24} strokeWidth={1.8} />
              </span>
              <span>
                <strong>{signedIn ? "Mon espace vendeur" : "Créer ma boutique"}</strong>
                <span>{signedIn ? "Retrouvez vos commandes et vos produits" : "Gratuit, prêt en 5 minutes"}</span>
              </span>
            </a>
          </aside>
        </div>
      </section>
      <Faq />
    </PageShell>
  );
}
