"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";
import { checkPassword } from "@/modules/auth/password-policy";

const t = texts.auth;

export function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = checkPassword(password);
    if (issue) {
      setError(
        issue === "tooShort"
          ? t.fields.passwordTooShort
          : issue === "tooLong"
            ? t.fields.passwordTooLong
            : t.fields.passwordTooCommon,
      );
      return;
    }
    setError("");
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message && !/token/i.test(result.error.message) ? result.error.message : t.reset.invalidLink);
        return;
      }
      router.push("/connexion?motDePasseModifie=1");
    } catch {
      setError(texts.common.networkError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-field">
        <label htmlFor={id}>{t.fields.password}</label>
        <PasswordInput
          aria-describedby={`${id}-help`}
          autoComplete="new-password"
          id={id}
          maxLength={128}
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
        <p className="auth-field-help" id={`${id}-help`}>{t.signUp.passwordHelp}</p>
      </div>
      {error && <p className="auth-alert" role="alert">{error}</p>}
      <SubmitButton className="auth-submit" loading={pending} pendingLabel={texts.common.saving}>
        {t.reset.newSubmit} <span aria-hidden="true">→</span>
      </SubmitButton>
    </form>
  );
}
