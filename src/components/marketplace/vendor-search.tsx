"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Suggestion = { name: string; slug: string; href: string; city: string | null; country: string; activity: string | null; logoUrl: string | null };
type Status = "idle" | "loading" | "ready" | "error";

const strip = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Met en évidence le texte saisi dans une suggestion, sans tenir compte des accents ni des majuscules. */
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const needle = strip(query.trim());
  if (!needle) return text;
  // Chaque caractère d'origine donne un caractère normalisé : les positions se correspondent.
  const chars = [...text];
  const haystack = chars.map((char) => strip(char).slice(0, 1) || char).join("");
  const start = haystack.indexOf(needle);
  if (start < 0) return text;
  return (
    <>
      {chars.slice(0, start).join("")}
      <mark>{chars.slice(start, start + needle.length).join("")}</mark>
      {chars.slice(start + needle.length).join("")}
    </>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "B";

/**
 * Recherche de vendeurs avec suggestions pendant la saisie (motif « combobox » ARIA 1.2) :
 * flèches, Entrée et Échap au clavier ; « Rechercher » ouvre la page de résultats /recherche.
 */
export function VendorSearch({ defaultValue = "", className = "" }: { defaultValue?: string; className?: string }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-liste`;
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const rootRef = useRef<HTMLFormElement>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setStatus("idle");
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/recherche?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { suggestions: Suggestion[] };
        setItems(data.suggestions);
        setActive(-1);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, attempt]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const showList = open && trimmed.length >= 2 && status !== "idle";
  const goToResults = () => {
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      action="/recherche"
      className={`vendor-search ${className}`.trim()}
      onSubmit={(event) => {
        event.preventDefault();
        if (showList && active >= 0 && items[active]) window.location.assign(items[active].href);
        else goToResults();
      }}
      ref={rootRef}
      role="search"
    >
      <label className="vendor-search-label" htmlFor={`${id}-champ`}>
        Rechercher un vendeur, une boutique ou une ville
      </label>
      <div className="vendor-search-bar">
        <Search aria-hidden="true" className="vendor-search-icon" size={20} />
        <input
          aria-activedescendant={showList && active >= 0 ? `${id}-option-${active}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          autoComplete="off"
          enterKeyHint="search"
          id={`${id}-champ`}
          maxLength={60}
          name="q"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && items.length) {
              event.preventDefault();
              setOpen(true);
              setActive((value) => (value + 1) % items.length);
            } else if (event.key === "ArrowUp" && items.length) {
              event.preventDefault();
              setActive((value) => (value <= 0 ? items.length - 1 : value - 1));
            } else if (event.key === "Escape") {
              if (open) event.preventDefault();
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder="Ex. pagne, Douala, beauté…"
          role="combobox"
          type="search"
          value={query}
        />
        <button className="vendor-search-submit" type="submit">
          Rechercher
        </button>
      </div>

      <div className="vendor-search-popover" hidden={!showList}>
        {status === "loading" && (
          <div aria-hidden="true" className="vendor-search-skeleton">
            <Loader2 className="vendor-search-spin" size={16} />
            <span />
            <span />
          </div>
        )}
        {status === "error" && (
          <p className="vendor-search-state" role="alert">
            La recherche n’a pas pu aboutir (connexion lente ou coupée ?).{" "}
            <button className="vendor-search-retry" onClick={() => setAttempt((value) => value + 1)} type="button">
              Réessayer
            </button>
          </p>
        )}
        {status === "ready" && items.length === 0 && (
          <p className="vendor-search-state">Aucun vendeur ne correspond à « {trimmed} ». Essayez un nom de ville ou une activité.</p>
        )}
        <ul aria-label="Vendeurs suggérés" className="vendor-search-list" id={listId} role="listbox">
          {status === "ready" &&
            items.map((item, index) => (
              <li aria-selected={index === active} id={`${id}-option-${index}`} key={item.slug} onMouseEnter={() => setActive(index)} role="option">
                <a href={item.href} tabIndex={-1}>
                  <span aria-hidden="true" className="vendor-search-logo">
                    {item.logoUrl ? <img alt="" height={40} loading="lazy" src={item.logoUrl} width={40} /> : initials(item.name)}
                  </span>
                  <span className="vendor-search-text">
                    <strong>
                      <Highlight query={trimmed} text={item.name} />
                    </strong>
                    <small>
                      <MapPin aria-hidden="true" size={12} /> {[item.city, item.country].filter(Boolean).join(", ")}
                      {item.activity ? ` · ${item.activity}` : ""}
                    </small>
                  </span>
                </a>
              </li>
            ))}
        </ul>
        {status === "ready" && items.length > 0 && (
          <button className="vendor-search-all" onClick={goToResults} type="button">
            Voir tous les résultats pour « {trimmed} »
          </button>
        )}
        <p aria-live="polite" className="visually-hidden">
          {status === "ready" ? (items.length ? `${items.length} vendeur${items.length > 1 ? "s" : ""} suggéré${items.length > 1 ? "s" : ""}` : "Aucun vendeur") : ""}
        </p>
      </div>
    </form>
  );
}
