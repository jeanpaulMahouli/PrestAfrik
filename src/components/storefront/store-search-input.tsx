"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStoreHref } from "@/components/storefront/store-links";
import { formatFcfa } from "@/lib/format";

type Suggestion = { name: string; slug: string; priceXaf: number; imageUrl: string | null };

/**
 * Champ de recherche de la vitrine avec suggestions pendant la saisie (recherche tolérante : pas besoin
 * du nom exact). Entrée envoie le formulaire (page de résultats), flèches et Échap au clavier.
 */
export function StoreSearchInput({ storeSlug, id, autoFocus = false, inputRef }: { storeSlug: string; id: string; autoFocus?: boolean; inputRef?: React.Ref<HTMLInputElement> }) {
  const link = useStoreHref(storeSlug);
  const listId = `${useId()}-suggestions`;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/boutique/${encodeURIComponent(storeSlug)}/recherche?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = (await response.json()) as { suggestions: Suggestion[]; total?: number };
        setItems(data.suggestions ?? []);
        setTotal(data.total ?? 0);
        setActive(-1);
      } catch {
        // Réseau coupé : la recherche classique (Entrée) reste possible.
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, storeSlug]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const show = open && trimmed.length >= 2;

  return (
    <div className="sf-suggest" ref={rootRef}>
      <input
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={show && items.length > 0}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        id={id}
        maxLength={100}
        name="q"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && items.length) {
            event.preventDefault();
            setActive((value) => (value + 1) % items.length);
          } else if (event.key === "ArrowUp" && items.length) {
            event.preventDefault();
            setActive((value) => (value <= 0 ? items.length - 1 : value - 1));
          } else if (event.key === "Enter" && show && active >= 0 && items[active]) {
            event.preventDefault();
            window.location.assign(link(items[active].slug));
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Rechercher un produit"
        ref={inputRef}
        role="combobox"
        type="search"
        value={query}
      />
      <div className="sf-suggest-panel" hidden={!show}>
        {items.length ? (
          <ul aria-label="Produits suggérés" id={listId} role="listbox">
            {items.map((item, index) => (
              <li aria-selected={index === active} id={`${listId}-${index}`} key={item.slug} onMouseEnter={() => setActive(index)} role="option">
                <a href={link(item.slug)} tabIndex={-1}>
                  <span aria-hidden="true" className="sf-suggest-thumb">
                    {item.imageUrl && <img alt="" height={44} loading="lazy" src={item.imageUrl} width={44} />}
                  </span>
                  <span className="sf-suggest-name">{item.name}</span>
                  <strong>{formatFcfa(item.priceXaf)}</strong>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sf-suggest-empty">Aucun produit ne ressemble à « {trimmed} ».</p>
        )}
        {total > items.length && (
          <button className="sf-suggest-all" type="submit">
            Voir les {total} résultats
          </button>
        )}
      </div>
    </div>
  );
}
