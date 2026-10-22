"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { sendContactMessage, type ContactState } from "@/modules/contact/actions";
import { contactSubjects, type ContactSubject } from "@/modules/contact/subjects";

/** Formulaire de la page /contact. Le sujet peut être présélectionné (?sujet=demo). */
export function ContactForm({ defaultSubject }: { defaultSubject: ContactSubject }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const invalid = (field: string) => (state && !state.ok && state.field === field ? true : undefined);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} className="lp-form" ref={formRef}>
      <div className="lp-form__row">
        <label className="lp-field">
          <span>Nom complet *</span>
          <input aria-invalid={invalid("name")} autoComplete="name" maxLength={80} minLength={2} name="name" placeholder="Ex. Awa Mbarga" required />
        </label>
        <label className="lp-field">
          <span>Adresse e-mail *</span>
          <input aria-invalid={invalid("email")} autoComplete="email" maxLength={254} name="email" placeholder="vous@exemple.com" required type="email" />
        </label>
      </div>
      <div className="lp-form__row">
        <label className="lp-field">
          <span>Téléphone ou WhatsApp</span>
          <input aria-invalid={invalid("phone")} autoComplete="tel" inputMode="tel" maxLength={30} name="phone" placeholder="+237 6 99 00 00 00" />
        </label>
        <label className="lp-field">
          <span>Nom de votre boutique</span>
          <input maxLength={80} name="store" placeholder="Facultatif" />
        </label>
      </div>
      <label className="lp-field">
        <span>Sujet *</span>
        <select aria-invalid={invalid("subject")} defaultValue={defaultSubject} name="subject" required>
          {Object.entries(contactSubjects).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="lp-field">
        <span>Votre message *</span>
        <textarea aria-invalid={invalid("message")} maxLength={3000} minLength={10} name="message" placeholder="Dites-nous comment nous pouvons vous aider." required rows={6} />
      </label>
      {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran. */}
      <div aria-hidden="true" className="lp-form__trap">
        <label>
          Site web
          <input autoComplete="off" name="website" tabIndex={-1} />
        </label>
      </div>
      {state && (
        <p className={`lp-form__status${state.ok ? " is-success" : " is-error"}`} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <button className="lp-btn lp-btn--primary lp-form__submit" disabled={pending} type="submit">
        <span>{pending ? "Envoi en cours…" : "Envoyer mon message"}</span>
        <Send aria-hidden="true" size={18} />
      </button>
      <p className="lp-form__note">
        Vos coordonnées servent uniquement à vous répondre. Voir notre <Link href="/legal/politique-de-confidentialite">politique de confidentialité</Link>.
      </p>
    </form>
  );
}
