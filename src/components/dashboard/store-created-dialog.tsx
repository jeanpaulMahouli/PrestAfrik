"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShareStorePanel } from "@/components/shared/share-store-button";
import { Dialog } from "@/components/ui/dialog";
import type { SetupStep } from "@/modules/dashboard/setup-checklist";

const seenKey = (storeId: string) => `prestafrik:boutique-creee:${storeId}`;

/**
 * Fenêtre « Votre boutique est créée » : ouverte une seule fois, à l'arrivée sur l'accueil juste après
 * l'assistant (?bienvenue=…). Le paramètre est retiré tout de suite : ni l'actualisation ni la prochaine
 * connexion ne la rouvrent.
 */
export function StoreCreatedDialog({ storeId, storeName, storeUrl, published, steps }: { storeId: string; storeName: string; storeUrl: string; published: boolean; steps: SetupStep[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(storeId)) === "1";
      localStorage.setItem(seenKey(storeId), "1");
    } catch {
      seen = false;
    }
    if (!seen) setOpen(true);
    // Adresse nettoyée sans recharger la page (un rechargement retirerait la fenêtre aussitôt ouverte).
    const url = new URL(window.location.href);
    url.searchParams.delete("bienvenue");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [storeId]);

  const remaining = steps.filter((step) => !step.done);

  return (
    <Dialog
      description={
        published
          ? "Elle est en ligne : partagez son lien dès maintenant pour recevoir vos premières commandes."
          : "Elle n’est pas encore visible par vos clients : terminez les étapes ci-dessous pour la mettre en ligne."
      }
      onClose={() => setOpen(false)}
      open={open}
      size="lg"
      title={`« ${storeName} » est créée !`}
    >
      <div className="store-created">
        <ShareStorePanel compact storeName={storeName} storeUrl={storeUrl} />
        {remaining.length > 0 && (
          <section aria-labelledby="store-created-next" className="store-created-next">
            <h3 id="store-created-next">Il vous reste {remaining.length} étape{remaining.length > 1 ? "s" : ""}</h3>
            <ul className="onboarding-list">
              {steps.map((step) => (
                <li className={step.done ? "is-done" : ""} key={step.key}>
                  <span aria-hidden="true" className="onboarding-dot" />
                  {step.done ? (
                    <span>
                      <span className="visually-hidden">Terminé : </span>
                      {step.label}
                    </span>
                  ) : (
                    <span>
                      <Link href={step.href} onClick={() => setOpen(false)}>{step.label}</Link>
                      <small className="v-muted">{step.hint}</small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="store-created-actions">
          <button className="btn btn-primary" onClick={() => setOpen(false)} type="button">
            Aller à mon tableau de bord
          </button>
        </div>
      </div>
    </Dialog>
  );
}
