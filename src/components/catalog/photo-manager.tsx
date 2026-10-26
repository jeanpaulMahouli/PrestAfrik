"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useRestorableValue } from "@/components/ui/use-form-persistence";
import { uuid } from "@/lib/uuid";

// Gestion des photos produit (brief §6.4) : 5 photos au maximum, envoi immédiat de chaque fichier
// avec sa progression, réorganisation (glisser ou boutons), texte alternatif, suppression.
export type ExistingPhoto = { id: string; previewUrl: string; alt: string };

type PhotoItem = {
  uid: string;
  id?: string;
  key?: string;
  previewUrl?: string;
  alt: string;
  status: "ready" | "uploading" | "error";
  progress: number;
  error?: string;
  fileName?: string;
};

const maxPhotos = 5;
const maxBytes = 5 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function uploadPhoto(uploadUrl: string, file: File, onProgress: (value: number) => void) {
  return new Promise<{ key: string; previewUrl: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl);
    request.responseType = "json";
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onload = () => {
      const body = request.response as { key?: string; previewUrl?: string; error?: string } | null;
      if (request.status === 201 && body?.key && body.previewUrl) resolve({ key: body.key, previewUrl: body.previewUrl });
      else reject(new Error(body?.error ?? "L’envoi a échoué. Réessayez."));
    };
    request.onerror = () => reject(new Error("Connexion interrompue pendant l’envoi. Réessayez."));
    const data = new FormData();
    data.append("photo", file);
    request.send(data);
  });
}

/** uploadUrl : adresse d'envoi (par défaut, le catalogue de la boutique ; l'assistant de création en fournit une autre). */
export function PhotoManager({ initialPhotos, error, uploadUrl = "/api/dashboard/produits/photos" }: { initialPhotos: ExistingPhoto[]; error?: string; uploadUrl?: string }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialPhotos.map((photo) => ({ uid: photo.id, id: photo.id, previewUrl: photo.previewUrl, alt: photo.alt, status: "ready", progress: 100 })),
  );
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const kept = photos.filter((photo) => photo.status !== "error");
  const remaining = maxPhotos - kept.length;
  // previewUrl n'est pas utilisé par le serveur : il sert à réafficher les photos après une actualisation.
  const serialized = JSON.stringify(
    photos.filter((photo) => photo.status === "ready").map((photo) => ({ id: photo.id, key: photo.key, alt: photo.alt.trim(), previewUrl: photo.previewUrl })),
  );

  // Saisie gardée (useFormPersistence) : on signale chaque changement de la liste, et on accepte la liste restaurée.
  const hiddenRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [serialized]);
  useRestorableValue(hiddenRef, (restored) => {
    try {
      const items = JSON.parse(restored) as { id?: string; key?: string; alt?: string; previewUrl?: string }[];
      setPhotos(
        items
          .filter((item) => item.previewUrl && (item.id || item.key))
          .slice(0, maxPhotos)
          .map((item) => ({ uid: item.id ?? item.key!, id: item.id, key: item.key, previewUrl: item.previewUrl, alt: item.alt ?? "", status: "ready", progress: 100 })),
      );
    } catch {
      // Valeur illisible : on garde la liste actuelle.
    }
  });

  const update = (uid: string, patch: Partial<PhotoItem>) =>
    setPhotos((current) => current.map((photo) => (photo.uid === uid ? { ...photo, ...patch } : photo)));

  function addFiles(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    const slots = maxPhotos - photos.filter((photo) => photo.status !== "error").length;
    if (slots <= 0) {
      setNotice("Vous avez atteint la limite de 5 photos par produit.");
      return;
    }
    setNotice(list.length > slots ? `Seules ${slots} photo${slots > 1 ? "s ont" : " a"} été ajoutée${slots > 1 ? "s" : ""} : 5 photos au maximum par produit.` : "");
    for (const file of list.slice(0, slots)) {
      const uid = uuid();
      const item: PhotoItem = { uid, alt: "", status: "uploading", progress: 0, fileName: file.name };
      if (!acceptedTypes.includes(file.type)) {
        setPhotos((current) => [...current, { ...item, status: "error", error: "Format refusé : JPG, PNG ou WebP uniquement." }]);
        continue;
      }
      if (file.size > maxBytes) {
        setPhotos((current) => [...current, { ...item, status: "error", error: "Photo trop lourde : 5 Mo maximum." }]);
        continue;
      }
      setPhotos((current) => [...current, item]);
      uploadPhoto(uploadUrl, file, (progress) => update(uid, { progress }))
        .then(({ key, previewUrl }) => update(uid, { key, previewUrl, status: "ready", progress: 100 }))
        .catch((uploadError: Error) => update(uid, { status: "error", error: uploadError.message }));
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    setPhotos((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div className="photo-manager">
      <h2 className="v-card-title">
        Photos{" "}
        <span className="v-card-title-meta">
          · {kept.length} sur 5 · 5 photos au maximum
        </span>
      </h2>
      <input data-restorable="" name="photos" ref={hiddenRef} type="hidden" value={serialized} />
      {remaining > 0 && (
        <label
          className={`photo-dropzone ${dragging ? "is-dragging" : ""}`}
          htmlFor={inputId}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              setDragging(true);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <span aria-hidden="true" className="photo-dropzone-icon">⬆</span>
          <strong>Glissez vos photos ici</strong>
          <span>
            ou <span className="v-link-inline">parcourez vos fichiers</span>
          </span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            id={inputId}
            multiple
            onChange={(event) => {
              addFiles(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
            }}
            ref={inputRef}
            type="file"
          />
        </label>
      )}

      <ol className="photo-grid">
        {photos.map((photo, index) => (
          <li
            className={`photo-tile is-${photo.status} ${dragIndex === index ? "is-dragged" : ""}`}
            draggable={photo.status === "ready"}
            key={photo.uid}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => {
              if (dragIndex !== null) event.preventDefault();
            }}
            onDragStart={() => setDragIndex(index)}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
          >
            <div className="photo-tile-image">
              {photo.previewUrl ? (
                // Aperçu servi par /media ; next/image n'apporte rien sur une miniature provisoire.
                <img alt={photo.alt || `Photo ${index + 1}`} src={photo.previewUrl} />
              ) : photo.status === "uploading" ? (
                <span className="photo-progress">
                  <small>Envoi en cours…</small>
                  <span aria-label={`Envoi : ${photo.progress} %`} className="photo-progress-bar" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={photo.progress}>
                    <span style={{ width: `${photo.progress}%` }} />
                  </span>
                  <small>{photo.progress} %</small>
                </span>
              ) : (
                <span className="photo-error" role="alert">
                  <strong>{photo.fileName}</strong>
                  {photo.error}
                </span>
              )}
              {index === 0 && photo.status === "ready" && <span className="photo-main-badge">Principale</span>}
              {photo.status !== "uploading" && (
                <button
                  aria-label={photo.status === "error" ? "Retirer ce fichier" : `Retirer la photo ${index + 1}`}
                  className="photo-remove"
                  onClick={() => (photo.status === "error" ? setPhotos((current) => current.filter((item) => item.uid !== photo.uid)) : setConfirmRemove(photo.uid))}
                  type="button"
                >
                  ✕
                </button>
              )}
              {confirmRemove === photo.uid && (
                <span className="photo-confirm">
                  Retirer cette photo ?
                  <span>
                    <button className="btn btn-danger btn-sm" onClick={() => { setPhotos((current) => current.filter((item) => item.uid !== photo.uid)); setConfirmRemove(null); }} type="button">
                      Retirer
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRemove(null)} type="button">
                      Garder
                    </button>
                  </span>
                </span>
              )}
            </div>
            {photo.status === "ready" && (
              <div className="photo-tile-tools">
                <input
                  aria-label={`Texte alternatif de la photo ${index + 1}`}
                  maxLength={200}
                  onChange={(event) => update(photo.uid, { alt: event.target.value })}
                  placeholder="Description (facultatif)"
                  value={photo.alt}
                />
                <span>
                  <button aria-label={`Monter la photo ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)} type="button"><ChevronLeft aria-hidden="true" size={16} /></button>
                  <button aria-label={`Descendre la photo ${index + 1}`} disabled={index === photos.length - 1} onClick={() => move(index, index + 1)} type="button"><ChevronRight aria-hidden="true" size={16} /></button>
                </span>
              </div>
            )}
          </li>
        ))}
        {Array.from({ length: Math.max(0, remaining) }, (_, index) => (
          <li className="photo-tile is-empty" key={`empty-${index}`}>
            <button aria-label="Ajouter une photo" className="photo-add" onClick={() => inputRef.current?.click()} type="button">
              +
            </button>
          </li>
        ))}
      </ol>
      <p className="v-field-help">
        JPG, PNG ou WebP, 5 Mo maximum par photo. La première photo est la photo principale : glissez pour changer l’ordre (ou utilisez les flèches).
        Quand vous atteignez 5 photos, la zone d’ajout disparaît.
      </p>
      {(notice || error) && <p className="v-field-error" role="alert">{error ?? notice}</p>}
    </div>
  );
}
