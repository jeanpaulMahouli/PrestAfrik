"use client";

import { useEffect, useRef, useState } from "react";
import { StoreImage } from "@/components/ui/store-image";

const maxBytes = 2 * 1024 * 1024;

type ImageFileInputProps = {
  name: string;
  label: string;
  currentUrl?: string | null;
  currentAlt?: string;
};

export function ImageFileInput({ name, label, currentUrl, currentAlt = "" }: ImageFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleChange(file: File | undefined) {
    setError("");
    setPreviewUrl(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choisis une image PNG, JPG ou WebP.");
    } else if (file.size > maxBytes) {
      setError("La photo ne peut pas dépasser 2 Mo.");
    } else {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="image-file-input">
      <div className="image-file-preview">
        {previewUrl ? (
          <img alt="Aperçu de la nouvelle photo" src={previewUrl} />
        ) : currentUrl ? (
          <StoreImage alt={currentAlt} height={320} src={currentUrl} width={320} />
        ) : (
          <span className="image-fallback" aria-hidden="true" />
        )}
      </div>
      <label className="form-field">
        {label}
        <input
          accept="image/png,image/jpeg,image/webp"
          name={name}
          onChange={(event) => handleChange(event.currentTarget.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </label>
      {previewUrl && <p className="dashboard-copy" role="status">Nouvelle photo prête : enregistre pour la publier.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
