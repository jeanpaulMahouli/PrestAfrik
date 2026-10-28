"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { StoreLivePreview, type LivePreviewValues } from "@/components/stores/store-live-preview";
import { CheckIcon } from "@/components/ui/icons";
import { WizardPauseDialog } from "@/components/wizard/wizard-pause-dialog";
import { optionalWizardSteps } from "@/components/wizard/wizard-step-form";

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
                    <span className="wizard-step-label">
                      {label}
                      {optionalWizardSteps.has(step) && <small>Facultatif</small>}
                    </span>
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
            <StoreLivePreview reloadKey={current} storePath={`/apercu-boutique/${draftId ?? "nouvelle"}`} values={liveValues} />
            {showThemeLabel && <p className="wizard-preview-theme">Thème : {themeNames[draft.theme]}</p>}
          </details>
        </div>
      </div>
    </PreviewContext.Provider>
  );
}
