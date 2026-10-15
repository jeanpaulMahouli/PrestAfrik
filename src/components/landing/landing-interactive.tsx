"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";

/* ---------- En-tête avec menu mobile ---------- */

const navItems = [
  { label: "Accueil", href: "#accueil" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Démo", href: "#demo" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "À propos", href: "#a-propos" },
  { label: "Contact", href: "#contact" },
];

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="lp-header">
      <div className="lp-container lp-header-row">
        <Link aria-label="PrestAfrik, accueil" className="lp-logo" href="/">
          <Image alt="PrestAfrik" height={40} priority src="/brand/logo-prestafrik.png" width={73} />
        </Link>
        <nav aria-label="Navigation principale" className={`lp-nav ${open ? "is-open" : ""}`} id="lp-nav">
          {navItems.map((item) => (
            <a href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
          <span className="lp-nav-actions">
            {signedIn ? (
              <Link className="lp-btn lp-btn-primary" href="/dashboard">Mon espace</Link>
            ) : (
              <>
                <Link className="lp-btn lp-btn-ghost" href="/connexion">Se connecter</Link>
                <Link className="lp-btn lp-btn-primary" href="/inscription">Créer ma boutique</Link>
              </>
            )}
          </span>
        </nav>
        <button aria-controls="lp-nav" aria-expanded={open} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} className="lp-burger" onClick={() => setOpen((value) => !value)} type="button">
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

/* ---------- Notifications du héros ---------- */

const notifications = [
  { city: "Douala", text: "Nouvelle commande · 28 500 FCFA" },
  { city: "Yaoundé", text: "Commande validée · argent reçu" },
  { city: "Bafoussam", text: "Livraison effectuée" },
  { city: "Kribi", text: "Nouveau client enregistré" },
];

export function HeroTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % notifications.length), 3000);
    return () => window.clearInterval(timer);
  }, []);
  const item = notifications[index];
  return (
    <p aria-hidden="true" className="lp-ticker" key={index}>
      <strong>{item.city}</strong>
      {item.text}
    </p>
  );
}

/* ---------- Démo « Audience » (CRM) ---------- */

const segments = [
  { label: "Nouveaux clients", count: 14 },
  { label: "Clients réguliers", count: 22 },
  { label: "Inactifs depuis 90 jours", count: 9 },
  { label: "Acheteurs de robes", count: 31 },
];

/** Grille de 60 clients fictifs : les clients du segment choisi s'allument (positions stables). */
function highlighted(segment: number, count: number) {
  // Ordre pseudo-aléatoire stable : tri des 60 positions par une empreinte simple (aucune boucle ouverte).
  const score = (index: number) => ((index + 1) * 2654435761 + (segment + 1) * 40503) % 4294967296;
  const order = Array.from({ length: 60 }, (_, index) => index).sort((a, b) => score(a) - score(b));
  return new Set(order.slice(0, Math.min(count, 60)));
}

export function AudienceDemo() {
  const [active, setActive] = useState(1);
  const segment = segments[active];
  const on = highlighted(active, segment.count);
  return (
    <div className="lp-audience">
      <div className="lp-audience-head">
        <strong>Audience</strong>
        <small>60 clients (exemple)</small>
      </div>
      <div aria-label="Segments de clients" className="lp-audience-chips" role="group">
        {segments.map((item, index) => (
          <button aria-pressed={index === active} key={item.label} onClick={() => setActive(index)} type="button">{item.label}</button>
        ))}
      </div>
      <div aria-hidden="true" className="lp-audience-dots">
        {Array.from({ length: 60 }, (_, index) => <span className={on.has(index) ? "is-on" : ""} key={index} />)}
      </div>
      <p aria-live="polite" className="lp-audience-count"><strong>{segment.count}</strong> clients ciblés</p>
      <span className="lp-btn lp-btn-primary lp-btn-block" role="presentation">Préparer la campagne WhatsApp</span>
      <small className="lp-muted">Seuls les clients qui ont accepté de recevoir vos offres sont contactés.</small>
    </div>
  );
}

/* ---------- Démo « 4 gestes » ---------- */

const steps = [
  { title: "Votre client choisit son produit", text: "Il ajoute au panier, sans créer de compte.", image: "/landing/client-boutique.webp", alt: "Catalogue d’une boutique sur téléphone" },
  { title: "Il remplit un court formulaire", text: "Nom, WhatsApp, zone de livraison. Les frais s’affichent tout de suite.", image: "/landing/client-commande.webp", alt: "Formulaire de commande avec les frais de livraison" },
  { title: "Vous recevez la commande", text: "Elle arrive dans votre espace. Un bouton ouvre WhatsApp pour écrire au client.", image: "/landing/client-suivi.webp", alt: "Commande enregistrée et suivie" },
  { title: "Vous validez, l’argent est compté", text: "Un geste sur « Valider » et le montant rejoint votre argent reçu.", image: "/landing/vendeur-argent.webp", alt: "Page Argent reçu de l’espace vendeur" },
];

export function StepsDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % steps.length), 4000);
    return () => window.clearInterval(timer);
  }, [paused]);
  const current = steps[step];
  return (
    <div className="lp-steps">
      <ol className="lp-steps-list">
        {steps.map((item, index) => (
          <li key={item.title}>
            <button
              aria-current={index === step ? "step" : undefined}
              onClick={() => {
                setStep(index);
                setPaused(true);
              }}
              type="button"
            >
              <span aria-hidden="true" className="lp-step-number">{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className={`lp-steps-screen ${step === 3 ? "is-wide" : ""}`}>
        <Image alt={current.alt} height={step === 3 ? 800 : 1125} key={current.image} sizes="(max-width: 900px) 80vw, 420px" src={current.image} width={step === 3 ? 1280 : 520} />
      </div>
    </div>
  );
}

/* ---------- Onglets « Votre espace vendeur » ---------- */

const vendorTabs = [
  { label: "Tableau de bord", image: "/landing/vendeur-accueil.webp", title: "Un coup d’œil, chaque matin", text: "Nouvelles commandes à valider, argent reçu, produits épuisés : tout ce qui compte est sur la première page." },
  { label: "Commandes", image: "/landing/vendeur-commandes.webp", title: "Trois boutons, pas plus", text: "Continuer sur WhatsApp, Valider, Voir. Pas d’étapes compliquées : la commande est nouvelle, validée ou annulée." },
  { label: "Livraisons", image: "/landing/vendeur-livraisons.webp", title: "Vos zones, vos prix", text: "Indiquez vos quartiers et vos frais. Vos clients voient le prix exact avant de commander." },
  { label: "Clients", image: "/landing/vendeur-clients.webp", title: "Un fichier clients qui se remplit seul", text: "Chaque commande ajoute le client, son historique et ses préférences." },
  { label: "Argent reçu", image: "/landing/vendeur-argent.webp", title: "Ce que vous avez encaissé", text: "Chaque commande validée est comptée automatiquement, jour après jour." },
];

export function VendorTabs() {
  const [active, setActive] = useState(0);
  const tab = vendorTabs[active];
  return (
    <div className="lp-tabs">
      <div aria-label="Écrans de l’espace vendeur" className="lp-tabs-list" role="tablist">
        {vendorTabs.map((item, index) => (
          <button aria-controls="lp-tab-panel" aria-selected={index === active} id={`lp-tab-${index}`} key={item.label} onClick={() => setActive(index)} role="tab" type="button">
            {item.label}
          </button>
        ))}
      </div>
      <div aria-labelledby={`lp-tab-${active}`} className="lp-tabs-panel" id="lp-tab-panel" role="tabpanel">
        <div className="lp-browser">
          <span aria-hidden="true" className="lp-browser-bar"><i /><i /><i /></span>
          <Image alt={`Capture : ${tab.label}`} height={800} key={tab.image} sizes="(max-width: 1100px) 92vw, 760px" src={tab.image} width={1280} />
        </div>
        <div className="lp-tabs-copy">
          <h3>{tab.title}</h3>
          <p>{tab.text}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Formulaire de contact ---------- */

/** Prépare le message dans WhatsApp (ou l'e-mail) : rien n'est envoyé sans l'utilisateur. */
export function ContactForm({ whatsapp, email }: { whatsapp: string | null; email: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const valid = name.trim().length >= 2 && message.trim().length >= 5;
  const body = `Bonjour PrestAfrik, je suis ${name.trim()}${phone.trim() ? ` (WhatsApp : ${phone.trim()})` : ""}.\n\n${message.trim()}`;
  const href = whatsapp ? buildWaMeUrl(whatsapp, body) : `mailto:${email}?subject=${encodeURIComponent("Question sur PrestAfrik")}&body=${encodeURIComponent(body)}`;

  return (
    <form
      className="lp-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) window.open(href, whatsapp ? "_blank" : "_self", "noopener");
      }}
    >
      <label>
        Votre nom
        <input autoComplete="name" maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      <label>
        Votre numéro WhatsApp (facultatif)
        <input autoComplete="tel" inputMode="tel" maxLength={20} onChange={(event) => setPhone(event.target.value)} value={phone} />
      </label>
      <label>
        Votre message
        <textarea maxLength={1000} onChange={(event) => setMessage(event.target.value)} required rows={4} value={message} />
      </label>
      <button className="lp-btn lp-btn-primary lp-btn-block" disabled={!valid} type="submit">
        Envoyer mon message
      </button>
      <small className="lp-muted">
        {whatsapp ? "Votre message s’ouvre dans WhatsApp : il suffit d’appuyer sur Envoyer." : "Votre message s’ouvre dans votre messagerie e-mail."}
      </small>
    </form>
  );
}
