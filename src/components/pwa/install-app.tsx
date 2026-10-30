"use client";

import { Check, Compass, Download, EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";

// Installation de l'application PrestAfrik (PWA) sur l'écran d'accueil.
// - Android et Chrome : la fenêtre d'installation native du navigateur (événement beforeinstallprompt).
// - iPhone / iPad et navigateurs sans cette fenêtre : une explication courte, étape par étape.
// L'événement n'est émis qu'une fois, au chargement : il est capté ici dès que le module est chargé.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

type Platform = "ios" | "ios-other-browser" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? "ios-other-browser" : "ios";
  return /Android/i.test(ua) ? "android" : "desktop";
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

type InstallState = { ready: boolean; installed: boolean; canPrompt: boolean; platform: Platform };
const serverState: InstallState = { ready: false, installed: false, canPrompt: false, platform: "desktop" };
let snapshot: InstallState = serverState;

function readState(): InstallState {
  const next: InstallState = { ready: true, installed: installed || isStandalone(), canPrompt: Boolean(deferredPrompt), platform: detectPlatform() };
  if (next.installed !== snapshot.installed || next.canPrompt !== snapshot.canPrompt || next.platform !== snapshot.platform || !snapshot.ready) snapshot = next;
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** État de l'installation : déjà installée, fenêtre native disponible, type d'appareil. */
export function usePwaInstall() {
  const state = useSyncExternalStore(subscribe, readState, () => serverState);
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    const event = deferredPrompt;
    deferredPrompt = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    notify();
    return outcome;
  }, []);
  return { ...state, promptInstall };
}

/** Enregistre le service worker minimal (public/sw.js) : il rend l'application installable, sans rien mettre en cache. */
export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}

type Step = { icon: ReactNode; title: string; text: ReactNode };

const ShareIcon = () => <Share aria-hidden="true" size={18} />;

/** Étapes à suivre, une par une, selon l'appareil (quand le navigateur n'ouvre pas sa propre fenêtre). */
function stepsFor(platform: Platform): Step[] {
  if (platform === "ios") {
    return [
      { icon: <ShareIcon />, title: "Touchez « Partager »", text: <>Le carré avec une flèche vers le haut, <strong>en bas de Safari</strong>.</> },
      { icon: <SquarePlus aria-hidden="true" size={18} />, title: "Touchez « Sur l’écran d’accueil »", text: <>Faites glisser la liste vers le haut si vous ne le voyez pas.</> },
      { icon: <Check aria-hidden="true" size={18} />, title: "Touchez « Ajouter »", text: <>En haut à droite. L’icône PrestAfrik apparaît sur votre écran d’accueil.</> },
    ];
  }
  if (platform === "ios-other-browser") {
    return [
      { icon: <Compass aria-hidden="true" size={18} />, title: "Ouvrez cette page dans Safari", text: <>Sur iPhone, l’installation se fait depuis <strong>Safari</strong> (l’icône boussole bleue).</> },
      { icon: <ShareIcon />, title: "Touchez « Partager »", text: <>Le carré avec une flèche, en bas de l’écran.</> },
      { icon: <SquarePlus aria-hidden="true" size={18} />, title: "« Sur l’écran d’accueil », puis « Ajouter »", text: <>L’icône PrestAfrik apparaît sur votre écran d’accueil.</> },
    ];
  }
  if (platform === "android") {
    return [
      { icon: <EllipsisVertical aria-hidden="true" size={18} />, title: "Touchez le menu ⋮", text: <>Les trois points, <strong>en haut à droite</strong> de votre navigateur.</> },
      { icon: <Download aria-hidden="true" size={18} />, title: "Touchez « Installer l’application »", text: <>Selon le téléphone : « Ajouter à l’écran d’accueil ».</> },
      { icon: <Check aria-hidden="true" size={18} />, title: "Confirmez avec « Installer »", text: <>L’icône PrestAfrik apparaît sur votre écran d’accueil.</> },
    ];
  }
  return [
    { icon: <Download aria-hidden="true" size={18} />, title: "Cliquez sur l’icône d’installation", text: <>À droite de la barre d’adresse de Chrome ou d’Edge.</> },
    { icon: <Check aria-hidden="true" size={18} />, title: "Confirmez avec « Installer »", text: <>PrestAfrik s’ouvre dans sa propre fenêtre, comme une application.</> },
  ];
}

/** Petite animation (façon GIF) qui montre le geste : bouton touché, menu, icône ajoutée à l'écran d'accueil. */
function InstallAnimation({ platform }: { platform: Platform }) {
  const ios = platform === "ios" || platform === "ios-other-browser";
  return (
    <div aria-hidden="true" className={`pwa-anim ${ios ? "pwa-anim-ios" : "pwa-anim-android"}`}>
      <div className="pwa-anim-phone">
        <span className="pwa-anim-bar">{ios ? null : <EllipsisVertical size={12} />}</span>
        <span className="pwa-anim-page" />
        <span className="pwa-anim-page pwa-anim-page-short" />
        <span className="pwa-anim-sheet">
          <span className="pwa-anim-option">{ios ? "Sur l’écran d’accueil" : "Installer l’application"}</span>
        </span>
        {ios && (
          <span className="pwa-anim-toolbar">
            <Share size={12} />
          </span>
        )}
        <span className="pwa-anim-tap" />
        <span className="pwa-anim-home">
          {/* Icône de l'application, telle qu'elle apparaîtra. */}
          <img alt="" height={34} src="/brand/pwa/icon-192.png" width={34} />
          <small>PrestAfrik</small>
        </span>
      </div>
    </div>
  );
}

/** Explication complète : animation, puis les étapes numérotées pour cet appareil. */
function InstallSteps({ platform }: { platform: Platform }) {
  return (
    <div className="pwa-guide">
      <InstallAnimation platform={platform} />
      <ol className="pwa-steps">
        {stepsFor(platform).map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true" className="pwa-step-number">
              {index + 1}
            </span>
            <span className="pwa-step-text">
              <strong>
                <span aria-hidden="true" className="pwa-step-icon">{step.icon}</span>
                {step.title}
              </strong>
              <span>{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const benefits = [
  "Ouverture en un geste, comme une application, sans chercher le lien",
  "Plein écran, sans la barre du navigateur",
  "Rien à télécharger depuis un magasin d’applications : très léger, toujours à jour",
];

/**
 * Bouton « Installer PrestAfrik sur mon écran d'accueil ». Fenêtre native quand le navigateur la propose,
 * sinon explication pas à pas. Rien ne s'affiche si l'application est déjà installée.
 */
export function InstallAppButton({ className = "btn btn-glass", compact = false }: { className?: string; compact?: boolean }) {
  const { ready, installed: isInstalled, canPrompt, platform, promptInstall } = usePwaInstall();
  const [help, setHelp] = useState(false);
  if (!ready || isInstalled) return null;

  return (
    <>
      <button
        className={className}
        onClick={async () => {
          if (canPrompt && (await promptInstall()) !== "unavailable") return;
          setHelp(true);
        }}
        type="button"
      >
        <Download aria-hidden="true" size={18} />
        {compact ? "Installer l’application" : "Installer PrestAfrik sur mon écran d’accueil"}
      </button>
      <Dialog centered description="Trois gestes, moins de 30 secondes. Suivez les étapes ci-dessous." onClose={() => setHelp(false)} open={help} size="sm" title="Installer PrestAfrik sur votre écran d’accueil">
        <InstallSteps platform={platform} />
      </Dialog>
    </>
  );
}

/**
 * Proposition d'installation affichée une seule fois sur cet appareil (juste après la création de la boutique).
 * Facultative : « Plus tard » la ferme pour de bon ; le bouton reste dans le menu du compte.
 */
export function InstallAppSuggestion({ storageKey = "prestafrik:pwa-proposee" }: { storageKey?: string }) {
  const { ready, installed: isInstalled, canPrompt, platform, promptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (!ready || isInstalled) return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    // Mémorisé au moment où la fenêtre s'ouvre (pas avant : un effet relancé ne doit pas l'empêcher).
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // Stockage indisponible : la proposition pourra revenir.
      }
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [ready, isInstalled, storageKey]);

  const close = useCallback(() => setOpen(false), []);
  if (isInstalled) return null;

  return (
    <Dialog
      centered
      description="Recommandé, mais facultatif : vous pouvez aussi continuer depuis votre navigateur."
      footer={
        <div className="pwa-actions">
          <button className="btn btn-secondary" onClick={close} type="button">
            Plus tard
          </button>
          <button
            className="btn btn-glass"
            data-autofocus=""
            onClick={async () => {
              if (canPrompt) {
                const outcome = await promptInstall();
                if (outcome !== "unavailable") {
                  close();
                  return;
                }
              }
              setShowSteps(true);
            }}
            type="button"
          >
            <Download aria-hidden="true" size={18} /> Installer PrestAfrik sur mon écran d’accueil
          </button>
        </div>
      }
      onClose={close}
      open={open}
      size="sm"
      title="Gardez votre boutique à portée de main"
    >
      <div className="pwa-suggestion">
        <span aria-hidden="true" className="pwa-suggestion-icon">
          <Smartphone size={26} />
        </span>
        <ul className="pwa-benefits">
          {benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <p className="pwa-note">Vos clients, eux, continuent d’utiliser le lien de votre boutique : rien ne change pour eux.</p>
        {showSteps && <InstallSteps platform={platform} />}
      </div>
    </Dialog>
  );
}

/** Encart du tableau de bord : installer l'application, masqué une fois installée ou refusé sur cet appareil. */
export function InstallAppCard() {
  const { ready, installed: isInstalled } = usePwaInstall();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(Boolean(localStorage.getItem("prestafrik:pwa-encart-ferme")));
    } catch {
      setHidden(false);
    }
  }, []);
  if (!ready || isInstalled || hidden) return null;

  return (
    <section aria-label="Application PrestAfrik" className="pwa-card">
      <span aria-hidden="true" className="pwa-suggestion-icon">
        <Smartphone size={22} />
      </span>
      <p>
        <strong>PrestAfrik sur votre écran d’accueil</strong>
        <span>Ouvrez vos commandes en un geste, comme une application.</span>
      </p>
      <InstallAppButton className="btn btn-glass btn-sm" compact />
      <button
        aria-label="Masquer cet encart"
        className="pwa-card-close"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem("prestafrik:pwa-encart-ferme", "1");
          } catch {
            // Stockage indisponible : l'encart reviendra à la prochaine visite.
          }
        }}
        type="button"
      >
        ×
      </button>
    </section>
  );
}
