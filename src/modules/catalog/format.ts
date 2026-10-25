export function formatXaf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

/** Réduction d'un produit en promotion, arrondie à l'entier (« -15 % »), ou 0 sans vraie baisse de prix. */
export function discountPercent({ priceXaf, promotionalPriceXaf }: { priceXaf: number; promotionalPriceXaf: number | null }) {
  if (!promotionalPriceXaf || promotionalPriceXaf <= 0 || promotionalPriceXaf >= priceXaf) return 0;
  return Math.round(((priceXaf - promotionalPriceXaf) / priceXaf) * 100);
}
