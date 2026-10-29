import Link from "next/link";
import { texts } from "@/config/texts";

const t = texts.vendor.shell;

/** Adresse e-mail pas encore confirmée : lien vers la saisie du code. */
export function EmailVerificationBanner() {
  return (
    <div className="email-banner" role="status">
      <span>{t.emailBanner}</span>
      <Link href="/confirmer-adresse">{t.emailBannerAction}</Link>
    </div>
  );
}
