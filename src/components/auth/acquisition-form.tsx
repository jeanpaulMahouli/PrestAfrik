"use client";

import { Users } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { acquisitionOptions, acquisitionSources } from "@/modules/auth/acquisition";
import { saveAcquisitionSource } from "@/modules/auth/acquisition-actions";

/** Choix unique parmi les réseaux (Facebook, YouTube, TikTok, WhatsApp, Google, bouche à oreille). */
export function AcquisitionForm({ next }: { next: string }) {
  const [state, action] = useActionState(saveAcquisitionSource, null);
  const [choice, setChoice] = useState("");

  return (
    <form action={action} className="auth-form">
      <input name="suite" type="hidden" value={next} />
      <fieldset className="auth-sources">
        <legend className="visually-hidden">Comment avez-vous connu PrestAfrik ?</legend>
        {acquisitionSources.map((source) => {
          const option = acquisitionOptions[source];
          return (
            <label className={`auth-source${choice === source ? " is-selected" : ""}`} key={source}>
              <input checked={choice === source} name="source" onChange={() => setChoice(source)} required type="radio" value={source} />
              {option.icon ? (
                <Image alt="" height={26} src={option.icon} width={26} />
              ) : (
                <span aria-hidden="true" className={`auth-source-icon auth-source-icon--${source.toLowerCase()}`}>
                  {source === "GOOGLE" ? "G" : <Users size={16} />}
                </span>
              )}
              <span>{option.label}</span>
            </label>
          );
        })}
      </fieldset>
      {state?.error && (
        <p className="auth-alert" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="auth-submit" disabled={!choice} pendingLabel="Enregistrement…">
        Continuer
      </SubmitButton>
    </form>
  );
}
