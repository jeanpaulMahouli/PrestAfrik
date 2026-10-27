"use client";

import { Search, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { textColorFor } from "@/lib/contrast";
import { CheckIcon } from "@/components/ui/icons";
import { WizardPauseDialog } from "@/components/wizard/wizard-pause-dialog";

export type PreviewDraft = {
  name: string;
  activity: string;
  location: string;
  theme: "CATALOGUE_EXPRESS" | "MODE_BEAUTE" | "BOUTIQUE_MARQUE" | "GRAND_MARCHE";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
};

const themeNames = { CATALOGUE_EXPRESS: "Catalogue express", MODE_BEAUTE: "Mode et beauté", BOUTIQUE_MARQUE: "Galerie", GRAND_MARCHE: "Grand marché" } as const;

const PreviewContext = createContext<{ draft: PreviewDraft; update: (patch: Partial<PreviewDraft>) => void } | null>(null);

/** Met à jour l'aperçu en direct depuis une étape de l'assistant. */
export function useWizardPreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("useWizardPreview doit être utilisé dans l’assistant.");
  return context;
}

type WizardShellProps = {
  steps: readonly string[];
  current: number;
  /** Étapes déjà validées (cliquables pour revenir). */
  reached: number;
  /** Boutique en cours de création (null avant la première étape, ou une fois la boutique créée). */
  draftId: string | null;
  /** Où aller en quittant l'assistant : le tableau de bord, ou l'accueil si l'utilisateur n'a encore aucune boutique. */
  exitHref?: string;
  initialDraft: PreviewDraft;
  showThemeLabel: boolean;
  children: ReactNode;
};

/** Mise en page de l'assistant de création (maquettes « Assistant · 1 à 8 »). */
export function WizardShell({ steps, current, reached, draftId, exitHref = "/dashboard", initialDraft, showThemeLabel, children }: WizardShellProps) {
  const [draft, setDraft] = useState(initialDraft);
  const update = (patch: Partial<PreviewDraft>) => setDraft((value) => ({ ...value, ...patch }));
  const initials = draft.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "MB";
  const style = {
    "--store-primary": draft.primaryColor,
    "--store-on-primary": textColorFor(draft.primaryColor),
    "--store-secondary": draft.secondaryColor,
    "--store-accent": draft.accentColor,
  } as CSSProperties;

  return (
    <PreviewContext.Provider value={{ draft, update }}>
      <div className="wizard">
        <header className="wizard-header">
          <Link aria-label="PrestAfrik" className="wizard-logo" href="/dashboard">
            <Image alt="PrestAfrik" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
          </Link>
          {/* <div> et non <p> : un paragraphe ne peut pas contenir le formulaire « Abandonner ». */}
          <div className="wizard-header-info">
            Étape {Math.min(current, steps.length)} sur {steps.length}
            {draftId && (
              <>
                {" · "}
                <Link href={exitHref}>Enregistrer et quitter</Link>
                {" · "}
                <WizardPauseDialog draftId={draftId} exitHref={exitHref} storeName={draft.name} />
              </>
            )}
          </div>
        </header>
        <div aria-hidden="true" className="wizard-progress">
          <span style={{ width: `${(Math.min(current, steps.length) / steps.length) * 100}%` }} />
        </div>

        <div className="wizard-body">
          <nav aria-label="Étapes de création" className="wizard-steps">
            <p className="wizard-steps-compact">Étape {Math.min(current, steps.length)} sur {steps.length} · {steps[Math.min(current, steps.length) - 1]}</p>
            <ol>
              {steps.map((label, index) => {
                const step = index + 1;
                const done = step < reached && step !== current;
                const content = (
                  <>
                    <span aria-hidden="true" className="wizard-step-dot">{done ? <CheckIcon size={11} /> : step}</span>
                    {label}
                    {done && <span className="visually-hidden"> (terminée)</span>}
                  </>
                );
                return (
                  <li aria-current={step === current ? "step" : undefined} className={done ? "is-done" : step === current ? "is-current" : ""} key={label}>
                    {draftId && step <= reached && step !== current ? <Link href={`/boutiques/nouvelle?brouillon=${draftId}&etape=${step}`}>{content}</Link> : <span>{content}</span>}
                  </li>
                );
              })}
            </ol>
          </nav>

          <main className="wizard-main">{children}</main>

          <details className="wizard-preview" open>
            <summary>Aperçu de votre boutique, en direct</summary>
            {/* Même organisation que la vitrine de chaque thème : en-tête, recherche, catégories, bannière, produits. */}
            <div className={`wizard-preview-card wizard-preview-${draft.theme.toLowerCase()}`} style={style}>
              <div className="wizard-preview-head">
                <span className="wizard-preview-logo">
                  {/* Logo choisi : image locale (aperçu) ou logo déjà enregistré. */}
                  {draft.logoUrl ? <img alt="" src={draft.logoUrl} /> : initials}
                </span>
                <span className="wizard-preview-name">
                  <strong>{draft.name || "Ma boutique"}</strong>
                  {draft.location && <small>{draft.location}</small>}
                </span>
                {draft.theme === "BOUTIQUE_MARQUE" && <Search aria-hidden="true" className="wizard-preview-icon" size={14} />}
                <ShoppingBag aria-hidden="true" className="wizard-preview-icon" size={14} />
              </div>
              {draft.theme !== "BOUTIQUE_MARQUE" && (
                <span className="wizard-preview-search">
                  <Search aria-hidden="true" size={11} /> Rechercher un produit
                </span>
              )}
              <div className="wizard-preview-hero">{draft.activity || "Bienvenue !"}</div>
              <div aria-hidden="true" className="wizard-preview-tags">
                <span className="is-active">Tout</span>
                <span>Nouveautés</span>
                <span>Promotions</span>
              </div>
              <div className="wizard-preview-products">
                {[1, 2, 3, 4].map((index) => (
                  <span key={index}>
                    <span aria-hidden="true" />
                    <strong>Produit {index}</strong>
                    <small>— FCFA</small>
                  </span>
                ))}
              </div>
              <span className="wizard-preview-button">Commander</span>
            </div>
            {showThemeLabel && <p className="wizard-preview-theme">Thème : {themeNames[draft.theme]}</p>}
          </details>
        </div>
      </div>
    </PreviewContext.Provider>
  );
}
