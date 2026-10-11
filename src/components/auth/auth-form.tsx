"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { authClient } from "@/modules/auth/client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  invitationToken?: string;
};

export function AuthForm({ mode, invitationToken }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [requestTimedOut, setRequestTimedOut] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    setRequestTimedOut(false);
    const timeout = window.setTimeout(() => setRequestTimedOut(true), 12_000);

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password"));
    const callbackURL =
      invitationToken && /^[A-Za-z0-9_-]{43}$/.test(invitationToken)
        ? `/invitations/accepter?token=${encodeURIComponent(invitationToken)}`
        : "/dashboard";

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: String(values.get("name")).trim(),
            email,
            password,
            callbackURL,
          })
        : await authClient.signIn.email({ email, password, callbackURL });

      if (result.error) {
        setError(
          result.error.status === 401
            ? "Adresse e-mail ou mot de passe incorrect."
            : result.error.message ??
              (isSignUp ? "Impossible de créer ton compte." : "La connexion n’a pas abouti. Réessaie."),
        );
        return;
      }

      if (isSignUp) {
        setVerificationEmail(email);
        return;
      }

      router.push(callbackURL);
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Vérifie ta connexion et réessaie.");
    } finally {
      window.clearTimeout(timeout);
      setRequestTimedOut(false);
      setPending(false);
    }
  }

  if (verificationEmail) {
    return (
      <div>
        <p aria-live="polite" className="notice" role="status">
          Un e-mail de confirmation a été envoyé à <strong>{verificationEmail}</strong>. Ouvre le
          lien reçu pour activer ton compte. Pense à vérifier tes courriers indésirables.
        </p>
        <p className="auth-footer">
          <Link className="text-link" href="/connexion">Retour à la connexion</Link>
        </p>
      </div>
    );
  }

  return (
    <form aria-busy={pending} className="auth-form" method="post" onSubmit={submit}>
      {isSignUp && (
        <label className="form-field">
          Ton nom
          <input
            autoComplete="name"
            maxLength={100}
            name="name"
            placeholder="Awa Ngono"
            required
          />
        </label>
      )}
      <label className="form-field">
        Adresse e-mail
        <input
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          maxLength={254}
          name="email"
          placeholder="toi@exemple.com"
          required
          type="email"
        />
      </label>
      <label className="form-field">
        Mot de passe{isSignUp ? " (10 caractères minimum)" : ""}
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          maxLength={128}
          minLength={isSignUp ? 10 : undefined}
          name="password"
          required
          type="password"
        />
      </label>
      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}
      {requestTimedOut && pending && (
        <p aria-live="polite" className="form-error" role="status">
          La connexion prend plus de temps que prévu. Vérifie le réseau de ton téléphone ou réessaie.
        </p>
      )}
      {!isSignUp && (
        <p>
          <Link className="text-link" href="/mot-de-passe-oublie">
            Mot de passe oublié&nbsp;?
          </Link>
        </p>
      )}
      <SubmitButton
        className="primary-button full-width auth-submit"
        loading={pending}
        pendingLabel="Un instant…"
      >
        {isSignUp ? "Créer mon compte" : "Me connecter"}
      </SubmitButton>
      <p className="auth-footer">
        {isSignUp ? "Déjà un compte ?" : "Pas encore de boutique ?"}{" "}
        <Link
          className="text-link"
          href={`${isSignUp ? "/connexion" : "/inscription"}${
            invitationToken && /^[A-Za-z0-9_-]{43}$/.test(invitationToken)
              ? `?invitation=${encodeURIComponent(invitationToken)}`
              : ""
          }`}
        >
          {isSignUp ? "Me connecter" : "Créer mon compte"}
        </Link>
      </p>
    </form>
  );
}
