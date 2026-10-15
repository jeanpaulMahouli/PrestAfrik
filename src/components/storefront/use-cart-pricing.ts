"use client";

import { useEffect, useState } from "react";
import { useStoreCart } from "@/components/storefront/store-cart-provider";

export type PricedLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPriceXaf: number;
  lineTotalXaf: number;
};

/** Prix à jour du panier, recalculés par le serveur (les prix du navigateur ne font jamais foi). */
export function useCartPricing(storeSlug: string) {
  const cart = useStoreCart();
  const [lines, setLines] = useState<PricedLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { items, ready, remove } = cart;

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      setLines([]);
      setSubtotal(0);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/boutique/${encodeURIComponent(storeSlug)}/panier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as { items: PricedLine[]; subtotalXaf: number } | { error: string };
        if (controller.signal.aborted) return;
        if (!response.ok || "error" in data) {
          setLines([]);
          setSubtotal(0);
          setError("error" in data ? data.error : "Votre panier n’est plus disponible.");
          return;
        }
        setError("");
        setLines(data.items);
        setSubtotal(data.subtotalXaf);
        // Produits retirés ou archivés entre-temps : ils quittent le panier.
        const current = new Set(data.items.map((line) => `${line.productId}:${line.variantId ?? ""}`));
        for (const item of items) if (!current.has(`${item.productId}:${item.variantId ?? ""}`)) remove(item.productId, item.variantId);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || (caught instanceof Error && caught.name === "AbortError")) return;
        setError("Impossible de vérifier les prix. Vérifiez votre connexion puis réessayez.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [items, ready, remove, retry, storeSlug]);

  return { cart, lines, subtotal, loading: loading || !ready, error, retry: () => setRetry((value) => value + 1) };
}
