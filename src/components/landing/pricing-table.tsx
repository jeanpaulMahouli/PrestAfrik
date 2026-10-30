"use client";

import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { pricingCriteria, yearlySaving, type PricingPlan } from "@/config/pricing";

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

/** Offres avec bascule Mensuel / Annuel et économie de l'annuel ; comparatif détaillé en dessous. */
export function PricingTable({ plans, signupHref }: { plans: PricingPlan[]; signupHref: string }) {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <div aria-label="Période de facturation" className="pricing-toggle" role="group">
        <button aria-pressed={!yearly} onClick={() => setYearly(false)} type="button">
          Mensuel
        </button>
        <button aria-pressed={yearly} onClick={() => setYearly(true)} type="button">
          Annuel <small>jusqu’à -{Math.max(...plans.map((plan) => yearlySaving(plan).percent))} %</small>
        </button>
      </div>

      <ul className="pricing-plans">
        {plans.map((plan) => {
          const saving = yearlySaving(plan);
          return (
            <li className={`pricing-plan${plan.recommended ? " is-recommended" : ""}`} key={plan.id}>
              {plan.recommended && <p className="pricing-badge">Recommandé</p>}
              <h2>{plan.name}</h2>
              <p className="pricing-tagline">{plan.tagline}</p>
              <p className="pricing-price" aria-live="polite">
                <strong>{fcfa(yearly ? plan.yearlyXaf : plan.monthlyXaf)}</strong>
                <span>{yearly ? "par an" : "par mois"}</span>
              </p>
              <p className="pricing-saving">
                {yearly ? `Vous économisez ${fcfa(saving.amountXaf)} (${saving.percent} %) par rapport au mensuel.` : `Ou ${fcfa(plan.yearlyXaf)} par an : ${saving.percent} % d’économie.`}
              </p>
              <ul className="pricing-features">
                {pricingCriteria.map((criterion) => {
                  const value = plan.features[criterion.id];
                  return (
                    <li className={value === false ? "is-off" : ""} key={criterion.id}>
                      {value === false ? <Minus aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}
                      <span>
                        {typeof value === "string" && !criterion.prefix && <span className="visually-hidden">{criterion.label} : </span>}
                        {value === true ? criterion.label : value === false ? `${criterion.label} : non inclus` : criterion.prefix ? `${criterion.label} : ${value}` : value}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link className={`lp-btn ${plan.recommended ? "lp-btn--primary" : "lp-btn--secondary"} pricing-cta`} href={signupHref}>
                Choisir {plan.name}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="pricing-compare-wrap">
        <table className="pricing-compare">
          <caption>Comparer les offres en détail</caption>
          <thead>
            <tr>
              <th scope="col">Critère</th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col">
                  {plan.name}
                  {plan.recommended && <small> (recommandé)</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Prix {yearly ? "annuel" : "mensuel"}</th>
              {plans.map((plan) => (
                <td key={plan.id}>{fcfa(yearly ? plan.yearlyXaf : plan.monthlyXaf)}</td>
              ))}
            </tr>
            {pricingCriteria.map((criterion) => (
              <tr key={criterion.id}>
                <th scope="row">{criterion.label}</th>
                {plans.map((plan) => {
                  const value = plan.features[criterion.id];
                  return <td key={plan.id}>{value === true ? "Activé" : value === false ? "Non" : value}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
