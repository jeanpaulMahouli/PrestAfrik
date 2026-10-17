"use client";

import { useEffect, type RefObject } from "react";

/**
 * Garde la saisie d'un formulaire non enregistré : après une actualisation de la page, ou en revenant
 * sur une étape, les champs retrouvent ce qui avait été tapé. Stockage : sessionStorage (onglet en cours),
 * effacé à l'envoi du formulaire.
 *
 * Champs gardés : <input>, <select>, <textarea> nommés — sauf mots de passe, fichiers, champs cachés
 * (à part ceux marqués data-restorable) et tout ce qui est dans un élément [data-no-persist].
 * Les champs contrôlés par React sont restaurés en simulant une saisie, pour que leur état suive.
 */
export function useFormPersistence(formRef: RefObject<HTMLFormElement | null>, storageKey: string | null) {
  useEffect(() => {
    const form = formRef.current;
    if (!form || !storageKey) return;
    const key = `prestafrik:formulaire:${storageKey}`;
    let restoring = true;
    let cancelled = false;

    const fields = () =>
      Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return false;
        if (!element.name || element.disabled || element.closest("[data-no-persist]")) return false;
        if (element instanceof HTMLInputElement) {
          if (["password", "file", "submit", "button", "reset", "image"].includes(element.type)) return false;
          if (element.type === "hidden" && !element.hasAttribute("data-restorable")) return false;
        }
        return true;
      });

    const save = () => {
      if (restoring) return;
      const values: Record<string, string | boolean> = {};
      for (const field of fields()) {
        if (field instanceof HTMLInputElement && field.type === "checkbox") values[field.name] = field.checked;
        else if (field instanceof HTMLInputElement && field.type === "radio") {
          if (field.checked) values[field.name] = field.value;
        } else values[field.name] = field.value;
      }
      try {
        sessionStorage.setItem(key, JSON.stringify(values));
      } catch {
        // Stockage indisponible (navigation privée…) : on continue sans.
      }
    };

    const setNativeValue = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) => {
      const prototype = Object.getPrototypeOf(field) as object;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
      field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    };

    const restore = async () => {
      let saved: Record<string, string | boolean> | null = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Record<string, string | boolean> | null;
      } catch {
        saved = null;
      }
      if (saved) {
        // Champ par champ, en laissant React se mettre à jour entre deux (ex. la ville dépend de la région).
        for (const name of Object.keys(saved)) {
          if (cancelled) return;
          const value = saved[name];
          for (const field of fields().filter((item) => item.name === name)) {
            if (field instanceof HTMLInputElement && field.type === "checkbox") {
              if (field.checked !== value) field.click();
            } else if (field instanceof HTMLInputElement && field.type === "radio") {
              if (field.value === value && !field.checked) field.click();
            } else if (field instanceof HTMLInputElement && field.type === "hidden") {
              if (field.value !== value) field.dispatchEvent(new CustomEvent("prestafrik:restore", { detail: String(value) }));
            } else if (field.value !== value) {
              setNativeValue(field, String(value));
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      }
      restoring = false;
    };

    const clear = () => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Rien à faire.
      }
    };

    void restore();
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", clear);
    return () => {
      cancelled = true;
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      form.removeEventListener("submit", clear);
    };
  }, [formRef, storageKey]);
}

/** Pour un champ caché piloté par React (liste déroulante maison) : reçoit la valeur restaurée. */
export function useRestorableValue(inputRef: RefObject<HTMLInputElement | null>, onRestore: (value: string) => void) {
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const listener = (event: Event) => onRestore((event as CustomEvent<string>).detail);
    input.addEventListener("prestafrik:restore", listener);
    return () => input.removeEventListener("prestafrik:restore", listener);
  }, [inputRef, onRestore]);
}
