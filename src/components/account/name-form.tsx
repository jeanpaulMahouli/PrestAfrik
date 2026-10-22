"use client";

import { useActionState, useEffect, useState } from "react";
import { updateName, type NameState } from "@/modules/account/actions";

/** Modifier son nom depuis « Mon profil » : lecture, puis champ en place au clic sur « Modifier ». */
export function NameForm({ name }: { name: string }) {
  const [state, formAction, saving] = useActionState<NameState, FormData>(updateName, null);
  const [editing, setEditing] = useState(false);
  const current = state?.ok && state.name ? state.name : name;

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <form action={formAction} className="name-form">
      {editing ? <label htmlFor="profile-name">Nom</label> : <span className="name-form-label">Nom</span>}
      {editing ? (
        <div className="name-form-row" key="editing">
          <input autoComplete="name" autoFocus defaultValue={current} id="profile-name" maxLength={80} minLength={2} name="name" required />
          <button className="primary-button" disabled={saving} key="save" type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>
          <button className="v-link-button" disabled={saving} key="cancel" onClick={() => setEditing(false)} type="button">Annuler</button>
        </div>
      ) : (
        <div className="name-form-row" key="reading">
          <strong>{current}</strong>
          <button className="v-link-button" key="edit" onClick={() => setEditing(true)} type="button">Modifier</button>
        </div>
      )}
      {state?.message && (editing ? !state.ok : state.ok) && (
        <p className={state.ok ? "v-banner v-banner-success" : "v-banner v-banner-danger"} role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
