"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { importProducts, type ImportState } from "@/modules/catalog/import-actions";
import { CheckIcon } from "@/components/ui/icons";

const templateCsv =
  "reference;nom;description;categorie;prix;prix_promo;disponibilite;stock\r\nRobe-001;Robe wax Akwa;Robe en pagne wax, coupe droite;Robes;18000;;disponible;12\r\nSac-007;Sac en raphia;;Sacs;9500;8500;sur commande;\r\n";

function downloadText(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`);

export function ImportWizard() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importProducts, null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const step = state?.step === "preview" ? 2 : state?.step === "done" ? 3 : 1;

  const submit = (mode: "preview" | "confirm", selected = file) => {
    if (!selected) return;
    const data = new FormData();
    data.append("file", selected);
    data.append("mode", mode);
    startTransition(() => action(data));
  };

  const choose = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    submit("preview", selected);
  };

  const errorsByLine = useMemo(() => {
    if (state?.step !== "preview") return new Map<number, string>();
    const map = new Map<number, string>();
    for (const error of state.analysis.errors) if (!map.has(error.line)) map.set(error.line, error.message);
    return map;
  }, [state]);

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Importer des produits</h1>
          <p className="v-page-subtitle">Ajoutez plusieurs produits d’un coup à partir d’un fichier CSV. Nous vérifions tout avant d’importer.</p>
        </div>
        <div className="v-page-actions">
          {step === 2 ? (
            <>
              <button className="btn btn-secondary" onClick={() => {
                  setFile(null);
                  const data = new FormData();
                  data.append("mode", "reset");
                  startTransition(() => action(data));
                }} type="button">Retour</button>
              {state?.step === "preview" && state.analysis.rows.length > 0 && (
                <button className="btn btn-primary" disabled={pending} onClick={() => submit("confirm")} type="button">
                  {pending ? "Import en cours…" : `Importer ${state.analysis.rows.length} produit${state.analysis.rows.length > 1 ? "s" : ""}`}
                </button>
              )}
            </>
          ) : (
            <Link className="btn btn-secondary" href="/dashboard/produits">Retour</Link>
          )}
        </div>
      </div>

      <ol aria-label="Étapes de l’import" className="stepper">
        {["Fichier", "Aperçu", "Confirmation"].map((label, index) => (
          <li aria-current={step === index + 1 ? "step" : undefined} className={step > index + 1 ? "is-done" : step === index + 1 ? "is-current" : ""} key={label}>
            <span aria-hidden="true">{step > index + 1 ? <CheckIcon size={12} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {state?.step === "error" && <p className="v-banner v-banner-danger" role="alert">{state.message}</p>}

      {step === 1 && (
        <div className="v-split">
          <section className="v-card">
            <label
              className={`photo-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}
            >
              <span aria-hidden="true" className="photo-dropzone-icon">⬆</span>
              <strong>{pending ? "Vérification du fichier…" : "Glissez votre fichier CSV ici"}</strong>
              <span>ou <span className="v-link-inline">parcourez vos fichiers</span></span>
              <input accept=".csv,text/csv" className="visually-hidden" disabled={pending} onChange={(event) => choose(event.currentTarget.files?.[0])} ref={inputRef} type="file" />
            </label>
            <p className="v-field-help">Fichier CSV encodé en UTF-8, 5 Mo et 1 000 lignes au maximum. Séparateur « , » ou « ; ».</p>
          </section>
          <section className="v-card">
            <h2 className="v-card-title">Colonnes attendues</h2>
            <ul className="tips-list">
              <li><strong>reference</strong>, <strong>nom</strong>, <strong>prix</strong> : obligatoires</li>
              <li>description, categorie, prix_promo, disponibilite, stock : facultatives</li>
              <li>Une référence déjà présente met à jour le produit</li>
              <li>Disponibilité : disponible, épuisé ou sur commande</li>
            </ul>
            <button className="btn btn-secondary" onClick={() => downloadText("modele-produits.csv", templateCsv)} type="button">
              Télécharger le modèle
            </button>
          </section>
        </div>
      )}

      {state?.step === "preview" && (
        <>
          <section aria-label="Résumé du fichier" className="stat-grid import-stats">
            <article className="stat-card">
              <p className="stat-card-label">Fichier</p>
              <p className="stat-card-value import-file-name">{state.fileName}</p>
              <p className="stat-card-hint">{state.analysis.totalLines} lignes · {sizeLabel(state.fileSize)}</p>
            </article>
            <article className="stat-card">
              <p className="stat-card-label">Lignes valides</p>
              <p className="stat-card-value">{state.analysis.rows.length}</p>
              <p className="stat-card-hint">
                seront importées{state.existingSkus.length ? ` (dont ${state.existingSkus.length} mise${state.existingSkus.length > 1 ? "s" : ""} à jour)` : ""}
              </p>
            </article>
            <article className="stat-card">
              <p className="stat-card-label">Lignes en erreur</p>
              <p className="stat-card-value">{errorsByLine.size}</p>
              <p className="stat-card-hint">seront ignorées</p>
            </article>
          </section>
          <div className="v-split">
            <section className="v-card">
              <h2 className="v-card-title">Aperçu des premières lignes</h2>
              <table className="v-table import-table">
                <thead>
                  <tr>
                    <th scope="col">Réf.</th>
                    <th scope="col">Nom</th>
                    <th scope="col">Catégorie</th>
                    <th scope="col">Prix</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Contrôle</th>
                  </tr>
                </thead>
                <tbody>
                  {state.analysis.preview.map((row) => (
                    <tr key={row.line}>
                      <td className="v-cell-primary">{row.values.reference || "—"}</td>
                      <td data-label="Nom">{row.values.nom || "—"}</td>
                      <td data-label="Catégorie">{row.values.categorie || "—"}</td>
                      <td data-label="Prix">{row.values.prix || "—"}</td>
                      <td data-label="Stock">{row.values.stock || "—"}</td>
                      <td data-label="Contrôle">
                        <span className={`badge badge-${row.valid ? "success" : "danger"}`} title={errorsByLine.get(row.line)}>
                          {row.valid ? "Valide" : "Erreur"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="v-card">
              <h2 className="v-card-title">Rapport d’erreurs</h2>
              {state.analysis.errors.length ? (
                <>
                  <ul className="order-rows">
                    {state.analysis.errors.slice(0, 8).map((error, index) => (
                      <li key={`${error.line}-${error.column}-${index}`}>
                        <span className="v-muted">Ligne {error.line}</span>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                  {state.analysis.errors.length > 8 && <p className="v-small v-muted">… et {state.analysis.errors.length - 8} autre{state.analysis.errors.length > 9 ? "s" : ""}.</p>}
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      downloadText(
                        "rapport-erreurs-import.csv",
                        ["ligne;colonne;message", ...state.analysis.errors.map((error) => [error.line, error.column, error.message].map(csvCell).join(";"))].join("\r\n"),
                      )
                    }
                    type="button"
                  >
                    Télécharger le rapport
                  </button>
                </>
              ) : (
                <p className="todo-empty">Aucune erreur : toutes les lignes sont prêtes. Bravo !</p>
              )}
            </section>
          </div>
        </>
      )}

      {state?.step === "done" && (
        <section className="v-card v-empty">
          <h2>Import terminé. On avance !</h2>
          <p>
            {state.created} produit{state.created > 1 ? "s" : ""} ajouté{state.created > 1 ? "s" : ""}, {state.updated} mis à jour
            {state.skipped ? `, ${state.skipped} ligne${state.skipped > 1 ? "s" : ""} ignorée${state.skipped > 1 ? "s" : ""}` : ""}.
          </p>
          <Link className="btn btn-primary" href="/dashboard/produits">Voir mes produits</Link>
        </section>
      )}
    </>
  );
}
