import Link from "next/link";
import { StoreImage } from "@/components/ui/store-image";
import { formatXaf } from "@/modules/catalog/format";

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  priceXaf: number;
  promotionalPriceXaf: number | null;
  images: { url: string; altText: string | null }[];
};

export function StorefrontProductGrid({
  storeSlug,
  products,
}: {
  storeSlug: string;
  products: StoreProduct[];
}) {
  return (
    <>
      <div className="storefront-product-grid">
        {products.map((product) => (
          <article className="storefront-product-card" key={product.id}>
            <Link aria-label={`Voir ${product.name}`} className="storefront-product-link" href={`/boutique/${storeSlug}/${product.slug}`}>
              {product.images[0] ? (
                <StoreImage
                  alt={product.images[0].altText ?? product.name}
                  className="storefront-product-image"
                  height={640}
                  sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
                  src={product.images[0].url}
                  width={640}
                />
              ) : (
                <span aria-hidden="true" className="storefront-product-placeholder" />
              )}
              <span className="storefront-product-info">
                <strong>{product.name}</strong>
                <span>
                  {product.promotionalPriceXaf ? (
                    <>
                      <del>{formatXaf(product.priceXaf)}</del>{" "}
                      <strong>{formatXaf(product.promotionalPriceXaf)}</strong>
                    </>
                  ) : (
                    formatXaf(product.priceXaf)
                  )}
                </span>
              </span>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
