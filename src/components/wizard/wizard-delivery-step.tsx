"use client";

import { useState } from "react";
import type { ShopUniverse } from "@/config/marketplace";
import { wizardWording } from "./wizard-universe";
import { WizardStepForm } from "@/components/wizard/wizard-step-form";
import { saveDeliveryStep } from "@/modules/stores/wizard-actions";

type Zone = { key: number; name: string; fee: string; delay: string };

const back = (draftId: string, step: number) => `/boutiques/nouvelle?brouillon=${draftId}&etape=${step}`;
let nextKey = 0;
const emptyZone = (): Zone => ({ key: nextKey++, name: "", fee: "", delay: "" });

/**
 * Étape 8 (facultative) : zones de livraison à frais fixes et retrait en boutique. Le client connaît
 * le total exact avant de commander ; tout reste modifiable ensuite dans « Livraisons » et « Ma boutique ».
 */
export function DeliveryStep({
  draftId,
  city,
  initial,
  universe = "vente",
}: {
  draftId: string;
  city: string;
  /** Univers de la boutique : livraison (Shopping), visites (Immobilier) ou déplacements (Services). */
  universe?: ShopUniverse;
  initial: { zones: { name: string; feeXaf: number; estimatedDelay: string | null }[]; pickupEnabled: boolean; pickupAddress: string; pickupHours: string };
}) {
  const [zones, setZones] = useState<Zone[]>(() =>
    initial.zones.length ? initial.zones.map((zone) => ({ key: nextKey++, name: zone.name, fee: String(zone.feeXaf), delay: zone.estimatedDelay ?? "" })) : [emptyZone()],
  );
  const [pickup, setPickup] = useState(initial.pickupEnabled);
  const words = wizardWording[universe];
  const update = (key: number, field: keyof Omit<Zone, "key">, value: string) => setZones((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  return (
    <WizardStepForm
      action={saveDeliveryStep}
      backHref={back(draftId, 7)}
      draftId={draftId}
      secondary={
        <button className="btn btn-secondary" formNoValidate name="skip" type="submit" value="1">
          Passer cette étape
        </button>
      }
      step={8}
      subtitle={words.deliverySubtitle}
      title={words.deliveryTitle}
    >
      {(fieldError) => (
        <>
          <fieldset className="wizard-fieldset">
            <legend className="wizard-label">
              {words.zonesLegend} {city ? `à ${city}` : ""}
            </legend>
            <p className="v-field-help">{words.zonesHelp}</p>
            <ul className="wizard-zones">
              {zones.map((zone, index) => (
                <li key={zone.key}>
                  <label className="v-field">
                    <span className={index ? "visually-hidden" : undefined}>Zone</span>
                    <input maxLength={120} name="zoneName" onChange={(event) => update(zone.key, "name", event.target.value)} placeholder="Ex. Akwa, Bonapriso" value={zone.name} />
                  </label>
                  <label className="v-field">
                    <span className={index ? "visually-hidden" : undefined}>Frais (FCFA)</span>
                    <input inputMode="numeric" maxLength={9} name="zoneFee" onChange={(event) => update(zone.key, "fee", event.target.value)} placeholder="Ex. 1000" value={zone.fee} />
                  </label>
                  <label className="v-field">
                    <span className={index ? "visually-hidden" : undefined}>Délai (facultatif)</span>
                    <input maxLength={100} name="zoneDelay" onChange={(event) => update(zone.key, "delay", event.target.value)} placeholder="Ex. Sous 24 h" value={zone.delay} />
                  </label>
                  {zones.length > 1 && (
                    <button aria-label={`Retirer la zone ${zone.name || index + 1}`} className="wizard-zone-remove" onClick={() => setZones((rows) => rows.filter((row) => row.key !== zone.key))} type="button">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {zones.length < 20 && (
              <button className="v-link-button" onClick={() => setZones((rows) => [...rows, emptyZone()])} type="button">
                + Ajouter une zone
              </button>
            )}
            {fieldError("zones") && <p className="v-field-error">{fieldError("zones")}</p>}
          </fieldset>

          <fieldset className="wizard-fieldset">
            <legend className="wizard-label">{words.pickupLegend}</legend>
            <label className="v-check">
              <input checked={pickup} name="pickupEnabled" onChange={(event) => setPickup(event.target.checked)} type="checkbox" />
              Mes clients peuvent venir chercher leur commande à la boutique (gratuit)
            </label>
            {pickup && (
              <div className="v-grid-2">
                <label className="v-field">
                  Adresse de retrait
                  <input
                    aria-invalid={Boolean(fieldError("pickupAddress")) || undefined}
                    defaultValue={initial.pickupAddress}
                    maxLength={200}
                    name="pickupAddress"
                    placeholder="Ex. Akwa, face à la pharmacie du Centre"
                  />
                  {fieldError("pickupAddress") && <span className="v-field-error">{fieldError("pickupAddress")}</span>}
                </label>
                <label className="v-field">
                  Horaires (facultatif)
                  <input defaultValue={initial.pickupHours} maxLength={120} name="pickupHours" placeholder="Ex. Lundi au samedi, 9 h – 18 h" />
                </label>
              </div>
            )}
          </fieldset>
        </>
      )}
    </WizardStepForm>
  );
}
