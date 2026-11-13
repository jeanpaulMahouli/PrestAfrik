import { CheckCircle, CreditCard, HandCoins, House, MapPin, Package, ShieldCheck, Truck } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stars } from "@/components/shop/product-card";
import { DetailTabs, LikeButton, ProductBuy, ProductGallery, ReviewForm } from "@/components/shop/product-page";
import { categoryHref, ShopShell } from "@/components/shop/shop-shell";
import { MiniLists } from "@/components/shop/shop-showcase";
import { WhatsappMark } from "@/components/shop/whatsapp-mark";
import { RichText } from "@/components/ui/rich-text";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { getShopTicker, getShopTickerSeconds } from "@/modules/announcements/queries";
import { formatXaf } from "@/modules/catalog/format";
import { richTextToPlain } from "@/modules/catalog/rich-text";
import { getPublishedProduct, getStorefrontStore } from "@/modules/catalog/service";
import { getShopScope } from "@/modules/marketplace/country";
import { countryName } from "@/modules/marketplace/search";
import { getProductNeighbours, marketplaceProductPath, marketplaceStore } from "@/modules/marketplace/shop";
import { getProductReviews } from "@/modules/reviews/queries";
import { getLikeSummary } from "@/modules/marketplace/likes";

export const dynamic = "force-dynamic";

type Params = PageProps<"/nos-boutiques/produit/[boutique]/[produit]">["params"];

/** Produit d'une boutique visible sur la marketplace (publiée, non suspendue), ou null. */
async function load(params: Params) {
  const { boutique, produit } = await params;
  const listed = await marketplaceStore(boutique);
  if (!listed) return null;
  const store = await getStorefrontStore(boutique);
  if (!store || store.isPreview) return null;
  const product = await getPublishedProduct(store.id, produit);
  return product ? { listed, store, product } : null;
}

const summary = (product: { name: string; description: string | null; priceXaf: number; promotionalPriceXaf: number | null }, storeName: string) => {
  const text = product.description ? richTextToPlain(product.description).replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, 160) : `${product.name} à ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)} chez ${storeName}. Commande sur WhatsApp, paiement à la livraison.`;
};

export async function generateMetadata({ params }: PageProps<"/nos-boutiques/produit/[boutique]/[produit]">): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Produit introuvable | PrestAfrik", robots: { index: false } };
  const { store, product } = found;
  const path = marketplaceProductPath(store.slug, product.slug);
  return {
    title: { absolute: `${product.name} – ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)} | ${store.name} sur PrestAfrik` },
    description: summary(product, store.name),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "PrestAfrik",
      locale: "fr_CM",
      url: path,
      title: `${product.name} — ${formatXaf(product.promotionalPriceXaf ?? product.priceXaf)}`,
      description: summary(product, store.name),
      ...(product.images.length ? { images: product.images.map((image) => ({ url: absoluteUrl(image.url), alt: image.altText ?? product.name })) } : {}),
    },
  };
}

/**
 * Fiche produit de la marketplace (maquette « Product Detail ») : le produit reste sur prestafrik.com.
 * Galerie, note, informations, prix, variantes, quantité, « Commander » (page de commande de la boutique
 * avec le produit dans le panier) et WhatsApp ; onglets Description, Avis, Livraison et paiement ; quatre
 * listes de produits en bas.
 */
export default async function MarketplaceProductPage({ params }: PageProps<"/nos-boutiques/produit/[boutique]/[produit]">) {
  const found = await load(params);
  if (!found) notFound();
  const { listed, store, product } = found;
  const scope = await getShopScope();
  const [likes, reviews, neighbours, ticker, tickerSeconds] = await Promise.all([
    getLikeSummary(product.id),
    store.reviewsEnabled ? getProductReviews(store.id, product.id) : null,
    getProductNeighbours(listed, product.id, scope),
    getShopTicker(),
    getShopTickerSeconds(),
  ]);
  const path = marketplaceProductPath(store.slug, product.slug);
  const productUrl = absoluteUrl(path);
  const storeHref = storePublicUrl(store.slug);
  const promo = product.promotionalPriceXaf !== null && product.promotionalPriceXaf < product.priceXaf ? product.promotionalPriceXaf : null;
  const price = promo ?? product.priceXaf;
  const discount = promo === null ? null : Math.round((1 - promo / product.priceXaf) * 100);
  const rating = reviews && reviews.summary.count > 0 ? reviews.summary : null;
  const inStock = product.trackInventory && product.stockQuantity !== null ? product.stockQuantity > 0 : true;
  const menu = new Map(neighbours.sections.map(({ category, products }) => [category.slug, products]));

  const structuredData = {
    "@type": "Product",
    name: product.name,
    url: productUrl,
    description: summary(product, store.name),
    ...(product.images.length ? { image: product.images.map((image) => absoluteUrl(image.url)) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      price,
      priceCurrency: "XAF",
      availability: product.availability === "PREORDER" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: store.name, url: storeHref },
    },
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 } } : {}),
  };

  return (
    <ShopShell active={listed.activitySlug ?? undefined} categories={neighbours.categories} local={false} menu={menu} scope={scope} ticker={ticker} tickerSeconds={tickerSeconds}>
      <script dangerouslySetInnerHTML={jsonLd(structuredData)} type="application/ld+json" />
      <nav aria-label="Fil d’Ariane" className="sx-crumbs">
        <ol className="sx-wrap">
          <li>
            <a href={shopUrl("/")}>
              <House aria-hidden="true" size={20} /> Accueil
            </a>
          </li>
          {listed.activitySlug && listed.activity && (
            <li>
              <a href={categoryHref(listed.activitySlug)}>{listed.activity}</a>
            </li>
          )}
          <li>
            <a href={storeHref}>{store.name}</a>
          </li>
          <li>
            <span aria-current="page">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="sx-wrap sx-stack">
        <div className="sx-product">
          <ProductGallery images={product.images} name={product.name} />
          <ProductBuy
            canOrder={!store.subscriptionPaused}
            cartHref={shopUrl("/panier")}
            checkoutHref={shopUrl(`/commande?boutique=${encodeURIComponent(store.slug)}`)}
            product={product}
            productUrl={productUrl}
            store={{ id: store.id, slug: store.slug, name: store.name, logoUrl: listed.logoUrl, href: storeHref }}
          >
            <div className="sx-product-top">
              {rating ? (
                <a className="sx-product-rating" href="#avis">
                  <Stars count={rating.count} rating={rating.average} />
                  <strong>{rating.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} sur 5</strong>
                  <span>
                    ({rating.count} avis client{rating.count > 1 ? "s" : ""})
                  </span>
                </a>
              ) : store.reviewsEnabled ? (
                <a className="sx-product-rating" href="#avis">
                  Soyez le premier à noter ce produit
                </a>
              ) : (
                <span />
              )}
              {likes && <LikeButton initial={likes} productId={product.id} />}
            </div>
            <h1 className="sx-product-title">{product.name}</h1>
            <dl className="sx-product-meta">
              {product.sku && (
                <div>
                  <dt>Référence :</dt>
                  <dd>{product.sku}</dd>
                </div>
              )}
              <div>
                <dt>Disponibilité :</dt>
                <dd className={inStock ? "is-ok" : "is-out"}>{product.availability === "PREORDER" ? "Précommande" : inStock ? "En stock" : "Stock à confirmer"}</dd>
              </div>
              <div>
                <dt>Boutique :</dt>
                <dd>
                  <a href={storeHref}>{store.name}</a>
                </dd>
              </div>
              {listed.activity && (
                <div>
                  <dt>Catégorie :</dt>
                  <dd>{listed.activity}</dd>
                </div>
              )}
            </dl>
            <p className="sx-product-price">
              <strong>{formatXaf(price)}</strong>
              {promo !== null && <s>{formatXaf(product.priceXaf)}</s>}
              {discount ? <span className="sx-badge sx-badge--deal">−{discount} %</span> : null}
            </p>
          </ProductBuy>
          <aside aria-label="Vendeur et garanties" className="sx-product-side">
            <div className="sx-seller-card">
              <span aria-hidden="true" className="sx-seller-logo">
                {listed.logoUrl ? <img alt="" height={56} src={listed.logoUrl} width={56} /> : store.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p>Vendu par</p>
                <a href={storeHref}>{store.name}</a>
                <small>
                  <MapPin aria-hidden="true" size={16} /> {[listed.city, countryName(listed.country)].filter(Boolean).join(", ")}
                </small>
              </div>
            </div>
            <ul className="sx-guarantees">
              <li>
                <HandCoins aria-hidden="true" size={24} /> Paiement à la livraison
              </li>
              <li>
                <WhatsappMark size={24} /> Commande confirmée sur WhatsApp
              </li>
              <li>
                <ShieldCheck aria-hidden="true" size={24} /> Vendeur suivi par PrestAfrik
              </li>
            </ul>
          </aside>
        </div>

        <DetailTabs
          tabs={[
            {
              id: "description",
              label: "Description",
              panel: (
                <div className="sx-detail-grid">
                  <div>
                    <h2>Description</h2>
                    {product.description ? <RichText className="rich-text sx-rich" source={product.description} /> : <p>Le vendeur n’a pas encore ajouté de description. Posez-lui vos questions sur WhatsApp.</p>}
                  </div>
                  <div>
                    <h2>Points forts</h2>
                    <ul className="sx-feature-list">
                      <li>
                        <HandCoins aria-hidden="true" size={24} /> Vous payez à la livraison
                      </li>
                      <li>
                        <WhatsappMark size={24} /> Le vendeur vous répond sur WhatsApp
                      </li>
                      <li>
                        <CheckCircle aria-hidden="true" size={24} /> Prix fixé par le vendeur
                      </li>
                      <li>
                        <ShieldCheck aria-hidden="true" size={24} /> Vendeurs signalés suspendus
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h2>Livraison</h2>
                    <ul className="sx-feature-list">
                      <li>
                        <Truck aria-hidden="true" size={24} /> Frais et délais selon votre quartier, indiqués à la commande
                      </li>
                      <li>
                        <Package aria-hidden="true" size={24} /> Retrait possible si la boutique le propose
                      </li>
                      <li>
                        <CreditCard aria-hidden="true" size={24} /> Aucun paiement en ligne demandé
                      </li>
                    </ul>
                  </div>
                </div>
              ),
            },
            {
              id: "avis",
              label: rating ? `Avis (${rating.count})` : "Avis",
              panel: (
                <div className="sx-reviews-layout">
                  {reviews && reviews.reviews.length ? (
                <ul className="sx-reviews">
                  {reviews.reviews.map((review) => (
                    <li key={review.id}>
                      <Stars count={1} rating={review.rating} />
                      <p className="sx-review-head">
                        <strong>{review.authorName}</strong> · {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {review.comment && <p>{review.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sx-detail-empty">Pas encore d’avis sur ce produit. Soyez le premier à donner votre note.</p>
              )}
                  {store.reviewsEnabled ? <ReviewForm productId={product.id} /> : <p className="sx-detail-empty">La boutique n’accepte pas les avis pour le moment.</p>}
                </div>
              ),
            },
            {
              id: "livraison",
              label: "Livraison et paiement",
              panel: (
                <div className="sx-detail-grid">
                  <div>
                    <h2>Comment commander ?</h2>
                    <ol className="sx-steps">
                      <li>Choisissez la quantité, puis « Commander » ou « Ajouter au panier ».</li>
                      <li>Le vendeur confirme votre commande sur WhatsApp.</li>
                      <li>Vous êtes livré et vous payez à la réception.</li>
                    </ol>
                  </div>
                  <div>
                    <h2>Paiement</h2>
                    <p>Vous payez à la livraison, directement au vendeur ou à son livreur. PrestAfrik ne vous demande jamais de payer à l’avance.</p>
                  </div>
                  <div>
                    <h2>Une question ?</h2>
                    <p>
                      Après votre commande, {store.name} vous contacte sur WhatsApp. Vous pouvez aussi visiter <a href={storeHref}>la boutique</a>.
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
        />

        <MiniLists
          lists={[
            { id: "boutique", title: `Chez ${store.name}`, href: storeHref, products: neighbours.sameStore },
            { id: "similaires", title: "Produits similaires", href: listed.activitySlug ? categoryHref(listed.activitySlug) : shopUrl("/recherche"), products: neighbours.similar },
            { id: "affaires", title: "Bonnes affaires", href: shopUrl("/recherche?tri=promo&promo=1"), products: neighbours.deals },
            { id: "nouveautes", title: "Nouveautés", href: shopUrl("/recherche?tri=nouveautes"), products: neighbours.newest },
          ]}
        />
      </div>
    </ShopShell>
  );
}
