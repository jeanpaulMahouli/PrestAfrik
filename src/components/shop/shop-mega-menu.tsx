"use client";

import { ArrowRight, CaretDown, CaretRight, SquaresFour } from "@phosphor-icons/react/ssr";
import { useEffect, useRef, useState } from "react";
import { marketplaceAds, type AdSlot } from "@/config/marketplace-ads";
import { formatXaf } from "@/modules/catalog/format";
import type { ShopProduct } from "@/modules/marketplace/shop";

export type MegaCategory = { slug: string; label: string; href: string; count: number; products: ShopProduct[] };

/**
 * « Toutes les catégories » : grand menu. À gauche les catégories ; au survol (ou au clavier), les produits
 * à la une de la catégorie, puis l'emplacement publicitaire du menu. Sur téléphone, la liste seule.
 * Se ferme au clic à l'extérieur, avec Échap, et en quittant le menu au clavier.
 */
export function MegaMenu({ categories, active, allHref, ad = marketplaceAds.menu }: { categories: MegaCategory[]; active?: string; /** « Toutes les catégories » : tous les produits. */ allHref: string; /** Visuel du menu (Administration → Annonces). */ ad?: AdSlot }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => Math.max(0, categories.findIndex((category) => category.slug === active)));
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!categories.length) return null;
  const category = categories[current] ?? categories[0];
  const activeLabel = categories.find((item) => item.slug === active)?.label;

  return (
    <div
      className="sx-mega"
      onBlur={(event) => {
        if (!ref.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      ref={ref}
    >
      <button aria-controls="sx-mega-panel" aria-current={activeLabel ? "page" : undefined} aria-expanded={open} aria-label={activeLabel ?? "Toutes les catégories"} className="sx-mega-button" onClick={() => setOpen((value) => !value)} ref={buttonRef} type="button">
        <SquaresFour aria-hidden="true" className="sx-mega-icon" size={20} />
        <span className="sx-mega-label">{activeLabel ?? "Toutes les catégories"}</span>
        <span aria-hidden="true" className="sx-mega-short">
          Catégories
        </span>
        <CaretDown aria-hidden="true" className="sx-caret" size={14} />
      </button>
      <div className="sx-mega-panel" hidden={!open} id="sx-mega-panel">
        <ul className="sx-mega-list">
          <li>
            <a aria-current={!active ? "page" : undefined} className="sx-mega-all" href={allHref}>
              <span>Toutes les catégories</span>
              <small>{categories.reduce((sum, item) => sum + item.count, 0)}</small>
              <CaretRight aria-hidden="true" size={14} />
            </a>
          </li>
          {categories.map((item, index) => (
            <li key={item.slug}>
              <a aria-current={item.slug === active ? "page" : undefined} data-current={index === current || undefined} href={item.href} onFocus={() => setCurrent(index)} onMouseEnter={() => setCurrent(index)}>
                <span>{item.label}</span>
                <small>{item.count}</small>
                <CaretRight aria-hidden="true" size={14} />
              </a>
            </li>
          ))}
        </ul>
        <div className="sx-mega-body">
          <div className="sx-mega-products">
            <p className="sx-mega-title">À la une : {category.label}</p>
            {category.products.length > 0 ? (
              <ul>
                {category.products.slice(0, 3).map((product) => (
                  <li key={product.id}>
                    <a href={product.href}>
                      <span className="sx-mega-thumb">{product.imageUrl ? <img alt="" height={80} loading="lazy" src={product.imageUrl} width={80} /> : null}</span>
                      <span className="sx-mega-text">
                        <span>{product.name}</span>
                        <span className="sx-price">
                          {product.oldPriceXaf ? <s>{formatXaf(product.oldPriceXaf)}</s> : null}
                          <strong>{formatXaf(product.priceXaf)}</strong>
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sx-mega-empty">{category.count} produit{category.count > 1 ? "s" : ""} dans cette catégorie.</p>
            )}
            <a className="sx-link" href={category.href}>
              Toute la catégorie <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
          <a className="sx-ad sx-mega-ad" href={ad.href}>
            <img alt={ad.alt} height={ad.size[1]} loading="lazy" src={ad.src} width={ad.size[0]} />
          </a>
        </div>
      </div>
    </div>
  );
}
