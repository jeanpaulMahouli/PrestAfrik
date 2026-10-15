"use client";

import { startTransition, useActionState, useState } from "react";
import { saveStorePage, type PageSaveState } from "@/modules/pages/actions";
import { blockLabels, buttonTargets, emptyBlock, type PageBlock } from "@/modules/pages/blocks";
import { uuid } from "@/lib/uuid";

type EditorBlock = PageBlock & { uid: string; uploading?: boolean; error?: string };

const blockTypes = Object.keys(blockLabels) as PageBlock["type"][];

/** Retire les champs d'interface (identifiant, état d'envoi) avant l'enregistrement. */
function toBlock(block: EditorBlock): PageBlock {
  const copy: Record<string, unknown> = { ...block };
  delete copy.uid;
  delete copy.uploading;
  delete copy.error;
  return copy as PageBlock;
}

function summary(block: PageBlock) {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return block.text || "(vide)";
    case "image":
      return block.alt ? `Image · texte alternatif : ${block.alt}` : "Image";
    case "list":
      return block.items.filter(Boolean).join(" · ") || "(vide)";
    case "button":
      return `« ${block.label} » → ${buttonTargets[block.target]}`;
    case "qa":
      return block.question || "(question vide)";
    case "contact":
      return "Téléphone, e-mail, adresse et horaires de la boutique";
  }
}

/** Éditeur de page en blocs (maquette « Pages éditoriales »). */
export function PageEditor({ kind, initialTitle, initialBlocks, previewHref }: { kind: string; initialTitle: string; initialBlocks: PageBlock[]; previewHref: string | null }) {
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initialBlocks.map((block) => ({ ...block, uid: uuid() })));
  const [editing, setEditing] = useState<string | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [state, action, pending] = useActionState<PageSaveState, FormData>(saveStorePage, null);

  const update = (uid: string, patch: Partial<PageBlock>) =>
    setBlocks((current) => current.map((block) => (block.uid === uid ? ({ ...block, ...patch } as EditorBlock) : block)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    setBlocks((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  function save(status: "DRAFT" | "PUBLISHED") {
    const data = new FormData();
    data.append("kind", kind);
    data.append("title", title);
    data.append("status", status);
    data.append("blocks", JSON.stringify(blocks.map(toBlock)));
    startTransition(() => action(data));
  }

  async function uploadImage(uid: string, file: File | undefined) {
    if (!file) return;
    setBlocks((current) => current.map((block) => (block.uid === uid ? { ...block, uploading: true, error: undefined } : block)));
    const data = new FormData();
    data.append("photo", file);
    const response = await fetch("/api/dashboard/produits/photos", { method: "POST", body: data }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { key?: string; previewUrl?: string; error?: string } | null;
    setBlocks((current) =>
      current.map((block) =>
        block.uid === uid && block.type === "image"
          ? response?.ok && body?.key
            ? { ...block, key: body.key, previewUrl: body.previewUrl, url: undefined, uploading: false }
            : { ...block, uploading: false, error: body?.error ?? "L’envoi a échoué. Réessayez." }
          : block,
      ),
    );
  }

  return (
    <section aria-labelledby="page-editor-title" className="v-card">
      <div className="v-card-header">
        <h2 className="v-card-title" id="page-editor-title">Modifier : {title || "Sans titre"}</h2>
        <div className="v-button-row page-editor-actions">
          {previewHref && <a className="btn btn-secondary btn-sm" href={previewHref} rel="noopener noreferrer" target="_blank">Aperçu</a>}
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => save("DRAFT")} type="button">Enregistrer en brouillon</button>
          <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => save("PUBLISHED")} type="button">{pending ? "Enregistrement…" : "Publier la page"}</button>
        </div>
      </div>
      {state?.ok === false && <p className="v-banner v-banner-danger" role="alert">{state.message}</p>}
      {state?.ok && <p className="v-banner v-banner-success" role="status">{state.status === "PUBLISHED" ? "Page publiée : elle est visible sur votre boutique." : "Brouillon enregistré."}</p>}

      <label className="v-field">
        Titre de la page
        <input maxLength={80} onChange={(event) => setTitle(event.target.value)} value={title} />
      </label>

      <ol className="block-list">
        {blocks.map((block, index) => (
          <li
            className={`block-item ${dragged === index ? "is-dragged" : ""}`}
            draggable
            key={block.uid}
            onDragEnd={() => setDragged(null)}
            onDragOver={(event) => dragged !== null && event.preventDefault()}
            onDragStart={() => setDragged(index)}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged !== null) move(dragged, index);
              setDragged(null);
            }}
          >
            <span aria-hidden="true" className="block-handle">⋮⋮</span>
            <div className="block-body">
              <button aria-expanded={editing === block.uid} className="block-summary" onClick={() => setEditing(editing === block.uid ? null : block.uid)} type="button">
                <small>{blockLabels[block.type]}</small>
                <span>{summary(block)}</span>
              </button>
              {editing === block.uid && (
                <div className="block-fields">
                  {(block.type === "heading" || block.type === "paragraph") &&
                    (block.type === "heading" ? (
                      <input aria-label="Texte du titre" maxLength={120} onChange={(event) => update(block.uid, { text: event.target.value })} value={block.text} />
                    ) : (
                      <textarea aria-label="Texte du paragraphe" maxLength={2000} onChange={(event) => update(block.uid, { text: event.target.value })} rows={4} value={block.text} />
                    ))}
                  {block.type === "image" && (
                    <>
                      {(block.previewUrl || block.url) && (
                        <img alt={block.alt} className="block-image-preview" src={block.previewUrl ?? block.url} />
                      )}
                      <input accept="image/jpeg,image/png,image/webp" aria-label="Choisir une image" onChange={(event) => uploadImage(block.uid, event.currentTarget.files?.[0])} type="file" />
                      {block.uploading && <span className="v-field-help">Envoi en cours…</span>}
                      {block.error && <span className="v-field-error">{block.error}</span>}
                      <input aria-label="Texte alternatif" maxLength={200} onChange={(event) => update(block.uid, { alt: event.target.value })} placeholder="Texte alternatif (ce que montre l’image)" value={block.alt} />
                    </>
                  )}
                  {block.type === "list" && (
                    <>
                      {block.items.map((item, itemIndex) => (
                        <span className="block-list-row" key={itemIndex}>
                          <input aria-label={`Élément ${itemIndex + 1}`} maxLength={160} onChange={(event) => update(block.uid, { items: block.items.map((value, position) => (position === itemIndex ? event.target.value : value)) })} value={item} />
                          <button aria-label={`Retirer l’élément ${itemIndex + 1}`} onClick={() => update(block.uid, { items: block.items.filter((_, position) => position !== itemIndex) })} type="button">✕</button>
                        </span>
                      ))}
                      {block.items.length < 12 && <button className="v-link-button" onClick={() => update(block.uid, { items: [...block.items, ""] })} type="button">+ Ajouter un élément</button>}
                    </>
                  )}
                  {block.type === "button" && (
                    <>
                      <input aria-label="Texte du bouton" maxLength={40} onChange={(event) => update(block.uid, { label: event.target.value })} value={block.label} />
                      <select aria-label="Destination du bouton" onChange={(event) => update(block.uid, { target: event.target.value as keyof typeof buttonTargets })} value={block.target}>
                        {Object.entries(buttonTargets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </>
                  )}
                  {block.type === "qa" && (
                    <>
                      <input aria-label="Question" maxLength={200} onChange={(event) => update(block.uid, { question: event.target.value })} placeholder="Question" value={block.question} />
                      <textarea aria-label="Réponse" maxLength={1000} onChange={(event) => update(block.uid, { answer: event.target.value })} placeholder="Réponse" rows={3} value={block.answer} />
                    </>
                  )}
                  {block.type === "contact" &&
                    (
                      [
                        ["showPhone", "Téléphone"],
                        ["showEmail", "E-mail"],
                        ["showAddress", "Adresse"],
                        ["showHours", "Horaires de retrait"],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="v-check" key={key}>
                        <input checked={block[key]} onChange={(event) => update(block.uid, { [key]: event.target.checked })} type="checkbox" />
                        {label}
                      </label>
                    ))}
                </div>
              )}
            </div>
            <span className="block-tools">
              <button aria-label={`Monter le bloc ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)} type="button">↑</button>
              <button aria-label={`Descendre le bloc ${index + 1}`} disabled={index === blocks.length - 1} onClick={() => move(index, index + 1)} type="button">↓</button>
              <button className="v-link-button" onClick={() => setBlocks((current) => current.filter((item) => item.uid !== block.uid))} type="button">Supprimer</button>
            </span>
          </li>
        ))}
      </ol>
      {!blocks.length && <p className="v-small v-muted">Cette page est vide : ajoutez un premier bloc.</p>}

      <p className="v-small block-add-label">Ajouter un bloc</p>
      <div className="variable-chips block-add">
        {blockTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              const block = { ...emptyBlock(type), uid: uuid() } as EditorBlock;
              setBlocks((current) => [...current, block]);
              setEditing(block.uid);
            }}
            type="button"
          >
            {blockLabels[type]}
          </button>
        ))}
      </div>
      <p className="v-small v-muted">Pas de code HTML ni de JavaScript : seuls ces blocs sont acceptés.</p>
    </section>
  );
}
