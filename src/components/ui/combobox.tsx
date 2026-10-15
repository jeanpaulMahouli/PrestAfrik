"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type ComboboxOption = { value: string; label: string; hint?: string };

type ComboboxProps = {
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  help?: string;
  error?: string;
  /** Libellé de l'action « non listé » (saisie libre). */
  notListedLabel?: string;
  onNotListed?: () => void;
  disabled?: boolean;
  /** Nom du champ caché envoyé avec le formulaire. */
  name?: string;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Liste déroulante avec recherche (pattern ARIA « combobox » + « listbox ») : filtrage pendant la
 * frappe, clavier (↑ ↓ Début Fin Entrée Échap), option « non listé », feuille basse sur mobile.
 */
export function Combobox({ label, options, value, onChange, placeholder = "Choisir…", searchPlaceholder = "Tapez pour filtrer…", help, error, notListedLabel, onNotListed, disabled, name }: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return options.filter((option) => !q || normalize(option.label).includes(q) || normalize(option.hint ?? "").includes(q)).slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const index = filtered.findIndex((option) => option.value === value);
    setActive(index >= 0 ? index : 0);
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
    // Seulement à l'ouverture.
  }, [open]);

  useEffect(() => {
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(filtered.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      setQuery("");
      if (event.key === "Escape") triggerRef.current?.focus();
    }
  }

  return (
    <div className="v-field combobox" ref={rootRef}>
      <span className="combobox-label" id={`${id}-label`}>{label}</span>
      {name && <input name={name} type="hidden" value={value} />}
      <button
        aria-describedby={help || error ? `${id}-help` : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error) || undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        className={`combobox-trigger ${open ? "is-open" : ""}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className={selected ? "" : "combobox-placeholder"} id={`${id}-value`}>{selected?.label ?? placeholder}</span>
        <svg aria-hidden="true" height="8" viewBox="0 0 12 8" width="12"><path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
      </button>
      {open && (
        <div className="combobox-popup">
          <input
            aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
            aria-autocomplete="list"
            aria-controls={`${id}-listbox`}
            aria-expanded="true"
            aria-label={`${label} : rechercher`}
            className="combobox-search"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            ref={inputRef}
            role="combobox"
            value={query}
          />
          <ul aria-labelledby={`${id}-label`} className="combobox-list" id={`${id}-listbox`} role="listbox">
            {filtered.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className={`${index === active ? "is-active" : ""} ${option.value === value ? "is-selected" : ""}`}
                id={`${id}-option-${index}`}
                key={option.value}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(index)}
                role="option"
              >
                <span>
                  {option.label}
                  {option.hint && <small>{option.hint}</small>}
                </span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </li>
            ))}
            {filtered.length === 0 && <li aria-disabled="true" className="combobox-empty" role="option" aria-selected="false">Aucun résultat pour « {query} ».</li>}
          </ul>
          {notListedLabel && onNotListed && (
            <button
              className="combobox-not-listed"
              onClick={() => {
                setOpen(false);
                onNotListed();
              }}
              type="button"
            >
              {notListedLabel}
            </button>
          )}
        </div>
      )}
      {(help || error) && (
        <span className={error ? "v-field-error" : "v-field-help"} id={`${id}-help`} role={error ? "alert" : undefined}>
          {error ?? help}
        </span>
      )}
    </div>
  );
}
