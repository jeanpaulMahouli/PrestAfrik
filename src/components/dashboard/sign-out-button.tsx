"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/modules/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    const result = await authClient.signOut();
    if (result.error) {
      setError("La déconnexion n’a pas abouti. Réessaie.");
      setPending(false);
      return;
    }
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <>
      <button
        aria-label="Se déconnecter"
        className="secondary-button sign-out-button"
        disabled={pending}
        onClick={signOut}
        type="button"
      >
        {pending && <span aria-hidden="true" className="loading-spinner loading-spinner-inline" />}
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {error && (
        <span aria-live="polite" className="form-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
