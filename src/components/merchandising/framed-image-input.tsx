"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { StoreImage } from "@/components/ui/store-image";
import { shrinkImageForUpload } from "@/lib/client-image";

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const maxSourceBytes = 15 * 1024 * 1024;

/**
 * Choix d'une image avec aperçu au format final (16/9 pour la bannière, 4/5 pour un popup).
 * La photo est réduite dans le navigateur avant l'envoi, puis recadrée au centre par le serveur.
 */
export function FramedImageInput({
  name,
  frame,
  currentUrl,
  label,
  required = false,
  onError,
}: {
  name: string;
  frame: { width: number; height: number };
  currentUrl?: string | null;
  label: string;
  required?: boolean;
  onError?: (message: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleChange(input: HTMLInputElement) {
    const file = input.files?.[0];
    setError("");
    if (!file) return;
    const problem = !acceptedTypes.includes(file.type)
      ? "Choisissez une image PNG, JPG ou WebP."
      : file.size > maxSourceBytes
        ? "Cette image dépasse 15 Mo. Choisissez-en une plus légère."
        : "";
    if (problem) {
      input.value = "";
      setPreview(null);
      setError(problem);
      onError?.(problem);
      return;
    }
    setBusy(true);
    const shrunk = await shrinkImageForUpload(file, frame);
    // Le formulaire envoie la version réduite (2 Mo maximum côté serveur).
    if (shrunk !== file && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer();
      transfer.items.add(shrunk);
      input.files = transfer.files;
    }
    setBusy(false);
    if (shrunk.size > 2 * 1024 * 1024) {
      input.value = "";
      setPreview(null);
      setError("Même réduite, cette image dépasse 2 Mo. Choisissez une image plus simple ou plus petite.");
      return;
    }
    setPreview(URL.createObjectURL(shrunk));
  }

  const ratio = `${frame.width} / ${frame.height}`;
  return (
    <div className="framed-image-input">
      <label className="framed-image-drop" htmlFor={id} style={{ aspectRatio: ratio }}>
        {preview ? (
          <img alt="Aperçu de la nouvelle image" src={preview} />
        ) : currentUrl ? (
          <StoreImage alt="Image actuelle" fill sizes="(max-width: 640px) 100vw, 480px" src={currentUrl} />
        ) : (
          <span className="framed-image-empty">
            <ImagePlus aria-hidden="true" size={28} />
            <span>{label}</span>
            <small>
              Format conseillé : {frame.width} × {frame.height} px. Les bords sont recadrés au centre.
            </small>
          </span>
        )}
        {busy && <span className="framed-image-busy">Préparation de l’image…</span>}
      </label>
      <input
        accept={acceptedTypes.join(",")}
        className="visually-hidden"
        id={id}
        name={name}
        onChange={(event) => void handleChange(event.currentTarget)}
        ref={inputRef}
        required={required}
        type="file"
      />
      {(preview || currentUrl) && (
        <button className="v-link-button" onClick={() => inputRef.current?.click()} type="button">
          {currentUrl && !preview ? "Remplacer l’image" : "Choisir une autre image"}
        </button>
      )}
      {error && <p className="v-field-error" role="alert">{error}</p>}
    </div>
  );
}
