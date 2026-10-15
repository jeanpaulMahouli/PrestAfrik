"use client";

import { useRef, useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { parsePhone } from "@/lib/phone";
import { saveWhatsappLinkAction } from "@/modules/whatsapp/actions";
import { renderTemplate, sampleOrder, templateVariables } from "@/modules/whatsapp/templates";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";

type Props = {
  storeName: string;
  country: string;
  national: string;
  customerTemplate: string;
  storeTemplate: string;
  productOrderButtonEnabled: boolean;
  aside: React.ReactNode;
};

/** Configuration du lien wa.me avec aperçu en direct. */
export function WhatsappLinkForm(props: Props) {
  const [phone, setPhone] = useState(() => {
    const parsed = parsePhone(props.country, props.national);
    return parsed.ok ? parsed.e164 : null;
  });
  const [customerTemplate, setCustomerTemplate] = useState(props.customerTemplate);
  const [storeTemplate, setStoreTemplate] = useState(props.storeTemplate);
  const [focused, setFocused] = useState<"customer" | "store">("customer");
  const customerRef = useRef<HTMLTextAreaElement>(null);
  const storeRef = useRef<HTMLTextAreaElement>(null);
  const sample = { ...sampleOrder, storeName: props.storeName };
  const preview = renderTemplate(customerTemplate, sample);
  const previewUrl = phone ? buildWaMeUrl(phone, preview) : null;

  function insert(variable: string) {
    const target = focused === "customer" ? customerRef.current : storeRef.current;
    const setter = focused === "customer" ? setCustomerTemplate : setStoreTemplate;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const next = `${target.value.slice(0, start)}{${variable}}${target.value.slice(end)}`;
    setter(next);
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
    });
  }

  return (
    <div className="v-split">
      <form action={saveWhatsappLinkAction} className="v-card">
        <h2 className="v-card-title">Configuration du lien wa.me (par défaut)</h2>
        <PhoneInput
          defaultCountry={props.country}
          defaultNational={props.national}
          help="Les clients qui commandent vous écrivent sur ce numéro. +237 par défaut."
          label="Numéro WhatsApp de la boutique"
          name="business"
          onValidityChange={(valid, e164) => setPhone(valid ? e164 : null)}
        />
        <label className="v-field">
          Message envoyé par le client (sa commande)
          <textarea maxLength={600} name="customerTemplate" onChange={(event) => setCustomerTemplate(event.target.value)} onFocus={() => setFocused("customer")} ref={customerRef} rows={3} value={customerTemplate} />
        </label>
        <div aria-label="Insérer une variable" className="variable-chips" role="group">
          {templateVariables.map((variable) => (
            <button key={variable} onClick={() => insert(variable)} type="button">{`{${variable}}`}</button>
          ))}
        </div>
        <label className="v-field">
          Votre message au client (« Continuer sur WhatsApp »)
          <textarea maxLength={600} name="storeTemplate" onChange={(event) => setStoreTemplate(event.target.value)} onFocus={() => setFocused("store")} ref={storeRef} rows={3} value={storeTemplate} />
        </label>
        <label className="v-check">
          <input defaultChecked={props.productOrderButtonEnabled} name="productOrderButtonEnabled" type="checkbox" />
          Afficher « Commander sur WhatsApp » sur la boutique
        </label>
        <div className="v-button-row">
          {previewUrl ? (
            <a className="btn btn-secondary" href={previewUrl} rel="noopener noreferrer" target="_blank">Tester le lien</a>
          ) : (
            <button className="btn btn-secondary" disabled type="button">Tester le lien</button>
          )}
          <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        </div>
      </form>

      <div className="v-stack">
        <section aria-labelledby="link-preview" className="v-card">
          <h2 className="v-card-title" id="link-preview">Aperçu du lien</h2>
          <div className="wa-preview">
            <p className="wa-bubble">{preview}</p>
          </div>
          <p className="wa-preview-url">{previewUrl ? `${previewUrl.slice(0, 64)}…` : "Indiquez un numéro valide pour générer le lien."}</p>
        </section>
        {props.aside}
      </div>
    </div>
  );
}
