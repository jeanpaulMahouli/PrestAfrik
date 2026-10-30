import { Lock, MessageCircle, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { FeatureGrid, SectionHead } from "@/components/landing/blocks";
import { disabledPages } from "@/components/landing/content";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";
import { Testimonials } from "@/components/landing/testimonials";

export const metadata: Metadata = {
  title: { absolute: "À propos · PrestAfrik" },
  alternates: { canonical: "/a-propos" },
  description:
    "PrestAfrik donne à chaque commerçant africain une boutique en ligne professionnelle, simple et gratuite pour démarrer. Notre mission, nos valeurs et nos engagements.",
};

export default async function AboutPage() {
  // Page en attente de sa maquette (voir disabledPages dans content.ts).
  if (disabledPages.has("/a-propos")) notFound();
  const signedIn = await isSignedIn();
  return (
    <PageShell
      hero={{
        title: "Chaque commerçant mérite les outils des plus grands",
        subtitle:
          "PrestAfrik est née d’une conviction : le talent commercial ne manque pas en Afrique, ce sont les bons outils qui manquent. Nous les rendons simples, accessibles et gratuits pour démarrer.",
      }}
      signedIn={signedIn}
    >
      <section aria-labelledby="mission-title" className="lp-section">
        <span aria-hidden="true" className="lp-glow lp-glow--left" />
        <div className="lp-story">
          <div className="lp-story__copy">
            <h2 className="lp-split__title" id="mission-title">
              Transformer chaque vendeur en marque professionnelle
            </h2>
            <p className="lp-split__text">
              Dans toute l’Afrique centrale, des milliers de commerçants vendent chaque jour sur WhatsApp, Facebook ou dans leur quartier. Ils ont le produit, la clientèle et
              l’énergie. Mais les commandes se perdent dans les discussions, les totaux se calculent de tête et les clients fidèles se noient dans les contacts.
            </p>
            <p className="lp-split__text">
              PrestAfrik leur donne une vitrine à leur hauteur : une boutique en ligne prête en quelques minutes, des commandes claires qui arrivent sur WhatsApp, et un tableau de bord qui dit
              l’essentiel. Le tout pensé pour le téléphone, pour le paiement à la livraison et pour la façon dont on achète vraiment ici.
            </p>
          </div>
          <div className="lp-story__visual">
            <div className="lp-story__people">
              {["/landing/people/vendeuse-4.webp", "/landing/people/vendeur-3.webp", "/landing/people/linda.webp", "/landing/people/vendeur-1.webp"].map((src, i) => (
                <Image alt="" className={`lp-story__person lp-story__person--${i + 1}`} height={360} key={src} src={src} width={240} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="engagements-title" className="lp-section lp-glass-zone">
        <SectionHead id="engagements-title" title="Ce que nous vous promettons" />
        <FeatureGrid
          items={[
            { icon: Lock, title: "Vos données vous appartiennent", text: "Exportez vos produits, vos commandes et vos clients quand vous voulez. Nous ne revendons jamais vos données ni celles de vos clients." },
            { icon: Smartphone, title: "Le téléphone en priorité", text: "Chaque écran est conçu d’abord pour un petit téléphone, puis adapté à l’ordinateur. Jamais l’inverse." },
            { icon: MessageCircle, title: "Un accompagnement humain", text: "Une question ? Écrivez-nous : une vraie personne vous répond, en français, avec plaisir." },
          ]}
        />
      </section>

      <Testimonials />
    </PageShell>
  );
}
