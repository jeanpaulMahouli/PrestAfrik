"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PwaRegistration } from "@/components/pwa/install-app";
import { StoreLivePreview, type LivePreviewValues } from "@/components/stores/store-live-preview";
import { CheckIcon } from "@/components/ui/icons";
import { WizardPauseDialog } from "@/components/wizard/wizard-pause-dialog";

export type PreviewDraft = {
  name: string;
  activity: string;
  description?: string;
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
  /** Numéro interne de chaque étape affichée (par défaut 1, 2, 3…). */
  stepIds?: readonly number[];
  current: number;
  /** Étapes déjà validées (cliquables pour revenir). */
  reached: number;
  /** Boutique en cours de création (null avant la première étape, ou une fois la boutique créée). */
  draftId: string | null;
  /** Où aller en quittant l'assistant (le tableau de bord, qui propose aussi de créer la boutique plus tard). */
  exitHref?: string;
  /** Page affichée dans l'aperçu (par défaut, le brouillon) : la vraie boutique une fois créée. */
  previewPath?: string;
  initialDraft: PreviewDraft;
  showThemeLabel: boolean;
  children: ReactNode;
};

/** Mise en page de l'assistant de création (maquettes « Assistant · 1 à 8 »). */
export function WizardShell({ steps, stepIds, current, reached, draftId, exitHref = "/dashboard", previewPath, initialDraft, showThemeLabel, children }: WizardShellProps) {
  // Numéro interne de chaque étape affichée (certaines étapes ont été retirées sans renuméroter les brouillons).
  const ids = stepIds ?? steps.map((_, index) => index + 1);
  const position = (step: number) => {
    const index = ids.findIndex((id) => id >= step);
    return index === -1 ? steps.length + 1 : index + 1;
  };
  const shown = Math.min(position(current), steps.length);
  const [draft, setDraft] = useState(initialDraft);
  const update = (patch: Partial<PreviewDraft>) => setDraft((value) => ({ ...value, ...patch }));
  const liveValues = useMemo<LivePreviewValues>(
    () => ({
      name: draft.name,
      theme: draft.theme,
      promoStyle: "CLASSIQUE",
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      accentColor: draft.accentColor,
      logoUrl: draft.logoUrl,
      description: draft.description,
      city: draft.location ? draft.location.split(",")[0]?.trim() : undefined,
    }),
    [draft],
  );

  return (
    <PreviewContext.Provider value={{ draft, update }}>
      <div className="wizard">
        <PwaRegistration />
        <header className="wizard-header">
          <Link aria-label="PrestAfrik" className="wizard-logo" href="/dashboard">
            <Image alt="PrestAfrik" height={34} priority src="/brand/logo-prestafrik.png" width={62} />
          </Link>
          {/* <div> et non <p> : un paragraphe ne peut pas contenir le formulaire « Abandonner ». */}
          <div className="wizard-header-info">
            Étape {shown} sur {steps.length}
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
          <span style={{ width: `${(shown / steps.length) * 100}%` }} />
        </div>

        <div className="wizard-body">
          <nav aria-label="Étapes de création" className="wizard-steps">
            <p className="wizard-steps-compact">Étape {shown} sur {steps.length} · {steps[shown - 1]}</p>
            <ol>
              {steps.map((label, index) => {
                const step = ids[index];
                const done = step < reached && step !== current;
                const content = (
                  <>
                    <span aria-hidden="true" className="wizard-step-dot">{done ? <CheckIcon size={11} /> : index + 1}</span>
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
            {/* Même aperçu que « Ma boutique » : la vraie vitrine (composants et styles publics) dans un cadre de téléphone. */}
            <StoreLivePreview reloadKey={current} storePath={previewPath ?? `/apercu-boutique/${draftId ?? "nouvelle"}`} values={liveValues} />
            {showThemeLabel && <p className="wizard-preview-theme">Thème : {themeNames[draft.theme]}</p>}
          </details>
        </div>
      </div>
    </PreviewContext.Provider>
  );
}
