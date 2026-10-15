"use client";

import { useState } from "react";
import { texts } from "@/config/texts";
import { authClient } from "@/modules/auth/client";

const t = texts.vendor.shell;

export function EmailVerificationBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");

  async function resend() {
    setState("pending");
    const result = await authClient
      .sendVerificationEmail({ email, callbackURL: "/dashboard" })
      .catch(() => ({ error: true }));
    setState(result.error ? "error" : "sent");
  }

  return (
    <div className="email-banner" role="status">
      <span>{state === "sent" ? t.emailBannerSent : state === "error" ? texts.common.genericError : t.emailBanner}</span>
      {state !== "sent" && (
        <button disabled={state === "pending"} onClick={resend} type="button">
          {state === "pending" ? texts.common.loading : t.emailBannerAction}
        </button>
      )}
    </div>
  );
}
