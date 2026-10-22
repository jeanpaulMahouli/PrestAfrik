"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
import { removeAvatar, updateAvatar, type AvatarState } from "@/modules/account/actions";

const maxBytes = 2 * 1024 * 1024;

/** Modifier ou retirer sa photo de profil depuis « Mon profil ». */
export function AvatarForm({ name, image }: { name: string; image: string | null }) {
  const [state, formAction, saving] = useActionState<AvatarState, FormData>(updateAvatar, null);
  const [removeState, setRemoveState] = useState<AvatarState>(null);
  const [removing, startRemove] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const latest = removeState ?? state;
  const current = latest?.ok && latest.image !== undefined ? latest.image : image;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (state?.ok) {
      setPreview(null);
      setRemoveState(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state]);

  function choose(file: File | undefined) {
    setError("");
    setPreview(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) setError("Choisissez une image PNG, JPG ou WebP.");
    else if (file.size > maxBytes) setError("La photo ne peut pas dépasser 2 Mo.");
    else {
      setPreview(URL.createObjectURL(file));
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const message = error || latest?.message;
  const failed = Boolean(error) || latest?.ok === false;

  return (
    <form action={formAction} className="avatar-form">
      <div className="avatar-form-preview">
        {preview ? (
          <span aria-hidden="true" className="avatar-circle" style={{ width: 88, height: 88 }}>
            <img alt="" height={88} src={preview} width={88} />
          </span>
        ) : (
          <UserAvatar image={current} name={name} size={88} />
        )}
      </div>
      <div className="avatar-form-body">
        <strong>Photo de profil</strong>
        <p className="dashboard-copy">PNG, JPG ou WebP, 2 Mo maximum. Elle est recadrée en carré.</p>
        <div className="avatar-form-actions">
          <label className="secondary-button avatar-file-label">
            {current || preview ? "Changer la photo" : "Ajouter une photo"}
            <input accept="image/png,image/jpeg,image/webp" className="visually-hidden" name="avatar" onChange={(event) => choose(event.currentTarget.files?.[0])} ref={inputRef} type="file" />
          </label>
          {preview && (
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
          {preview && (
            <button className="v-link-button" disabled={saving} onClick={() => choose(undefined)} type="button">
              Annuler
            </button>
          )}
          {!preview && current && (
            <button
              className="btn btn-danger-outline"
              disabled={removing}
              onClick={() => startRemove(async () => setRemoveState(await removeAvatar()))}
              type="button"
            >
              {removing ? "Retrait…" : "Retirer"}
            </button>
          )}
        </div>
        {message && (
          <p className={failed ? "v-banner v-banner-danger" : "v-banner v-banner-success"} role={failed ? "alert" : "status"}>
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
