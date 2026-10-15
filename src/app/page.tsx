import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AudienceDemo, ContactForm, HeroTicker, LandingHeader, StepsDemo, VendorTabs } from "@/components/landing/landing-interactive";
import { CheckIcon } from "@/components/ui/icons";
import { billingEnabled } from "@/config/billing";
import { site } from "@/config/site";
import { auth } from "@/modules/auth/server";
import { buildWaMeUrl, formatWhatsappNumber } from "@/modules/whatsapp/wa-me";

export const metadata: Metadata = {
  title: { absolute: "PrestAfrik · La boutique en ligne pensée pour les commerçants camerounais" },
  description:
    "Créez votre boutique en ligne en quelques minutes. Vos clients commandent sans compte et paient à la livraison ; vous échangez sur WhatsApp et suivez tout depuis un seul espace. Gratuit pendant le lancement.",
};

const features = [
  { icon: "🛒", title: "Commande sans compte", text: "Vos clients commandent en quelques secondes." },
  { icon: "🚚", title: "Paiement à la livraison", text: "Le mode de paiement que vos clients connaissent." },
  { icon: "💬", title: "WhatsApp en un geste", text: "Un bouton pour écrire au client, message déjà rédigé." },
  { icon: "👥", title: "Clients organisés", text: "Chaque commande enrichit votre fichier clients." },
  { icon: "📍", title: "Livraison par zone", text: "Vos quartiers et vos frais, connus avant la commande." },
  { icon: "🧾", title: "Argent reçu", text: "Chaque commande validée est comptée automatiquement." },
  { icon: "🎨", title: "Votre boutique, votre style", text: "Trois thèmes, votre logo, vos couleurs." },
  { icon: "🔗", title: "Partage facile", text: "Lien, QR code et message prêt à envoyer." },
];

const faq = [
  { q: "Mes clients doivent-ils créer un compte ?", a: "Non. Ils choisissent leurs produits, indiquent leur nom, leur numéro WhatsApp et leur zone de livraison, et c’est tout. Ils reçoivent un lien pour suivre leur commande." },
  { q: "Comment mes clients paient-ils ?", a: "À la livraison, en espèces ou par mobile money, comme ils en ont l’habitude. Quand vous êtes payé, vous touchez « Valider » : le montant est ajouté à votre argent reçu." },
  { q: "Comment fonctionnent les frais de livraison ?", a: "Vous créez vos zones (un quartier ou toute la ville) avec un prix fixe. Le client choisit sa zone et voit le total exact avant de commander : pas de négociation." },
  { q: "Quelle différence entre le lien wa.me et l’API WhatsApp ?", a: "Le lien wa.me fonctionne tout de suite et gratuitement : WhatsApp s’ouvre avec un message déjà écrit, il suffit d’appuyer sur Envoyer. L’API WhatsApp Business envoie les messages automatiquement, mais demande un compte Meta et un modèle de message approuvé." },
  { q: "Combien coûte PrestAfrik ?", a: "Rien pendant le lancement : toutes les fonctions sont gratuites et sans limite. Nous vous préviendrons bien à l’avance avant l’arrivée des offres payantes." },
  { q: "Puis-je inviter mon équipe ?", a: "Oui. Ajoutez un gestionnaire ou un préparateur de commandes : chacun ne voit que ce dont il a besoin." },
];

/** Landing page publique (maquette « Site PrestAfrik », adaptée aux décisions ADR-013 et ADR-014). */
export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const ctaHref = session ? "/dashboard" : "/inscription";
  const whatsappHref = site.whatsapp ? buildWaMeUrl(site.whatsapp, "Bonjour PrestAfrik, j’ai une question.") : null;

  return (
    <div className="lp">
      <a className="lp-skip" href="#contenu">Aller au contenu</a>
      <LandingHeader signedIn={Boolean(session)} />

      <main id="contenu">
        {/* ---------- Héros ---------- */}
        <section aria-labelledby="hero-title" className="lp-hero" id="accueil">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow-pill"><span aria-hidden="true">✦</span> la boutique en ligne pensée pour vous !</p>
              <h1 id="hero-title">
                Votre commerce mérite une vitrine <span className="lp-highlight">à sa hauteur</span>.
              </h1>
              <p className="lp-lead">
                Vos clients commandent sans créer de compte et paient à la livraison. Vous leur écrivez sur WhatsApp en un geste et suivez tout depuis un seul espace, simplement.
              </p>
              <div className="lp-hero-actions">
                <Link className="lp-btn lp-btn-primary lp-btn-lg" href={ctaHref}>{session ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</Link>
                <a className="lp-btn lp-btn-outline-light lp-btn-lg" href="#demo">Voir la démo <span aria-hidden="true">▸</span></a>
              </div>
              <p className="lp-hero-note">Gratuit pendant le lancement, sans carte bancaire. Votre boutique est prête en quelques minutes.</p>
            </div>
            <div aria-hidden="true" className="lp-hero-visual">
              {/* Masque appliqué en ligne : l'image reste servie depuis public/, sans passer par le CSS. */}
              <span className="lp-africa" style={{ maskImage: "url(/brand/afrique-mask.png)", WebkitMaskImage: "url(/brand/afrique-mask.png)" }} />
              <div className="lp-device-laptop">
                <Image alt="" height={800} priority sizes="(max-width: 900px) 90vw, 560px" src="/landing/vendeur-accueil.webp" width={1280} />
              </div>
              <div className="lp-device-phone">
                <Image alt="" height={1125} priority sizes="190px" src="/landing/client-boutique.webp" width={520} />
              </div>
              <HeroTicker />
            </div>
          </div>
        </section>

        {/* ---------- CRM ---------- */}
        <section aria-labelledby="crm-title" className="lp-section lp-cream" id="fonctionnalites">
          <div className="lp-container lp-split">
            <div>
              <p className="lp-eyebrow">CRM et prospection ciblée</p>
              <h2 id="crm-title">Connaissez vos clients. Parlez aux bons, au bon moment.</h2>
              <p className="lp-text">Chaque commande enrichit automatiquement votre fichier clients : historique, segments, consentements, rappels. Ciblez ensuite ceux qui comptent vraiment.</p>
              <ul className="lp-checks">
                <li><CheckIcon size={12} /> Un fichier clients qui se remplit tout seul, à chaque commande</li>
                <li><CheckIcon size={12} /> Des segments prêts à l’emploi : nouveaux, réguliers, inactifs, acheteurs par catégorie</li>
                <li><CheckIcon size={12} /> Des campagnes WhatsApp réservées aux clients qui ont donné leur accord</li>
              </ul>
            </div>
            <AudienceDemo />
          </div>
        </section>

        {/* ---------- 4 gestes ---------- */}
        <section aria-labelledby="demo-title" className="lp-section" id="demo">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="demo-title">Une commande, de A à Z, en 4 gestes</h2>
              <p className="lp-text">Voyez comment tout se passe, côté client comme côté vendeur. Ce sont de vraies captures, avec des données d’exemple.</p>
            </div>
            <StepsDemo />
          </div>
        </section>

        {/* ---------- Espace vendeur ---------- */}
        <section aria-labelledby="space-title" className="lp-section lp-soft">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="space-title">Votre espace vendeur, en vrai</h2>
              <p className="lp-text">Cliquez pour explorer. Pensé pour être compris sans formation.</p>
            </div>
            <VendorTabs />
          </div>
        </section>

        {/* ---------- Côté client ---------- */}
        <section aria-labelledby="client-title" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="client-title">Côté client : simple, rapide, sur téléphone</h2>
              <p className="lp-text">La plupart de vos clients commandent depuis leur mobile. Tout est pensé pour eux.</p>
            </div>
            <div className="lp-phones">
              {[
                { image: "/landing/client-boutique.webp", label: "Votre boutique" },
                { image: "/landing/client-commande.webp", label: "Commande en 1 minute" },
                { image: "/landing/client-suivi.webp", label: "Suivi sans compte" },
              ].map((item) => (
                <figure className="lp-phone" key={item.label}>
                  <div className="lp-phone-frame">
                    <Image alt={`Capture : ${item.label}`} height={1125} sizes="(max-width: 700px) 70vw, 260px" src={item.image} width={520} />
                  </div>
                  <figcaption>{item.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- WhatsApp ---------- */}
        <section aria-labelledby="wa-title" className="lp-section lp-cream">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="wa-title">WhatsApp : deux façons, vous choisissez</h2>
              <p className="lp-text">Commencez tout de suite avec un lien, passez à l’automatique quand votre activité grandit.</p>
            </div>
            <div className="lp-cards-2">
              <article className="lp-card lp-card-accent">
                <span className="lp-tag">Par défaut</span>
                <h3>Lien WhatsApp (wa.me)</h3>
                <p>WhatsApp s’ouvre avec un message déjà écrit, pour vous comme pour votre client. Il suffit d’appuyer sur Envoyer.</p>
                <ul className="lp-checks">
                  <li><CheckIcon size={12} /> Aucun compte technique à créer</li>
                  <li><CheckIcon size={12} /> Gratuit, prêt tout de suite</li>
                  <li><CheckIcon size={12} /> Vos messages, rédigés une fois pour toutes</li>
                </ul>
              </article>
              <article className="lp-card">
                <span className="lp-tag lp-tag-dark">Avancé</span>
                <h3>API WhatsApp Business</h3>
                <p>Le message part tout seul à chaque commande, avec les statuts envoyé, livré et lu.</p>
                <ul className="lp-checks">
                  <li><CheckIcon size={12} /> Envoi automatique</li>
                  <li><CheckIcon size={12} /> Suivi des messages dans votre espace</li>
                  <li><CheckIcon size={12} /> Compte Meta et modèle approuvé requis</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* ---------- Fonctionnalités ---------- */}
        <section aria-labelledby="features-title" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="features-title">Tout pour vendre sans vous compliquer</h2>
              <p className="lp-text">Des outils simples, en français, pensés pour votre quotidien.</p>
            </div>
            <ul className="lp-features">
              {features.map((feature) => (
                <li key={feature.title}>
                  <span aria-hidden="true" className="lp-feature-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Tarifs ---------- */}
        <section aria-labelledby="pricing-title" className="lp-section lp-soft" id="tarifs">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2 id="pricing-title">{billingEnabled ? "Des tarifs simples et transparents" : "Gratuit pendant le lancement"}</h2>
              <p className="lp-text">
                {billingEnabled ? "Choisissez l’offre qui vous convient." : "Toutes les fonctions, sans limite et sans carte bancaire. Nous vous préviendrons bien à l’avance avant l’arrivée des offres payantes."}
              </p>
            </div>
            <article className="lp-free-card">
              <div>
                <p className="lp-eyebrow">Offre de lancement</p>
                <p className="lp-price"><strong>0 FCFA</strong> / mois</p>
                <ul className="lp-checks">
                  <li><CheckIcon size={12} /> Boutique, catalogue et 5 photos par produit</li>
                  <li><CheckIcon size={12} /> Commandes, WhatsApp et argent reçu</li>
                  <li><CheckIcon size={12} /> Clients, campagnes et équipe</li>
                </ul>
              </div>
              <Link className="lp-btn lp-btn-primary lp-btn-lg" href={ctaHref}>{session ? "Aller à mon espace" : "Créer ma boutique"}</Link>
            </article>
          </div>
        </section>

        {/* ---------- À propos ---------- */}
        <section aria-labelledby="about-title" className="lp-section" id="a-propos">
          <div className="lp-container lp-split">
            <div>
              <p className="lp-eyebrow">À propos</p>
              <h2 id="about-title">Conçu pour les commerçants d’ici, avec passion.</h2>
              <p className="lp-text">
                PrestAfrik part d’une conviction : un commerçant camerounais doit pouvoir vendre en ligne aussi simplement qu’il vend dans sa boutique. Nous construisons des outils clairs, en français, qui respectent vos habitudes : paiement à la livraison, échanges sur WhatsApp, livraison par quartier.
              </p>
            </div>
            <ul className="lp-values">
              <li><strong>Simple</strong><span>Des écrans clairs, sans jargon. Aucune formation nécessaire.</span></li>
              <li><strong>Fiable</strong><span>Vos données et vos commandes sont isolées et protégées.</span></li>
              <li><strong>À votre écoute</strong><span>Nous avançons avec les retours des vendeurs.</span></li>
            </ul>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section aria-labelledby="faq-title" className="lp-section lp-cream">
          <div className="lp-container lp-narrow">
            <h2 className="lp-center" id="faq-title">Questions fréquentes</h2>
            <div className="lp-faq">
              {faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section aria-labelledby="contact-title" className="lp-section" id="contact">
          <div className="lp-container lp-split">
            <div>
              <p className="lp-eyebrow">Contact</p>
              <h2 id="contact-title">Une question ? Parlons-en avec plaisir !</h2>
              <p className="lp-text">Notre équipe vous répond dès que possible, en français, sur le canal qui vous convient le mieux.</p>
              <div className="lp-contact-ways">
                {whatsappHref && site.whatsapp && (
                  <a className="lp-btn lp-btn-whatsapp" href={whatsappHref} rel="noopener noreferrer" target="_blank">
                    Nous écrire sur WhatsApp · {formatWhatsappNumber(site.whatsapp)}
                  </a>
                )}
                <p>
                  <span className="lp-muted">E-mail</span>
                  <br />
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </p>
              </div>
            </div>
            <ContactForm email={site.email} whatsapp={site.whatsapp} />
          </div>
        </section>

        {/* ---------- Appel final ---------- */}
        <section aria-labelledby="cta-title" className="lp-cta">
          <div className="lp-container">
            <h2 id="cta-title">Vos prochains clients vous attendent !</h2>
            <p>Gratuit pendant le lancement, sans engagement.</p>
            <Link className="lp-btn lp-btn-primary lp-btn-lg" href={ctaHref}>{session ? "Aller à mon espace" : "Créer ma boutique"}</Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div>
            <Image alt="PrestAfrik" height={40} src="/brand/logo-prestafrik.png" width={73} />
            <p>La boutique en ligne pensée pour les commerçants camerounais.</p>
          </div>
          <nav aria-label="Produit">
            <strong>Produit</strong>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#demo">Démo</a>
            <a href="#tarifs">Tarifs</a>
          </nav>
          <nav aria-label="Société">
            <strong>Société</strong>
            <a href="#a-propos">À propos</a>
            <a href="#contact">Contact</a>
          </nav>
          <nav aria-label="Ressources">
            <strong>Ressources</strong>
            <Link href="/legal/conditions-generales">Conditions d’utilisation</Link>
            <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
            <Link href="/legal/mentions-legales">Mentions légales</Link>
          </nav>
        </div>
        <p className="lp-container lp-copyright">© {new Date().getFullYear()} PrestAfrik. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
