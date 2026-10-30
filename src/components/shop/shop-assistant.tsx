"use client";

import { Bot, HandCoins, MessageCircle, PackageSearch, Rocket, Search, Truck, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Link = { label: string; href: string };
type Topic = "produit" | "budget" | "commander" | "suivi" | "vendre";

const topics: { id: Topic; icon: typeof Bot; label: string }[] = [
  { id: "produit", icon: PackageSearch, label: "Je cherche un produit" },
  { id: "budget", icon: Wallet, label: "J’ai un petit budget" },
  { id: "commander", icon: HandCoins, label: "Comment commander ?" },
  { id: "suivi", icon: Truck, label: "Suivre ma commande" },
  { id: "vendre", icon: Rocket, label: "Je veux vendre ici" },
];

/**
 * Assistant de la marketplace (bouton flottant, en bas à droite) : réponses guidées, sans intelligence
 * artificielle ni donnée personnelle. Il oriente vers une rubrique, un budget, explique la commande et le
 * suivi, et propose d'écrire à l'équipe sur WhatsApp quand le numéro est configuré.
 */
export function ShopAssistant({ categories, budgets, searchHref, signupHref, whatsapp }: { categories: Link[]; budgets: Link[]; searchHref: string; signupHref: string; whatsapp: string | null }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [topic]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label = topics.find((item) => item.id === topic)?.label;

  return (
    <>
      {open && (
        <section aria-labelledby="shop-assistant-title" className="shop-assistant" role="dialog">
          <header className="shop-assistant-head">
            <span aria-hidden="true" className="shop-assistant-avatar">
              <Bot size={20} />
            </span>
            <div>
              <h2 id="shop-assistant-title">Votre guide PrestAfrik</h2>
              <p>Assistant automatique · répond tout de suite</p>
            </div>
            <button aria-label="Fermer l’assistant" className="shop-assistant-close" onClick={() => setOpen(false)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </header>
          <div aria-live="polite" className="shop-assistant-log">
            <p className="shop-bubble">Bonjour ! Je vous aide à trouver la bonne boutique. Que souhaitez-vous faire ?</p>
            {!topic ? (
              <div className="shop-assistant-choices">
                {topics.map(({ id, icon: Icon, label: text }) => (
                  <button key={id} onClick={() => setTopic(id)} type="button">
                    <Icon aria-hidden="true" size={17} /> {text}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p className="shop-bubble shop-bubble--me">{label}</p>
                {topic === "produit" && (
                  <>
                    <p className="shop-bubble">Dites-moi ce que vous cherchez, ou choisissez un univers :</p>
                    <form
                      className="shop-assistant-search"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (query.trim().length >= 2) window.location.assign(`${searchHref}?q=${encodeURIComponent(query.trim())}`);
                      }}
                    >
                      <label className="visually-hidden" htmlFor="shop-assistant-query">
                        Produit recherché
                      </label>
                      <input id="shop-assistant-query" onChange={(event) => setQuery(event.target.value)} placeholder="Ex. robe wax, savon, chaussures…" value={query} />
                      <button aria-label="Rechercher" type="submit">
                        <Search aria-hidden="true" size={18} />
                      </button>
                    </form>
                    <div className="shop-assistant-links">
                      {categories.slice(0, 8).map((item) => (
                        <a href={item.href} key={item.href}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {topic === "budget" && (
                  <>
                    <p className="shop-bubble">Bonne idée ! Voici les produits par budget :</p>
                    <div className="shop-assistant-links">
                      {budgets.map((item) => (
                        <a href={item.href} key={item.href}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {topic === "commander" && (
                  <p className="shop-bubble">
                    C’est simple : 1. choisissez un produit, 2. commandez sur la boutique du vendeur (sans créer de compte), 3. le vendeur vous confirme sur WhatsApp, 4. vous payez à la livraison.
                  </p>
                )}
                {topic === "suivi" && (
                  <p className="shop-bubble">Après votre commande, la boutique vous donne un lien de suivi. Vous le retrouvez dans la discussion WhatsApp avec le vendeur : il indique où en est votre commande.</p>
                )}
                {topic === "vendre" && (
                  <>
                    <p className="shop-bubble">Bienvenue ! Votre boutique est prête en 5 minutes, gratuitement, et elle apparaît ici, sur la marketplace.</p>
                    <div className="shop-assistant-links">
                      <a className="is-primary" href={signupHref}>
                        Créer ma boutique gratuitement
                      </a>
                    </div>
                  </>
                )}
                <div className="shop-assistant-links">
                  {whatsapp && (
                    <a href={whatsapp} rel="noopener noreferrer" target="_blank">
                      <MessageCircle aria-hidden="true" size={15} /> Écrire à l’équipe
                    </a>
                  )}
                  <button onClick={() => setTopic(null)} type="button">
                    Autre question
                  </button>
                </div>
              </>
            )}
            <div ref={endRef} />
          </div>
        </section>
      )}
      <button
        aria-expanded={open}
        aria-label={open ? "Fermer l’assistant" : "Besoin d’aide ? Ouvrir l’assistant PrestAfrik"}
        className="shop-assistant-launcher"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        {open ? <X aria-hidden="true" size={24} /> : <Bot aria-hidden="true" size={26} />}
        {!open && <span className="shop-assistant-ping" aria-hidden="true" />}
      </button>
    </>
  );
}
