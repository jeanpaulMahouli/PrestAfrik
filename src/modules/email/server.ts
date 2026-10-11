import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpConfig } from "@/modules/email/config";

let transporter: Transporter | undefined;

type TransactionalEmail = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  heading,
  message,
  actionLabel,
  actionUrl,
}: TransactionalEmail) {
  const config = getSmtpConfig();
  const link = new URL(actionUrl);
  if (!["http:", "https:"].includes(link.protocol)) {
    throw new Error("Le lien du courriel doit utiliser HTTP ou HTTPS.");
  }
  if (process.env.NODE_ENV === "production" && link.protocol !== "https:") {
    throw new Error("Les liens des courriels de production doivent utiliser HTTPS.");
  }
  if (process.env.NODE_ENV === "production") {
    const applicationUrl = process.env.BETTER_AUTH_URL;
    if (!applicationUrl || new URL(applicationUrl).origin !== link.origin) {
      throw new Error("Le lien du courriel ne correspond pas au domaine public PrestAfrik.");
    }
  }

  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });

  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeUrl = escapeHtml(link.toString());
  const safeSubject = subject.replace(/[\r\n]+/g, " ").trim();
  const result = await transporter.sendMail({
    from: config.from,
    to,
    subject: safeSubject,
    text: `${heading}\n\n${message}\n\n${actionLabel}: ${link.toString()}\n\nSi tu n’es pas à l’origine de cette demande, ignore ce message.`,
    html: `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f2ee;font-family:Arial,sans-serif;color:#000026"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #dce5de;border-radius:12px"><p style="font-weight:700;color:#000026">Prest<span style="color:#a85400">Afrik</span></p><h1 style="font-size:22px">${safeHeading}</h1><p style="line-height:1.6">${safeMessage}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#ff9900;color:#000026;font-weight:700;text-decoration:none">${safeActionLabel}</a></p><p style="font-size:13px;line-height:1.5;color:#53645b">Si tu n’es pas à l’origine de cette demande, ignore ce message.</p></main></body></html>`,
  });

  if (!result.accepted?.length || (result.rejected?.length ?? 0) > 0) {
    throw new Error("Le serveur SMTP n’a pas accepté le destinataire du courriel.");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
