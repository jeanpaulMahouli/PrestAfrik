import Link from "next/link";
import Image from "next/image";
import { ProductAvailability, type Product } from "@prisma/client";
import { archiveProduct } from "@/modules/catalog/actions";
import { formatXaf } from "@/modules/catalog/service";
import { SubmitButton } from "@/components/ui/submit-button";

type ProductRow = Product & {
  category: { name: string } | null;
  images: { url: string }[];
};

const availabilityLabel: Record<ProductAvailability, string> = {
  AVAILABLE: "Disponible",
  SOLD_OUT: "Épuisé",
  PREORDER: "Sur commande",
};

export function ProductTable({
  products,
  canManage,
}: {
  products: ProductRow[];
  canManage: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <div className="responsive-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col">Disponibilité</th>
            <th scope="col">Stock</th>
            <th scope="col">Prix</th>
            <th scope="col">Prix promo</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="product-table-name">
                  {product.images[0] ? (
                    <Image alt="" height={56} src={product.images[0].url} width={56} />
                  ) : (
                    <span aria-hidden="true" className="product-image-placeholder" />
                  )}
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku}{product.category ? ` · ${product.category.name}` : ""}</small>
                    {canManage && !product.isArchived && (
                      <span className="product-row-actions">
                        <Link href={`/dashboard/produits/${product.id}`}>Modifier</Link>
                        <form action={archiveProduct}>
                          <input name="productId" type="hidden" value={product.id} />
                          <SubmitButton className="text-link" pendingLabel="Archivage…">
                            Archiver
                          </SubmitButton>
                        </form>
                      </span>
                    )}
                  </span>
                </div>
              </td>
              <td><span className={`status-badge status-${product.availability.toLowerCase()}`}>{availabilityLabel[product.availability]}</span></td>
              <td>{product.trackInventory ? product.stockQuantity ?? "—" : "—"}</td>
              <td>{formatXaf(product.priceXaf)}</td>
              <td>{product.promotionalPriceXaf === null ? "—" : formatXaf(product.promotionalPriceXaf)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
