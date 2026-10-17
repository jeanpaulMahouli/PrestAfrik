"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useCartPricing } from "@/components/storefront/use-cart-pricing";
import { PhoneInput } from "@/components/ui/phone-input";
import { formatXaf } from "@/modules/catalog/format";
import { checkoutOrderAction, type CheckoutActionState } from "@/modules/orders/actions";
import type { StorefrontZone } from "@/modules/storefront/data";
import { BackIcon } from "@/components/ui/icons";
import { uuid } from "@/lib/uuid";

type CheckoutProps = {
  storeSlug: string;
  zones: StorefrontZone[];
  pickup: { enabled: boolean; address: string | null; hours: string | null };
  whatsappOrderEnabled: boolean;
};

/**
 * Formulaire de commande (maquettes « Commande · formulaire »). Les frais de livraison sont ceux de
 * la zone choisie : le client connaît le total exact avant de commander (ADR-013).
 */
export function StoreCheckout({ storeSlug, zones, pickup, whatsappOrderEnabled }: CheckoutProps) {
  const router = useRouter();
  const { cart, lines, subtotal, loading, error: pricingError } = useCartPricing(storeSlug);
  const [state, dispatch, pending] = useActionState<CheckoutActionState, FormData>(checkoutOrderAction, null);
  const intent = useRef<"site" | "whatsapp">("site");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const deliveryAvailable = zones.length > 0;
  const [method, setMethod] = useState<"DELIVERY" | "PICKUP">(deliveryAvailable ? "DELIVERY" : "PICKUP");
  const [name, setName] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [zoneId, setZoneId] = useState(zones.length === 1 ? zones[0].id : "");
  const [landmark, setLandmark] = useState("");
  const [consent, setConsent] = useState(false);
  const home = `/${storeSlug}`;

  const zone = zones.find((item) => item.id === zoneId);
  const fee = method === "PICKUP" ? 0 : zone?.feeXaf ?? null;
  const total = fee === null ? null : subtotal + fee;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  const required = [
    { label: "votre nom", done: name.trim().length >= 2 },
    { label: "numéro WhatsApp", done: phoneValid },
    ...(method === "DELIVERY"
      ? [
          { label: "zone de livraison", done: Boolean(zone) },
          { label: "point de repère", done: landmark.trim().length >= 3 },
        ]
      : []),
    { label: "suivi WhatsApp", done: consent },
  ];
  const done = required.filter((field) => field.done).length;
  const missing = required.filter((field) => !field.done).map((field) => field.label);
  const valid = missing.length === 0 && total !== null && lines.length > 0 && !loading && Boolean(idempotencyKey);

  // Clé générée côté navigateur : un double envoi ne crée qu'une seule commande.
  useEffect(() => setIdempotencyKey(uuid()), []);

  const redirected = useRef(false);
  useEffect(() => {
    if (state?.reference && state.trackingToken && !redirected.current) {
      redirected.current = true;
      cart.clear();
      router.replace(`${home}/suivi/${state.trackingToken}?nouvelle=1${intent.current === "whatsapp" ? "&whatsapp=1" : ""}`);
    }
  }, [cart, home, router, state]);

  const fieldError = (field: string) => (state?.error && state.field === field ? state.error : undefined);
  const generalError = state?.error && !["name", "whatsapp", "landmark", "followUpConsent"].includes(state.field ?? "") ? state.error : null;

  if (!deliveryAvailable && !pickup.enabled) {
    return (
      <main className="sf-page">
        <section className="sf-empty">
          <h1>Commandes bientôt ouvertes</h1>
          <p>La boutique n’a pas encore indiqué ses zones de livraison. Revenez un peu plus tard.</p>
          <Link className="sf-btn sf-btn-secondary" href={home}>Retour à la boutique</Link>
        </section>
      </main>
    );
  }

  if (!loading && lines.length === 0 && !state?.reference) {
    return (
      <main className="sf-page">
        <section className="sf-empty">
          <h1>Votre panier est vide</h1>
          <p>Ajoutez des produits pour passer commande.</p>
          <Link className="sf-btn sf-btn-primary" href={home}>Voir les produits</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="sf-page sf-checkout">
      <div className="sf-page-head">
        <Link aria-label="Retour au panier" className="sf-back" href={`${home}/panier`}><BackIcon size={18} /></Link>
        <h1>Finaliser ma commande</h1>
      </div>
      <p className="sf-muted">Aucun compte à créer. Vous payez à la livraison.</p>

      <div aria-live="polite" className="sf-progress">
        <span>
          {done} sur {required.length} champs obligatoires remplis
          <strong>{missing.length ? "Presque…" : "Tout est prêt !"}</strong>
        </span>
        <span aria-hidden="true" className="sf-progress-bar"><span style={{ width: `${(done / required.length) * 100}%` }} /></span>
      </div>

      <form
        className="sf-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          intent.current = submitter?.value === "whatsapp" ? "whatsapp" : "site";
          if (!valid) return;
          const data = new FormData(event.currentTarget);
          data.set("items", JSON.stringify(cart.items));
          data.set("expectedTotalXaf", String(total));
          startTransition(() => dispatch(data));
        }}
      >
        <input name="storeSlug" type="hidden" value={storeSlug} />
        <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
        <input name="deliveryMethod" type="hidden" value={method} />

        <label className="sf-field">
          Votre nom
          <input autoComplete="name" maxLength={120} name="name" onChange={(event) => setName(event.target.value)} placeholder="Ex. Estelle Nkoa" required value={name} />
          {fieldError("name") && <span className="sf-field-error">{fieldError("name")}</span>}
        </label>

        <PhoneInput
          error={fieldError("whatsapp")}
          help="La boutique vous écrira sur ce numéro. Saisissez-le sans l’indicatif."
          label="Votre numéro WhatsApp"
          name="whatsapp"
          onValidityChange={(isValid) => setPhoneValid(isValid)}
        />

        {deliveryAvailable && pickup.enabled && (
          <fieldset className="sf-field sf-segmented">
            <legend>Mode de réception</legend>
            <div>
              <label className={method === "DELIVERY" ? "is-selected" : ""}>
                <input checked={method === "DELIVERY"} name="methodChoice" onChange={() => setMethod("DELIVERY")} type="radio" value="DELIVERY" />
                Livraison
              </label>
              <label className={method === "PICKUP" ? "is-selected" : ""}>
                <input checked={method === "PICKUP"} name="methodChoice" onChange={() => setMethod("PICKUP")} type="radio" value="PICKUP" />
                Retrait en boutique
              </label>
            </div>
          </fieldset>
        )}

        {method === "DELIVERY" ? (
          <>
            <label className="sf-field">
              Zone de livraison
              <select name="zoneId" onChange={(event) => setZoneId(event.target.value)} required value={zoneId}>
                <option disabled value="">Choisir votre quartier ou zone</option>
                {zones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.feeXaf === 0 ? "gratuit" : formatXaf(item.feeXaf)}
                  </option>
                ))}
              </select>
              <span className="sf-field-help">
                {zone ? `Frais de livraison : ${zone.feeXaf === 0 ? "gratuits" : formatXaf(zone.feeXaf)}${zone.delay ? ` · délai : ${zone.delay}` : ""}.` : "Votre zone n’est pas dans la liste ? Écrivez à la boutique ou choisissez le retrait."}
              </span>
            </label>
            <label className="sf-field">
              Point de repère
              <input maxLength={250} name="landmark" onChange={(event) => setLandmark(event.target.value)} placeholder="Ex. Près de la pharmacie du carrefour" required value={landmark} />
              {fieldError("landmark") && <span className="sf-field-error">{fieldError("landmark")}</span>}
            </label>
          </>
        ) : (
          <div className="sf-notice">
            <strong>Retrait en boutique, gratuit</strong>
            {pickup.address && <p>{pickup.address}</p>}
            {pickup.hours && <p>{pickup.hours}</p>}
            {!pickup.address && <p>La boutique vous indiquera l’adresse sur WhatsApp.</p>}
          </div>
        )}

        <label className="sf-field">
          Note pour la boutique (facultatif)
          <textarea maxLength={500} name="comment" placeholder="Ex. Appelez-moi en arrivant" rows={2} />
        </label>

        <label className="sf-check">
          <input checked={consent} name="followUpConsent" onChange={(event) => setConsent(event.target.checked)} required type="checkbox" />
          J’accepte de recevoir le suivi de ma commande sur WhatsApp.
        </label>
        <label className="sf-check">
          <input name="marketingConsent" type="checkbox" />
          Je souhaite recevoir les offres de la boutique (facultatif).
        </label>

        <dl className="sf-sums">
          <div>
            <dt>Sous-total ({count} article{count > 1 ? "s" : ""})</dt>
            <dd>{loading ? "…" : formatXaf(subtotal)}</dd>
          </div>
          <div>
            <dt>{method === "PICKUP" ? "Retrait en boutique" : "Livraison"}</dt>
            <dd>{fee === null ? "Choisissez votre zone" : fee === 0 ? "Gratuit" : formatXaf(fee)}</dd>
          </div>
          <div className="sf-sums-total">
            <dt>Total à payer à la livraison</dt>
            <dd>{total === null || loading ? "—" : formatXaf(total)}</dd>
          </div>
        </dl>

        {(generalError || pricingError) && <p className="sf-notice sf-notice-error" role="alert">{generalError ?? pricingError}</p>}

        <div className="sf-actions-sticky">
          <button className="sf-btn sf-btn-primary sf-btn-block" disabled={pending || !valid} name="intent" type="submit" value="site">
            {pending && intent.current === "site" ? "Envoi de la commande…" : "Commander"}
          </button>
          {whatsappOrderEnabled && (
            <>
              <span aria-hidden="true" className="sf-or">ou</span>
              <button className="sf-btn sf-btn-whatsapp sf-btn-block" disabled={pending || !valid} name="intent" type="submit" value="whatsapp">
                {pending && intent.current === "whatsapp" ? "Envoi de la commande…" : "Commander sur WhatsApp"}
              </button>
            </>
          )}
          <p aria-live="polite" className="sf-muted sf-actions-hint">
            {valid
              ? whatsappOrderEnabled
                ? "Avec WhatsApp, votre commande est enregistrée puis WhatsApp s’ouvre avec votre message prêt à envoyer."
                : "Votre commande sera envoyée à la boutique, qui vous contactera sur WhatsApp."
              : `Il reste : ${missing.join(", ")}.`}
          </p>
        </div>
      </form>
    </main>
  );
}
