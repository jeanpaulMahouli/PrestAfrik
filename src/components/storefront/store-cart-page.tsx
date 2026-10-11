"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatXaf } from "@/modules/catalog/format";
import { checkoutOrderAction, type CheckoutActionState } from "@/modules/orders/actions";
import { useStoreCart } from "@/components/storefront/store-cart-provider";
import { SubmitButton } from "@/components/ui/submit-button";

type PricedLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPriceXaf: number;
  lineTotalXaf: number;
};

type DeliveryQuote = {
  subtotalXaf: number;
  deliveryFeeXaf: number | null;
  totalXaf: number | null;
  quoteToken: string;
  error?: string;
};

export function StoreCartPage({
  storeSlug,
  storeCity,
}: {
  storeSlug: string;
  storeCity: string;
}) {
  const router = useRouter();
  const cart = useStoreCart();
  const [lines, setLines] = useState<PricedLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [basketError, setBasketError] = useState("");
  const [basketRetryVersion, setBasketRetryVersion] = useState(0);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("+237 ");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(storeCity);
  const [neighborhood, setNeighborhood] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteKey, setQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRefreshVersion, setQuoteRefreshVersion] = useState(0);
  const [checkoutErrorDismissed, setCheckoutErrorDismissed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [state, action, pending] = useActionState<CheckoutActionState, FormData>(checkoutOrderAction, null);
  const quoteRequestKey = JSON.stringify([
    storeSlug,
    cart.items,
    city.trim(),
    neighborhood.trim(),
    deliveryMethod,
  ]);

  useEffect(() => {
    if (!cart.ready || cart.items.length === 0) {
      setLines([]);
      setSubtotal(0);
      setBasketError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/boutique/${encodeURIComponent(storeSlug)}/panier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items }),
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as
          | { items: PricedLine[]; subtotalXaf: number }
          | { error: string };
        if (controller.signal.aborted) return;
        if (!response.ok || "error" in data) {
          setLines([]);
          setSubtotal(0);
          setBasketError("error" in data ? data.error : "Ton panier n’est plus disponible.");
          return;
        }
        setBasketError("");
        setLines(data.items);
        setSubtotal(data.subtotalXaf);
        const current = new Set(data.items.map((line) => `${line.productId}:${line.variantId ?? ""}`));
        for (const item of cart.items) {
          if (!current.has(`${item.productId}:${item.variantId ?? ""}`)) {
            cart.remove(item.productId, item.variantId);
          }
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        setLines([]);
        setSubtotal(0);
        setBasketError("Impossible de vérifier les produits. Réessaie dans un instant.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [basketRetryVersion, cart.items, cart.ready, cart.remove, storeSlug]);

  useEffect(() => {
    if (state?.reference && state.trackingToken) {
      cart.clear();
      router.replace(`/commande/suivi/${state.trackingToken}`);
    }
  }, [cart, router, state]);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (!cart.items.length || city.trim().length < 2 || !neighborhood.trim()) {
      setQuote(null);
      setQuoteKey("");
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    setQuote(null);
    setQuoteKey("");
    setQuoteLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/boutique/${encodeURIComponent(storeSlug)}/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          city: city.trim(),
          neighborhood: neighborhood.trim(),
          deliveryMethod,
        }),
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const data = (await response.json()) as DeliveryQuote | { error: string };
          if (controller.signal.aborted) return;
          if (!response.ok || "error" in data) {
            setQuote({
              subtotalXaf: subtotal,
              deliveryFeeXaf: null,
              totalXaf: null,
              quoteToken: "",
              error: "error" in data ? data.error : "Vérifie les frais de livraison.",
            });
            setQuoteKey(quoteRequestKey);
            return;
          }
          setQuote(data);
          setQuoteKey(quoteRequestKey);
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(error instanceof Error && error.name === "AbortError")
          ) {
            setQuote({ subtotalXaf: subtotal, deliveryFeeXaf: null, totalXaf: null, quoteToken: "", error: "Frais de livraison indisponibles. Réessaie." });
            setQuoteKey(quoteRequestKey);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoteLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cart.items, city, deliveryMethod, neighborhood, quoteRefreshVersion, quoteRequestKey, storeSlug, subtotal]);

  useEffect(() => {
    if (state?.error?.includes("Le prix ou la livraison a changé")) {
      setCheckoutErrorDismissed(true);
      setQuote(null);
      setQuoteKey("");
      setQuoteRefreshVersion((version) => version + 1);
    }
  }, [state]);

  const displayedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        currentCartLine: cart.items.find(
          (item) => item.productId === line.productId && item.variantId === line.variantId,
        ),
      })),
    [cart.items, lines],
  );

  if (loading || !cart.ready) {
    return (
      <p aria-live="polite" aria-busy="true" className="surface-card cart-message">
        <span aria-hidden="true" className="loading-spinner loading-spinner-inline" />
        Vérification du panier…
      </p>
    );
  }

  if (!cart.items.length) {
    return (
      <section className="empty-state">
        <h1>Ton panier est vide.</h1>
        <p>Découvre les produits et choisis ceux qui te plaisent.</p>
        <Link className="primary-button" href={`/boutique/${storeSlug}`}>Voir les produits</Link>
      </section>
    );
  }

  const validQuote = quote && quoteKey === quoteRequestKey && !quote.error && quote.quoteToken;

  return (
    <section className="checkout-layout">
      <form
        action={action}
        className="checkout-form"
        onSubmit={() => setCheckoutErrorDismissed(false)}
      >
        <input name="storeSlug" type="hidden" value={storeSlug} />
        <input name="items" type="hidden" value={JSON.stringify(cart.items)} />
        <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
        <input name="quoteToken" type="hidden" value={validQuote ? quote.quoteToken : ""} />
        <h1>Finaliser ma commande</h1>
        <p className="checkout-intro">Pas de compte à créer. Tu paies à la livraison.</p>

        {basketError && <p aria-live="polite" className="form-error" role="alert">{basketError}</p>}
        {cart.error && <p aria-live="polite" className="form-error" role="alert">{cart.error}</p>}
        {state?.error && !checkoutErrorDismissed && <p aria-live="polite" className="form-error" role="alert">{state.error}</p>}
        {basketError && (
          <div className="page-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setBasketError("");
                setLoading(true);
                setBasketRetryVersion((version) => version + 1);
              }}
              type="button"
            >
              Réessayer la vérification
            </button>
            <button className="text-link" onClick={cart.clear} type="button">
              Vider le panier et recommencer
            </button>
          </div>
        )}

        <label className="form-field">
          Nom
          <input autoComplete="name" maxLength={120} name="name" onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className="form-field">
          Numéro WhatsApp
          <input
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            name="whatsapp"
            onChange={(event) => setWhatsapp(event.target.value)}
            required
            type="tel"
            value={whatsapp}
          />
        </label>
        <div className="product-price-grid">
          <label className="form-field">
            Ville
            <input autoComplete="address-level2" maxLength={100} name="city" onChange={(event) => setCity(event.target.value)} required value={city} />
          </label>
          <label className="form-field">
            Quartier
            <input autoComplete="address-level3" maxLength={120} name="neighborhood" onChange={(event) => setNeighborhood(event.target.value)} required value={neighborhood} />
          </label>
        </div>
        <label className="form-field">
          Point de repère
          <input autoComplete="address-line2" maxLength={250} name="landmark" onChange={(event) => setLandmark(event.target.value)} placeholder="Près de la pharmacie…" value={landmark} />
        </label>
        <details className="checkout-optional-fields">
          <summary>Autres informations (facultatif)</summary>
          <label className="form-field">
            E-mail
            <input autoComplete="email" maxLength={254} name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="form-field">
            Commentaire
            <textarea maxLength={500} name="comment" rows={3} />
          </label>
        </details>
        <div aria-label="Mode de réception" className="delivery-method-options">
          <label className={deliveryMethod === "DELIVERY" ? "selected" : ""}>
            <input checked={deliveryMethod === "DELIVERY"} name="deliveryMethod" onChange={() => setDeliveryMethod("DELIVERY")} type="radio" value="DELIVERY" />
            Livraison
          </label>
          <label className={deliveryMethod === "PICKUP" ? "selected" : ""}>
            <input checked={deliveryMethod === "PICKUP"} name="deliveryMethod" onChange={() => setDeliveryMethod("PICKUP")} type="radio" value="PICKUP" />
            Retrait en boutique
          </label>
        </div>
        <label className="consent-field">
          <input name="followUpConsent" required type="checkbox" />
          J’accepte de recevoir le suivi de ma commande sur WhatsApp.
        </label>
        <label className="consent-field">
          <input name="marketingConsent" type="checkbox" />
          Je veux recevoir les offres de la boutique (facultatif).
        </label>
        <div aria-live="polite" className="checkout-summary">
          <p><span>Sous-total</span><span>{formatXaf(subtotal)}</span></p>
          <p>
            <span>
              Livraison
              {quoteLoading && (
                <>
                  <span aria-hidden="true" className="loading-spinner loading-spinner-inline" />
                  {" · vérification…"}
                </>
              )}
            </span>
            <span>{quote?.deliveryFeeXaf === null || quote?.deliveryFeeXaf === undefined ? "Frais à confirmer" : formatXaf(quote.deliveryFeeXaf)}</span>
          </p>
          {quote?.error && <p className="form-error">{quote.error}</p>}
          {quote?.totalXaf !== null && quote?.totalXaf !== undefined && (
            <p className="checkout-total"><span>Total à la livraison</span><strong>{formatXaf(quote.totalXaf)}</strong></p>
          )}
        </div>
        <SubmitButton
          className="primary-button full-width"
          disabled={!validQuote || Boolean(basketError) || !idempotencyKey}
          loading={pending}
          pendingLabel="Enregistrement…"
        >
          Commander
        </SubmitButton>
        {!validQuote && !quoteLoading && <p className="dashboard-copy">Indique ta ville et ton quartier pour vérifier les frais de livraison.</p>}
      </form>
      <aside className="surface-card checkout-cart">
        <h2>Ton panier</h2>
        {displayedLines.map(({ currentCartLine, ...line }) => (
          <article className="checkout-line" key={`${line.productId}:${line.variantId ?? ""}`}>
            <div>
              <strong>{line.productName}</strong>
              {line.variantName && <small>{line.variantName}</small>}
              <small>{formatXaf(line.unitPriceXaf)} · référence {line.sku}</small>
            </div>
            <label>
              Quantité
              <input
                aria-label={`Quantité de ${line.productName}`}
                max={25}
                min={1}
                type="number"
                value={currentCartLine?.quantity ?? line.quantity}
                onBlur={(event) => {
                  const quantity = Number(event.currentTarget.value);
                  if (!Number.isSafeInteger(quantity) || quantity < 1) {
                    cart.changeQuantity(line.productId, line.variantId, line.quantity);
                  }
                }}
                onChange={(event) => {
                  const quantity = Number(event.currentTarget.value);
                  if (Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 25) {
                    cart.changeQuantity(line.productId, line.variantId, quantity);
                  }
                }}
              />
            </label>
            <strong>{formatXaf(line.lineTotalXaf)}</strong>
            <button className="text-link" onClick={() => cart.remove(line.productId, line.variantId)} type="button">Retirer</button>
          </article>
        ))}
      </aside>
    </section>
  );

}
