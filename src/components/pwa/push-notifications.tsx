"use client";

import { Bell, BellOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/modules/push/subscription-actions";

// Notifications push du vendeur : bannière discrète dans l'espace vendeur (« Activer les notifications »)
// et réglage dans « Mon profil ». La clé publique VAPID vient du serveur ; sans clé, rien n'est proposé.

type State = "unsupported" | "loading" | "denied" | "off" | "on";

const dismissKey = "prestafrik:push-banner-dismissed";

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration() {
  // Le service worker est enregistré au chargement en production ; on s'assure qu'il l'est aussi ici.
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

function usePush(publicKey: string | null) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!publicKey || !supported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    let cancelled = false;
    void navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (subscription) => {
        if (cancelled) return;
        if (subscription && Notification.permission === "granted") {
          // Abonnement renvoyé à chaque visite : le compte connecté sur cet appareil le garde à jour.
          await savePushSubscription(subscription.toJSON()).catch(() => undefined);
          setState("on");
        } else setState("off");
      })
      .catch(() => !cancelled && setState("off"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const subscription = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
      const result = await savePushSubscription(subscription.toJSON());
      setState(result.ok ? "on" : "off");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}

/** Bannière de l'espace vendeur : proposée tant que les notifications ne sont ni activées ni refusées. */
export function PushOptInBanner({ publicKey }: { publicKey: string | null }) {
  const { state, busy, enable } = usePush(publicKey);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (state !== "off" || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // Stockage indisponible : la bannière reviendra à la prochaine visite.
    }
  };

  return (
    <div className="push-banner" role="region" aria-label="Notifications">
      <Bell aria-hidden="true" className="push-banner-icon" size={20} />
      <p>
        <strong>Ne ratez plus aucune commande.</strong> Activez les notifications : nouvelles commandes, messages de l’équipe et nouveautés PrestAfrik.
      </p>
      <button className="btn btn-primary push-banner-action" disabled={busy} onClick={() => void enable()} type="button">
        {busy ? "Activation…" : "Activer"}
      </button>
      <button aria-label="Plus tard" className="push-banner-close" onClick={dismiss} title="Plus tard" type="button">
        <X aria-hidden="true" size={18} />
      </button>
    </div>
  );
}

/** Réglage de « Mon profil » : activer ou couper les notifications sur cet appareil. */
export function PushSettings({ publicKey }: { publicKey: string | null }) {
  const { state, busy, enable, disable } = usePush(publicKey);
  if (state === "loading") return null;

  return (
    <div className="push-settings">
      <span>Notifications sur cet appareil</span>
      {state === "unsupported" && (
        <p className="dashboard-copy">
          {publicKey ? "Ce navigateur ne reçoit pas les notifications. Sur iPhone, installez d’abord l’application PrestAfrik sur l’écran d’accueil." : "Les notifications ne sont pas encore disponibles."}
        </p>
      )}
      {state === "denied" && <p className="dashboard-copy">Les notifications sont bloquées pour PrestAfrik dans les réglages du navigateur. Autorisez-les puis rechargez la page.</p>}
      {state === "on" && (
        <>
          <strong>Activées · nouvelles commandes, messages, nouveautés et rappels</strong>
          <button className="secondary-button" disabled={busy} onClick={() => void disable()} type="button">
            <BellOff aria-hidden="true" size={16} /> Couper les notifications
          </button>
        </>
      )}
      {state === "off" && (
        <>
          <p className="dashboard-copy">Soyez prévenu d’une nouvelle commande, d’un message de l’équipe ou d’une nouveauté, même application fermée.</p>
          <button className="btn btn-primary" disabled={busy} onClick={() => void enable()} type="button">
            <Bell aria-hidden="true" size={16} /> {busy ? "Activation…" : "Activer les notifications"}
          </button>
        </>
      )}
    </div>
  );
}
