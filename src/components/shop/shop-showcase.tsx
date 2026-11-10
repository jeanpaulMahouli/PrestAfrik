import { ArrowRight, HandCoins, SealCheck, ShieldCheck } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { AdSlot } from "@/config/marketplace-ads";
import { formatXaf } from "@/modules/catalog/format";
import type { DashboardAnnouncement } from "@/modules/announcements/queries";
import type { ShopCategory, ShopProduct, ShopStore } from "@/modules/marketplace/shop";
import { categoryGlyph } from "./category-glyphs";
import { ProductBadges, ShopProductCard, Stars } from "./product-card";
import { SellerBanner } from "./shop-hero";
import { ShowcaseTabs, SpotlightCarousel } from "./shop-showcase-client";
import { ScrollRail } from "./shop-widgets";
import { WhatsappMark } from "./whatsapp-mark";

// Accueil de la marketplace, d'après la maquette : héros (grand visuel et deux visuels de côté), garanties,
// bonnes affaires, catégories, produits à onglets avec colonnes publicitaires, bannières, mini-listes,
// articles du blog, bande « Club » avec les boutiques. Les produits, prix et notes sont ceux des vendeurs ;
// les emplacements publicitaires sont des images (config/marketplace-ads.ts ou l'administration).

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("");

export function Photo({ product, large = false, eager = false }: { product: ShopProduct; large?: boolean; eager?: boolean }) {
  const src = large ? (product.largeImageUrl ?? product.imageUrl) : product.imageUrl;
  if (!src) return <span className="sx-photo-empty">{product.name.slice(0, 2).toUpperCase()}</span>;
  // Photos déjà converties en WebP (320 et 800 px) : affichées telles quelles.
  return <img alt="" decoding="async" fetchPriority={eager ? "high" : "auto"} height={large ? 800 : 320} loading={eager ? "eager" : "lazy"} src={src} width={large ? 800 : 320} />;
}

export function Price({ product }: { product: ShopProduct }) {
  return (
    <span className="sx-price">
      {product.oldPriceXaf ? <s>{formatXaf(product.oldPriceXaf)}</s> : null}
      <strong>{formatXaf(product.priceXaf)}</strong>
    </span>
  );
}

/** En-tête de bloc : titre, information à côté (compte à rebours…), lien « Voir tout » avec sa flèche. */
export function ShowcaseHead({ id, title, aside, href, more = "Voir tous les produits", center = false }: { id: string; title: ReactNode; aside?: ReactNode; href?: string; more?: string; center?: boolean }) {
  return (
    <header className={`sx-head${center ? " sx-head--center" : ""}`}>
      <h2 id={id}>{title}</h2>
      {aside}
      {href && (
        <a className="sx-link" href={href}>
          {more} <ArrowRight aria-hidden="true" size={18} />
        </a>
      )}
    </header>
  );
}

/** Emplacement publicitaire : une image cliquable, au format de la maquette. */
export function AdBanner({ ad, className = "", eager = false }: { ad: Pick<AdSlot, "src" | "alt" | "href"> & { size?: [number, number] }; className?: string; eager?: boolean }) {
  const external = /^https?:\/\//.test(ad.href) && !ad.href.includes("prestafrik");
  return (
    <a className={`sx-ad ${className}`} href={ad.href} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
      <img alt={ad.alt} decoding="async" fetchPriority={eager ? "high" : "auto"} height={ad.size?.[1]} loading={eager ? "eager" : "lazy"} src={ad.src} width={ad.size?.[0]} />
    </a>
  );
}

/** Visuel de l'administration → emplacement publicitaire. */
export const announcementAd = (item: DashboardAnnouncement, fallbackHref: string) => ({ src: item.imageUrl, alt: item.altText, href: item.linkUrl ?? fallbackHref });

/* ---------- Héros ---------- */

/**
 * Héros (maquette) : à gauche le grand visuel (diaporama des visuels de l'administration, sinon le visuel
 * provisoire) ; à droite la bannière « Devenir vendeur » (destination des publicités) et un second visuel.
 * Téléphone : « Devenir vendeur » d'abord, puis le grand visuel.
 */
export function ShowcaseHero({ slides, side, sellerHref, sellerImage = null }: { slides: (Pick<AdSlot, "src" | "alt" | "href"> & { id: string })[]; side: Pick<AdSlot, "src" | "alt" | "href">; sellerHref: string; sellerImage?: DashboardAnnouncement | null }) {
  return (
    <>
      <section aria-label="Devenir vendeur sur PrestAfrik" className="shop-hero-mobile">
        <SellerBanner href={sellerHref} image={sellerImage} variant="mobile" />
      </section>
      <section aria-label="À la une" className="shop-hero sx-hero">
        <SpotlightCarousel label="À la une" slides={slides.map((slide, index) => ({ id: slide.id, node: <AdBanner ad={{ ...slide, size: [872, 520] }} className="sx-hero-main" eager={index === 0} /> }))} />
        <div className="sx-hero-side">
          <SellerBanner href={sellerHref} image={sellerImage} variant="desktop" />
          <AdBanner ad={{ ...side, size: [424, 248] }} className="sx-hero-side-ad" />
        </div>
      </section>
    </>
  );
}

/* ---------- Garanties ---------- */

export const shoppingPromises = [
  { icon: <HandCoins size={40} />, title: "Paiement à la livraison", text: "Vous payez à la réception" },
  { icon: <WhatsappMark size={40} />, title: "Commande sur WhatsApp", text: "Le vendeur vous répond vite" },
  { icon: <ShieldCheck size={40} />, title: "Vendeurs suivis", text: "Signalés, ils sont suspendus" },
  { icon: <SealCheck size={40} />, title: "Avis vérifiés", text: "Laissés par de vrais acheteurs" },
];

export function TrustStrip({ items }: { items: { icon: ReactNode; title: string; text: string }[] }) {
  return (
    <section aria-label="Nos engagements" className="sx-trust">
      {items.map(({ icon, title, text }) => (
        <div key={title}>
          <span aria-hidden="true">{icon}</span>
          <p>
            <strong>{title}</strong>
            <small>{text}</small>
          </p>
        </div>
      ))}
    </section>
  );
}

/* ---------- Bonnes affaires : un produit vedette et une grille ---------- */

export function DealsBoard({ id, title, aside, href, products }: { id: string; title: string; aside?: ReactNode; href: string; products: ShopProduct[] }) {
  const [lead, ...rest] = products;
  if (!lead) return null;
  return (
    <section aria-labelledby={id} className="shop-section sx-section" id="ventes-flash">
      <ShowcaseHead aside={aside} href={href} id={id} title={title} />
      <div className="sx-deals">
        <article className="sx-deal-lead">
          <span className="sx-deal-lead-media">
            <Photo large product={lead} />
            <ProductBadges product={lead} />
          </span>
          {lead.rating !== null && <Stars count={lead.reviewCount} rating={lead.rating} />}
          <a className="sx-deal-lead-name" href={lead.href}>
            {lead.name}
          </a>
          <Price product={lead} />
          <p className="sx-deal-lead-store">Vendu par {lead.store.name}. Commande sur WhatsApp, paiement à la livraison.</p>
          <a className="sx-btn sx-btn-primary" href={lead.href}>
            Voir le produit <ArrowRight aria-hidden="true" size={20} />
          </a>
        </article>
        <ul className="sx-deal-grid">
          {rest.slice(0, 8).map((product) => (
            <li key={product.id}>
              <a className="sx-deal" href={product.href}>
                <span className="sx-deal-media">
                  <Photo product={product} />
                  <ProductBadges product={product} />
                </span>
                <span className="sx-deal-name">{product.name}</span>
                <Price product={product} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Catégories ---------- */

/** Carrés de catégories (maquette) : une icône par catégorie, le nom et le nombre de produits. */
export function CategoryTiles({ categories, hrefFor }: { categories: ShopCategory[]; hrefFor: (slug: string) => string }) {
  if (!categories.length) return null;
  return (
    <section aria-labelledby="categories-title" className="shop-section sx-section" id="rubriques">
      <ShowcaseHead center id="categories-title" title="Achetez par catégorie" />
      <ScrollRail label="Catégories">
        {categories.map((category) => {
          const Icon = categoryGlyph(category.slug);
          return (
            <li key={category.slug}>
              <a className="sx-category" href={hrefFor(category.slug)}>
                <span aria-hidden="true" className="sx-category-icon">
                  <Icon size={56} />
                </span>
                <strong>{category.label}</strong>
                <small>
                  {category.productCount} produit{category.productCount > 1 ? "s" : ""}
                </small>
              </a>
            </li>
          );
        })}
      </ScrollRail>
    </section>
  );
}

/* ---------- Produits à onglets ---------- */

/**
 * Bloc à onglets (catégories, 4 au plus), grille de 8 produits. Colonne publicitaire à gauche (une grande
 * image) ou à droite (deux images), selon `side`.
 */
export function TabbedShowcase({ id, title, sections, allHref, hrefFor, ads, side }: { id: string; title: string; sections: { category: ShopCategory; products: ShopProduct[] }[]; allHref: string; hrefFor: (slug: string) => string; ads: Pick<AdSlot, "src" | "alt" | "href" | "size">[]; side: "left" | "right" }) {
  if (!sections.length) return null;
  const grid = (products: ShopProduct[]) => (
    <ul className="sx-grid">
      {products.slice(0, 8).map((product) => (
        <li key={product.id}>
          <ShopProductCard product={product} />
        </li>
      ))}
    </ul>
  );
  // « Tout » mélange les catégories du bloc à tour de rôle (un produit de chacune, puis le suivant…).
  const mixed: ShopProduct[] = [];
  for (let round = 0; mixed.length < 8 && round < 8; round++) for (const section of sections) if (section.products[round] && mixed.length < 8) mixed.push(section.products[round]);
  const tabs = [
    ...(sections.length > 1 ? [{ id: "tout", label: "Tout", href: allHref, panel: grid(mixed) }] : []),
    ...sections.map(({ category, products }) => ({ id: category.slug, label: category.label, href: hrefFor(category.slug), panel: grid(products) })),
  ];
  return (
    <section aria-labelledby={id} className={`shop-section sx-section sx-tabbed sx-tabbed--${side}`}>
      <div className="sx-tabbed-side">
        {ads.map((ad) => (
          <AdBanner ad={ad} key={ad.src} />
        ))}
      </div>
      <ShowcaseTabs more={allHref} tabs={tabs} title={title} titleId={id} />
    </section>
  );
}

/* ---------- Bannières ---------- */

export function BannerDuo({ ads }: { ads: Pick<AdSlot, "src" | "alt" | "href" | "size">[] }) {
  return (
    <section aria-label="À découvrir" className="sx-duo">
      {ads.map((ad) => (
        <AdBanner ad={ad} key={ad.src} />
      ))}
    </section>
  );
}

export function WideBanner({ ad }: { ad: Pick<AdSlot, "src" | "alt" | "href" | "size"> }) {
  return (
    <section aria-label="Offre" className="sx-wide">
      <AdBanner ad={ad} />
    </section>
  );
}

/* ---------- Quatre mini-listes ---------- */

export function MiniLists({ lists }: { lists: { id: string; title: string; href: string; products: ShopProduct[] }[] }) {
  const shown = lists.map((list) => ({ ...list, products: list.products.filter((product) => product.imageUrl) })).filter((list) => list.products.length);
  if (!shown.length) return null;
  return (
    <section aria-label="Sélections" className="sx-minis">
      {shown.map((list) => (
        <div className="sx-mini" key={list.id}>
          <h2 id={`mini-${list.id}`}>
            <a href={list.href}>{list.title}</a>
          </h2>
          <ul aria-labelledby={`mini-${list.id}`}>
            {list.products.slice(0, 3).map((product) => (
              <li key={product.id}>
                <a href={product.href}>
                  <span className="sx-mini-media">
                    <Photo product={product} />
                  </span>
                  <span className="sx-mini-text">
                    <span>{product.name}</span>
                    <Price product={product} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* ---------- Bande « Club » : chaîne WhatsApp et boutiques ---------- */

export function ClubBand({ channel, stores, sellerHref }: { channel: string; stores: ShopStore[]; sellerHref: string }) {
  return (
    <section aria-labelledby="club-title" className="sx-club" id="boutiques">
      <div className="sx-wrap">
        <h2 id="club-title">Ne manquez aucune bonne affaire</h2>
        <p>Rejoignez le Club PrestAfrik sur WhatsApp : nouvelles boutiques, promotions et conseils, une fois par semaine.</p>
        <div className="sx-club-actions">
          <a className="sx-btn sx-btn-primary" href={channel} rel="noopener noreferrer" target="_blank">
            <WhatsappMark size={20} /> Rejoindre la chaîne
          </a>
          <a className="sx-btn sx-btn-ghost" data-emplacement="club" href={sellerHref}>
            Ouvrir ma boutique <ArrowRight aria-hidden="true" size={20} />
          </a>
        </div>
        {stores.length > 0 && (
          <ul aria-label="Boutiques à la une" className="sx-club-stores">
            {stores.slice(0, 8).map((store) => (
              <li key={store.id}>
                <a href={store.href} title={store.name}>
                  <span aria-hidden="true">{store.logoUrl ? <img alt="" height={56} loading="lazy" src={store.logoUrl} width={56} /> : initials(store.name)}</span>
                  <small>{store.name}</small>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
