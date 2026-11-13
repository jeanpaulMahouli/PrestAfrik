"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Minus, Plus, ShoppingCartSimple, Storefront, Trash } from "@phosphor-icons/react/ssr";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { cartChangeEvent, StoreCartProvider, storageKey } from "@/components/storefront/store-cart-provider";
import { useCartPricing } from "@/components/storefront/use-cart-pricing";
import { PhoneInput } from "@/components/ui/phone-input";
import { uuid } from "@/lib/uuid";
import { formatXaf } from "@/modules/catalog/format";
import { checkoutOrderAction, type CheckoutActionState } from "@/modules/orders/actions";
import type { StorefrontZone } from "@/modules/storefront/data";

// Panier de la marketplace. Une commande appartient toujours à une boutique : le panier est rangé par
// boutique (une ligne de stockage par boutique, la même que celle des vitrines), et chaque boutique se
// commande séparément, sur la marketplace. Prix et disponibilités sont toujours recalculés par le serveur.

export type CartStore = { id: string; slug: string; name: string; logoUrl: string | null };

const registryKey = "prestafrik-marketplace-boutiques";

function readRegistry(): Record<string, CartStore> {
  try {
    return JSON.parse(localStorage.getItem(registryKey) ?? "{}") as Record<string, CartStore>;
  } catch {
    return {};
  }
}

/** Retient la boutique d'un produit ajouté depuis la marketplace (nom et adresse pour le panier). */
export function rememberCartStore(store: CartStore) {
  try {
    localStorage.setItem(registryKey, JSON.stringify({ ...readRegistry(), [store.id]: store }));
  } catch {
    // Stockage indisponible (navigation privée) : le panier de cette page reste utilisable.
  }
}

/** Boutiques dont le panier n'est pas vide, avec le nombre d'articles. */
function readCarts(): { store: CartStore; count: number }[] {
  try {
    const registry = readRegistry();
    return Object.values(registry).flatMap((store) => {
      const items = JSON.parse(localStorage.getItem(`${storageKey}:${store.id}`) ?? "[]") as { quantity: number }[];
      const count = Array.isArray(items) ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;
      return count > 0 ? [{ store, count }] : [];
    });
  } catch {
    return [];
  }
}

function useCarts() {
  const [carts, setCarts] = useState<{ store: CartStore; count: number }[] | null>(null);
  useEffect(() => {
    const update = () => setCarts(readCarts());
    update();
    window.addEventListener(cartChangeEvent, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(cartChangeEvent, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return carts;
}

/** Bouton « Panier » de l'en-tête, avec le nombre d'articles. */
export function CartLink({ href }: { href: string }) {
  const carts = useCarts();
  const count = carts?.reduce((sum, cart) => sum + cart.count, 0) ?? 0;
  return (
    <a aria-label={count ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"} className="sx-cart-link" href={href}>
      <ShoppingCartSimple aria-hidden="true" size={26} />
      {count > 0 && <span className="sx-cart-count">{count}</span>}
    </a>
  );
}

function Quantity({ value, onChange, max = 25 }: { value: number; onChange: (value: number) => void; max?: number }) {
  return (
    <span className="sx-qty sx-qty--small">
      <button aria-label="Retirer un" disabled={value <= 1} onClick={() => onChange(value - 1)} type="button">
        <Minus aria-hidden="true" size={14} />
      </button>
      <output>{String(value).padStart(2, "0")}</output>
      <button aria-label="Ajouter un" disabled={value >= max} onClick={() => onChange(value + 1)} type="button">
        <Plus aria-hidden="true" size={14} />
      </button>
    </span>
  );
}

/** Une boutique du panier : ses produits, prix recalculés, et « Commander chez … ». */
function StoreCartSection({ store, checkoutHref }: { store: CartStore; checkoutHref: string }) {
  const { cart, lines, subtotal, loading, error, retry } = useCartPricing(store.slug);
  if (cart.ready && cart.items.length === 0) return null;
  return (
    <section aria-labelledby={`panier-${store.id}`} className="sx-cart-store">
      <header>
        <span aria-hidden="true" className="sx-seller-logo">
          {store.logoUrl ? <img alt="" height={40} src={store.logoUrl} width={40} /> : store.name.slice(0, 2).toUpperCase()}
        </span>
        <h2 id={`panier-${store.id}`}>{store.name}</h2>
      </header>
      {error && (
        <p className="sx-notice sx-notice--error" role="alert">
          {error}{" "}
          <button onClick={retry} type="button">
            Réessayer
          </button>
        </p>
      )}
      <table className="sx-cart-table">
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col">Prix</th>
            <th scope="col">Quantité</th>
            <th scope="col">Total</th>
            <th scope="col">
              <span className="visually-hidden">Retirer</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && !lines.length ? (
            <tr>
              <td colSpan={5}>Vérification des prix…</td>
            </tr>
          ) : (
            lines.map((line) => (
              <tr key={`${line.productId}:${line.variantId ?? ""}`}>
                <td data-label="Produit">
                  <strong>{line.productName}</strong>
                  {line.variantName && <small>{line.variantName}</small>}
                </td>
                <td data-label="Prix">{formatXaf(line.unitPriceXaf)}</td>
                <td data-label="Quantité">
                  <Quantity onChange={(value) => cart.changeQuantity(line.productId, line.variantId, value)} value={line.quantity} />
                </td>
                <td data-label="Total">
                  <strong>{formatXaf(line.lineTotalXaf)}</strong>
                </td>
                <td>
                  <button aria-label={`Retirer ${line.productName}`} className="sx-icon-button" onClick={() => cart.remove(line.productId, line.variantId)} type="button">
                    <Trash aria-hidden="true" size={20} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <footer>
        <p>
          Sous-total : <strong>{loading ? "…" : formatXaf(subtotal)}</strong>
          <small>Frais de livraison calculés à l’étape suivante.</small>
        </p>
        <a aria-disabled={loading || Boolean(error) || undefined} className="sx-btn sx-btn-primary" href={checkoutHref}>
          Commander chez {store.name} <ArrowRight aria-hidden="true" size={20} />
        </a>
      </footer>
    </section>
  );
}

/** Page « Panier » de la marketplace : une section par boutique. */
export function MarketCart({ checkoutPath, homeHref }: { /** Page de commande ; l'adresse de la boutique est ajoutée (« ?boutique=… »). */ checkoutPath: string; homeHref: string }) {
  const carts = useCarts();
  if (carts === null) return <p className="sx-cart-loading">Chargement du panier…</p>;
  if (!carts.length) {
    return (
      <div className="sx-empty">
        <ShoppingCartSimple aria-hidden="true" size={48} />
        <p>
          <strong>Votre panier est vide.</strong>
        </p>
        <p>Ajoutez des produits depuis leur fiche : ils vous attendront ici.</p>
        <a className="sx-btn sx-btn-primary" href={homeHref}>
          Découvrir les produits <ArrowRight aria-hidden="true" size={20} />
        </a>
      </div>
    );
  }
  return (
    <div className="sx-cart">
      {carts.length > 1 && <p className="sx-notice">Vos produits viennent de {carts.length} boutiques : chaque boutique prépare et livre sa commande, vous commandez donc chez chacune séparément.</p>}
      {carts.map(({ store }) => (
        <StoreCartProvider key={store.id} storeId={store.id}>
          <StoreCartSection checkoutHref={`${checkoutPath}?boutique=${encodeURIComponent(store.slug)}`} store={store} />
        </StoreCartProvider>
      ))}
      <a className="sx-btn sx-btn-outline" href={homeHref}>
        <ArrowLeft aria-hidden="true" size={20} /> Continuer mes achats
      </a>
    </div>
  );
}

type CheckoutProps = {
  store: CartStore;
  zones: StorefrontZone[];
  pickup: { enabled: boolean; address: string | null; hours: string | null };
  cartHref: string;
  homeHref: string;
  /** Page de suivi de la boutique ; le jeton de la commande est ajouté. */
  trackingBase: string;
};

/** Formulaire de commande de la marketplace (une boutique), avec les mêmes règles que la vitrine. */
function CheckoutForm({ store, zones, pickup, cartHref, homeHref, trackingBase }: CheckoutProps) {
  const { cart, lines, subtotal, loading, error: pricingError } = useCartPricing(store.slug);
  const [state, dispatch, pending] = useActionState<CheckoutActionState, FormData>(checkoutOrderAction, null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const deliveryAvailable = zones.length > 0;
  const [method, setMethod] = useState<"DELIVERY" | "PICKUP">(deliveryAvailable ? "DELIVERY" : "PICKUP");
  const [name, setName] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [zoneId, setZoneId] = useState(zones.length === 1 ? zones[0].id : "");
  const [landmark, setLandmark] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((value) => (value[field] ? value : { ...value, [field]: true }));
  const cleared = useRef(false);

  const zone = zones.find((item) => item.id === zoneId);
  const fee = method === "PICKUP" ? 0 : (zone?.feeXaf ?? null);
  const total = fee === null ? null : subtotal + fee;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const required = [
    { label: "votre nom", done: name.trim().length >= 2 },
    { label: "numéro WhatsApp", done: phoneValid },
    ...(method === "DELIVERY" ? [{ label: "zone de livraison", done: Boolean(zone) }, { label: "point de repère", done: landmark.trim().length >= 3 }] : []),
    { label: "suivi WhatsApp", done: consent },
  ];
  const missing = required.filter((field) => !field.done).map((field) => field.label);
  const valid = missing.length === 0 && total !== null && lines.length > 0 && !loading && Boolean(idempotencyKey);

  // Clé générée côté navigateur : un double envoi ne crée qu'une seule commande.
  useEffect(() => setIdempotencyKey(uuid()), []);
  useEffect(() => {
    if (state?.reference && !cleared.current) {
      cleared.current = true;
      cart.clear();
    }
  }, [cart, state]);

  const clientErrors: Record<string, string | undefined> = {
    name: name.trim().length < 2 ? "Indiquez votre nom (2 caractères au moins)." : undefined,
    zoneId: method === "DELIVERY" && !zone ? "Choisissez votre zone de livraison." : undefined,
    landmark: method === "DELIVERY" && landmark.trim().length < 3 ? "Indiquez un point de repère (3 caractères au moins)." : undefined,
    followUpConsent: !consent ? "Cochez cette case : le suivi sur WhatsApp est nécessaire pour commander." : undefined,
  };
  const fieldError = (field: string) => (state?.error && state.field === field ? state.error : touched[field] ? clientErrors[field] : undefined);
  const generalError = state?.error && !["name", "whatsapp", "landmark", "followUpConsent", "zoneId"].includes(state.field ?? "") ? state.error : null;

  if (state?.reference) {
    return (
      <div className="sx-done">
        <CheckCircle aria-hidden="true" size={64} weight="fill" />
        <h2>Commande envoyée à {store.name}</h2>
        <p>
          Votre numéro de commande : <strong>{state.reference}</strong>. La boutique vous contacte sur WhatsApp pour confirmer. Vous payez à la livraison.
        </p>
        <div className="sx-done-actions">
          <a className="sx-btn sx-btn-primary" href={`${trackingBase}/${state.trackingToken}`}>
            Suivre ma commande <ArrowRight aria-hidden="true" size={20} />
          </a>
          <a className="sx-btn sx-btn-outline" href={cartHref}>
            Voir mon panier
          </a>
          <a className="sx-btn sx-btn-outline" href={homeHref}>
            Continuer mes achats
          </a>
        </div>
      </div>
    );
  }

  if (!deliveryAvailable && !pickup.enabled) {
    return (
      <div className="sx-empty">
        <Storefront aria-hidden="true" size={48} />
        <p>
          <strong>{store.name} n’a pas encore ouvert ses commandes.</strong>
        </p>
        <p>La boutique n’a pas encore indiqué ses zones de livraison. Revenez un peu plus tard.</p>
        <a className="sx-btn sx-btn-outline" href={cartHref}>
          <ArrowLeft aria-hidden="true" size={20} /> Retour au panier
        </a>
      </div>
    );
  }

  if (cart.ready && !loading && lines.length === 0) {
    return (
      <div className="sx-empty">
        <ShoppingCartSimple aria-hidden="true" size={48} />
        <p>
          <strong>Aucun produit de {store.name} dans votre panier.</strong>
        </p>
        <a className="sx-btn sx-btn-primary" href={homeHref}>
          Découvrir les produits <ArrowRight aria-hidden="true" size={20} />
        </a>
      </div>
    );
  }

  return (
    <form
      className="sx-checkout"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) {
          setTouched({ name: true, zoneId: true, landmark: true, followUpConsent: true });
          return;
        }
        const data = new FormData(event.currentTarget);
        data.set("items", JSON.stringify(cart.items));
        data.set("expectedTotalXaf", String(total));
        startTransition(() => dispatch(data));
      }}
    >
      <input name="storeSlug" type="hidden" value={store.slug} />
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <input name="deliveryMethod" type="hidden" value={method} />

      <div className="sx-checkout-form">
        <h2>Vos informations</h2>
        <p className="sx-checkout-note">Aucun compte à créer. La boutique vous écrit sur WhatsApp pour confirmer.</p>
        <label className="sx-field">
          <span>Votre nom</span>
          <input aria-invalid={fieldError("name") ? true : undefined} autoComplete="name" maxLength={120} name="name" onBlur={() => touch("name")} onChange={(event) => setName(event.target.value)} placeholder="Ex. Estelle Nkoa" required value={name} />
          {fieldError("name") && (
            <small className="sx-field-error" role="alert">
              {fieldError("name")}
            </small>
          )}
        </label>
        <PhoneInput error={fieldError("whatsapp")} help="La boutique vous écrira sur ce numéro. Saisissez-le sans l’indicatif." label="Votre numéro WhatsApp" name="whatsapp" onValidityChange={(isValid) => setPhoneValid(isValid)} />

        {deliveryAvailable && pickup.enabled && (
          <fieldset className="sx-choice">
            <legend>Mode de réception</legend>
            <label>
              <input checked={method === "DELIVERY"} name="methodChoice" onChange={() => setMethod("DELIVERY")} type="radio" value="DELIVERY" />
              <span>Livraison</span>
            </label>
            <label>
              <input checked={method === "PICKUP"} name="methodChoice" onChange={() => setMethod("PICKUP")} type="radio" value="PICKUP" />
              <span>Retrait en boutique</span>
            </label>
          </fieldset>
        )}

        {method === "DELIVERY" ? (
          <>
            <label className="sx-field">
              <span>Zone de livraison</span>
              <span className="sx-select">
                <select
                  aria-invalid={fieldError("zoneId") ? true : undefined}
                  name="zoneId"
                  onBlur={() => touch("zoneId")}
                  onChange={(event) => {
                    setZoneId(event.target.value);
                    touch("zoneId");
                  }}
                  required
                  value={zoneId}
                >
                  <option disabled value="">
                    Choisir votre quartier ou zone
                  </option>
                  {zones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.feeXaf === 0 ? "gratuit" : formatXaf(item.feeXaf)}
                    </option>
                  ))}
                </select>
              </span>
              <small className="sx-field-help">{zone ? `Frais de livraison : ${zone.feeXaf === 0 ? "gratuits" : formatXaf(zone.feeXaf)}${zone.delay ? ` · délai : ${zone.delay}` : ""}.` : "Votre zone n’est pas dans la liste ? Choisissez le retrait, ou revenez plus tard."}</small>
              {fieldError("zoneId") && (
                <small className="sx-field-error" role="alert">
                  {fieldError("zoneId")}
                </small>
              )}
            </label>
            <label className="sx-field">
              <span>Point de repère</span>
              <input aria-invalid={fieldError("landmark") ? true : undefined} maxLength={250} name="landmark" onBlur={() => touch("landmark")} onChange={(event) => setLandmark(event.target.value)} placeholder="Ex. Près de la pharmacie du carrefour" required value={landmark} />
              {fieldError("landmark") && (
                <small className="sx-field-error" role="alert">
                  {fieldError("landmark")}
                </small>
              )}
            </label>
          </>
        ) : (
          <div className="sx-notice">
            <strong>Retrait en boutique, gratuit.</strong> {pickup.address ?? "La boutique vous indiquera l’adresse sur WhatsApp."} {pickup.hours}
          </div>
        )}

        <label className="sx-field">
          <span>Note pour la boutique (facultatif)</span>
          <textarea maxLength={500} name="comment" placeholder="Ex. Appelez-moi en arrivant" rows={3} />
        </label>
        <label className="sx-check">
          <input
            checked={consent}
            name="followUpConsent"
            onBlur={() => touch("followUpConsent")}
            onChange={(event) => {
              setConsent(event.target.checked);
              touch("followUpConsent");
            }}
            required
            type="checkbox"
          />
          <span>J’accepte de recevoir le suivi de ma commande sur WhatsApp.</span>
        </label>
        {fieldError("followUpConsent") && (
          <small className="sx-field-error" role="alert">
            {fieldError("followUpConsent")}
          </small>
        )}
        <label className="sx-check">
          <input name="marketingConsent" type="checkbox" />
          <span>Je souhaite recevoir les offres de la boutique (facultatif).</span>
        </label>
      </div>

      <aside aria-label="Récapitulatif" className="sx-summary">
        <h2>Récapitulatif</h2>
        <ul>
          {lines.map((line) => (
            <li key={`${line.productId}:${line.variantId ?? ""}`}>
              <span>
                {line.productName}
                {line.variantName ? ` (${line.variantName})` : ""} × {line.quantity}
              </span>
              <strong>{formatXaf(line.lineTotalXaf)}</strong>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>
              Sous-total ({count} article{count > 1 ? "s" : ""})
            </dt>
            <dd>{loading ? "…" : formatXaf(subtotal)}</dd>
          </div>
          <div>
            <dt>{method === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dt>
            <dd>{fee === null ? "Choisissez votre zone" : fee === 0 ? "Gratuit" : formatXaf(fee)}</dd>
          </div>
          <div className="sx-summary-total">
            <dt>Total à payer à la livraison</dt>
            <dd>{total === null || loading ? "—" : formatXaf(total)}</dd>
          </div>
        </dl>
        {(generalError || pricingError) && (
          <p className="sx-notice sx-notice--error" role="alert">
            {generalError ?? pricingError}
          </p>
        )}
        <button className="sx-btn sx-btn-primary sx-btn-large" disabled={pending} type="submit">
          {pending ? "Envoi de la commande…" : "Commander"} <ArrowRight aria-hidden="true" size={20} />
        </button>
        <p aria-live="polite" className="sx-summary-hint">
          {valid ? `Votre commande sera envoyée à ${store.name}, qui vous contactera sur WhatsApp.` : `Il reste : ${missing.join(", ")}.`}
        </p>
        <a className="sx-link" href={cartHref}>
          <ArrowLeft aria-hidden="true" size={18} /> Modifier mon panier
        </a>
      </aside>
    </form>
  );
}

/** Page « Commande » de la marketplace pour une boutique. */
export function MarketCheckout(props: CheckoutProps) {
  useEffect(() => rememberCartStore(props.store), [props.store]);
  return (
    <StoreCartProvider storeId={props.store.id}>
      <CheckoutForm {...props} />
    </StoreCartProvider>
  );
}
