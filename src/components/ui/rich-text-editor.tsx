"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { RichText } from "@/components/ui/rich-text";

type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
  label: string;
  help?: string;
  invalid?: boolean;
  describedBy?: string;
};

const icons = {
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <path d="M10 5h8M6 19h8M14 5l-4 14" />,
  heading: <path d="M5 5v14M15 5v14M5 12h10M19 12v7" />,
  bullets: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  numbers: <path d="M10 6h10M10 12h10M10 18h10M4 6h1v4M4 10h2M4 14h2l-2 3h2" />,
};

/** Mini éditeur de texte : gras, italique, sous-titre, listes, avec aperçu (aucun HTML stocké). */
export function RichTextEditor({ name, defaultValue = "", maxLength = 2000, placeholder, label, help, invalid, describedBy }: RichTextEditorProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);

  function commit(next: string, selectionStart: number, selectionEnd: number) {
    if (next.length > maxLength) return;
    setValue(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  /** Entoure la sélection d'un marqueur (ou le retire s'il est déjà présent). */
  function wrap(marker: string) {
    const area = ref.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || "texte";
    const before = value.slice(0, start);
    const after = value.slice(end);
    if (before.endsWith(marker) && after.startsWith(marker)) {
      commit(before.slice(0, -marker.length) + selected + after.slice(marker.length), start - marker.length, start - marker.length + selected.length);
      return;
    }
    commit(`${before}${marker}${selected}${marker}${after}`, start + marker.length, start + marker.length + selected.length);
  }

  /** Ajoute ou retire un préfixe au début de chaque ligne sélectionnée. */
  function prefixLines(kind: "bullets" | "numbers" | "heading") {
    const area = ref.current;
    if (!area) return;
    const lineStart = value.lastIndexOf("\n", area.selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", area.selectionEnd);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const pattern = kind === "bullets" ? /^- / : kind === "numbers" ? /^\d+\. / : /^## /;
    const allPrefixed = lines.every((line) => pattern.test(line));
    const updated = lines
      .map((line, index) => {
        const clean = line.replace(/^(- |\d+\. |## )/, "");
        if (allPrefixed) return clean;
        return kind === "bullets" ? `- ${clean}` : kind === "numbers" ? `${index + 1}. ${clean}` : `## ${clean}`;
      })
      .join("\n");
    commit(value.slice(0, lineStart) + updated + value.slice(lineEnd), lineStart, lineStart + updated.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrap("**");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrap("*");
    } else if (event.key === "Enter") {
      // Continue automatiquement une liste.
      const area = event.currentTarget;
      const lineStart = value.lastIndexOf("\n", area.selectionStart - 1) + 1;
      const line = value.slice(lineStart, area.selectionStart);
      const bullet = /^- (.*)$/.exec(line);
      const number = /^(\d+)\. (.*)$/.exec(line);
      if (!bullet && !number) return;
      event.preventDefault();
      if ((bullet && !bullet[1]) || (number && !number[2])) {
        commit(value.slice(0, lineStart) + value.slice(area.selectionStart), lineStart, lineStart);
        return;
      }
      const prefix = bullet ? "\n- " : `\n${Number(number![1]) + 1}. `;
      const at = area.selectionStart;
      commit(value.slice(0, at) + prefix + value.slice(area.selectionEnd), at + prefix.length, at + prefix.length);
    }
  }

  const tools: { key: keyof typeof icons; label: string; run: () => void }[] = [
    { key: "bold", label: "Gras (Ctrl+B)", run: () => wrap("**") },
    { key: "italic", label: "Italique (Ctrl+I)", run: () => wrap("*") },
    { key: "heading", label: "Sous-titre", run: () => prefixLines("heading") },
    { key: "bullets", label: "Liste à puces", run: () => prefixLines("bullets") },
    { key: "numbers", label: "Liste numérotée", run: () => prefixLines("numbers") },
  ];

  return (
    <div className="v-field rich-editor-field">
      <label htmlFor={id}>{label}</label>
      <div className={`rich-editor ${invalid ? "is-invalid" : ""}`}>
        <div aria-label="Mise en forme" className="rich-editor-toolbar" role="toolbar">
          {tools.map((tool) => (
            <button aria-label={tool.label} disabled={preview} key={tool.key} onClick={tool.run} title={tool.label} type="button">
              <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
                {icons[tool.key]}
              </svg>
            </button>
          ))}
          <span className="rich-editor-spacer" />
          <button aria-pressed={preview} className="rich-editor-mode" onClick={() => setPreview((current) => !current)} type="button">
            {preview ? "Modifier" : "Aperçu"}
          </button>
        </div>
        <textarea
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          hidden={preview}
          id={id}
          maxLength={maxLength}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={ref}
          rows={6}
          value={value}
        />
        {preview && (value.trim() ? <RichText className="rich-text rich-editor-preview" source={value} /> : <p className="rich-editor-preview v-muted">Rien à afficher pour le moment.</p>)}
      </div>
      <span className="v-field-help">
        {help} {value.length} / {maxLength}
      </span>
    </div>
  );
}
