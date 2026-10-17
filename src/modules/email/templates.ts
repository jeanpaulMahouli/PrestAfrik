import { emailLayoutTexts, emailTexts, type EmailBlock, type EmailId } from "@/config/texts/emails";

// Mise en page commune des e-mails (document des modèles, §2 et §3) : tableaux HTML et styles en
// ligne (compatibles Outlook), largeur 600 px, filet orange, bouton « à toute épreuve », version
// texte brut générée à partir du même contenu. Aucune variable manquante n'est tolérée.

export class EmailVariableError extends Error {}

export type EmailVariables = Record<string, string>;

export type RenderedEmail = { subject: string; preheader: string; html: string; text: string };

const colors = {
  page: "#F1F2EE",
  surface: "#FFFFFF",
  ink: "#000026",
  muted: "#53645B",
  orange: "#FF9900",
  cream: "#FFF9EE",
  border: "#DCE5DE",
  link: "#A85400",
} as const;

const font = "'Poppins', Arial, Helvetica, sans-serif";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

/** Remplace {{variable}} ; une variable absente ou vide fait échouer le rendu. */
export function fillVariables(template: string, variables: EmailVariables) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value.trim() === "") throw new EmailVariableError(`Variable d’e-mail manquante : ${key}`);
    return value;
  });
}

export function emailRequiresBilling(id: EmailId) {
  return "requiresBilling" in emailTexts[id] && emailTexts[id].requiresBilling === true;
}

type RenderOptions = {
  /** Origine publique de l'application (logo, liens du pied de page). */
  baseUrl: string;
  /** Lien du bouton (obligatoire pour les e-mails qui ont une action). */
  actionUrl?: string;
  contactEmail?: string;
};

export function renderEmail(id: EmailId, variables: EmailVariables, { baseUrl, actionUrl, contactEmail = "contact@prestafrik.com" }: RenderOptions): RenderedEmail {
  const definition = emailTexts[id];
  const action = "action" in definition ? definition.action : undefined;
  const note = "note" in definition ? definition.note : undefined;
  if (action && !actionUrl) throw new EmailVariableError(`Lien du bouton manquant pour ${id}.`);
  if (actionUrl && !/^https?:\/\//.test(actionUrl)) throw new EmailVariableError("Le lien du bouton doit utiliser HTTP ou HTTPS.");

  const fill = (text: string) => fillVariables(text, variables);
  const subject = fill(definition.subject).replace(/[\r\n]+/g, " ").trim();
  const preheader = fill(definition.preheader);
  const title = fill(definition.title);
  const blocks = (definition.blocks as EmailBlock[]).map((block): EmailBlock =>
    block.type === "list" ? { type: "list", items: block.items.map(fill) } : { ...block, text: fill(block.text) },
  );
  const noteText = note ? fill(note) : null;
  const help = fillVariables(emailLayoutTexts.help, { contact: contactEmail });
  const origin = baseUrl.replace(/\/$/, "");

  /* ----- Texte brut ----- */
  const textParts = [title, ""];
  for (const block of blocks) {
    if (block.type === "list") textParts.push(...block.items.map((item) => `- ${item}`), "");
    else if (block.type === "quote") textParts.push(...block.text.split("\n").map((line) => `> ${line}`), "");
    else textParts.push(block.text, "");
  }
  if (action && actionUrl) textParts.push(`${action.label} : ${actionUrl}`, "");
  if (noteText) textParts.push(noteText, "");
  textParts.push(...emailLayoutTexts.signature, "", "—", help, emailLayoutTexts.tagline);
  const text = textParts.join("\n");

  /* ----- HTML ----- */
  const paragraph = (content: string) => `<p style="margin:0 0 16px;font-family:${font};font-size:15px;line-height:1.7;color:${colors.ink};">${content}</p>`;
  const body = blocks
    .map((block) => {
      switch (block.type) {
        case "p":
          return paragraph(escapeHtml(block.text));
        case "list":
          return `<ul style="margin:0 0 16px;padding-left:22px;font-family:${font};font-size:15px;line-height:1.7;color:${colors.ink};">${block.items.map((item) => `<li style="margin:0 0 6px;">${escapeHtml(item)}</li>`).join("")}</ul>`;
        case "quote":
          return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid ${colors.orange};background:${colors.cream};font-family:${font};font-size:14px;line-height:1.6;color:${colors.muted};">${escapeHtml(block.text).replace(/\n/g, "<br>")}</blockquote>`;
        case "highlight":
          return `<p style="margin:0 0 16px;padding:12px 16px;border-radius:10px;background:${colors.cream};font-family:${font};font-size:16px;font-weight:700;color:${colors.ink};word-break:break-all;">${escapeHtml(block.text)}</p>`;
      }
    })
    .join("");
  const safeUrl = actionUrl ? escapeHtml(actionUrl) : "";
  const button =
    action && actionUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td align="center" bgcolor="${colors.orange}" style="border-radius:10px;">` +
        `<a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 26px;min-height:16px;border-radius:10px;background:${colors.orange};font-family:${font};font-size:16px;font-weight:700;line-height:1.2;color:${colors.ink};text-decoration:none;">${escapeHtml(action.label)}</a>` +
        `</td></tr></table>` +
        `<p style="margin:0 0 20px;font-family:${font};font-size:12px;line-height:1.6;color:${colors.muted};">${escapeHtml(emailLayoutTexts.buttonFallback)}<br><a href="${safeUrl}" style="color:${colors.link};word-break:break-all;">${safeUrl}</a></p>`
      : "";
  const noteHtml = noteText
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="padding:14px 16px;border-radius:10px;background:${colors.cream};font-family:${font};font-size:13px;line-height:1.6;color:${colors.muted};">${escapeHtml(noteText)}</td></tr></table>`
    : "";

  const html = `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${colors.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.page}" style="background:${colors.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${colors.surface};border:1px solid ${colors.border};border-top:5px solid ${colors.orange};border-radius:12px;">
<tr><td style="padding:28px 32px 8px;">
<img src="${escapeHtml(origin)}/brand/logo-prestafrik.png" width="88" height="48" alt="PrestAfrik" style="display:block;border:0;height:auto;font-family:${font};font-size:18px;font-weight:700;color:${colors.ink};">
</td></tr>
<tr><td style="padding:16px 32px 8px;">
<h1 style="margin:0 0 18px;font-family:${font};font-size:24px;line-height:1.3;font-weight:700;color:${colors.ink};">${escapeHtml(title)}</h1>
${body}
${button}
${noteHtml}
<p style="margin:0 0 8px;font-family:${font};font-size:15px;line-height:1.7;color:${colors.ink};">${emailLayoutTexts.signature.map(escapeHtml).join("<br>")}</p>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${colors.border};font-family:${font};font-size:12px;line-height:1.6;color:${colors.muted};">
${escapeHtml(help)}<br>
${escapeHtml(emailLayoutTexts.tagline)}<br>
<a href="${escapeHtml(origin)}/legal/conditions-generales" style="color:${colors.muted};">${escapeHtml(emailLayoutTexts.terms)}</a> · <a href="${escapeHtml(origin)}/legal/politique-de-confidentialite" style="color:${colors.muted};">${escapeHtml(emailLayoutTexts.privacy)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, preheader, html, text };
}

/** Données d'exemple : aperçu de développement et tests (aucune donnée réelle). */
export const sampleEmailVariables: Record<EmailId, EmailVariables> = {
  E01: { prenom: "Awa" },
  E02: { prenom: "Awa" },
  E03: { prenom: "Awa" },
  E04: { email: "awa@example.test" },
  E05: { date: "15/10/2026", heure: "14:02" },
  E06: { date: "15/10/2026", heure: "14:02", appareil: "Téléphone Android", navigateur: "Chrome", ville: "Douala" },
  E07: {},
  E08: { nouvelleAdresse: "awa.nouvelle@example.test" },
  E09: { inviteur: "Awa Mballa", boutique: "Mboa Style", role: "Préparateur de commandes", descriptionRole: "Vous pourrez voir les commandes et écrire aux clients sur WhatsApp.", email: "jean@example.test" },
  E10: { membre: "Jean Ekané", boutique: "Mboa Style", role: "Préparateur de commandes" },
  E11: { boutique: "Mboa Style" },
  E12: { boutique: "Mboa Style", role: "Gestionnaire", descriptionRole: "Vous pouvez gérer les produits, les commandes, les clients et la boutique." },
  E13: { boutique: "Mboa Style", adresseBoutique: "https://prestafrik.com/mboa-style" },
  E14: { jours: "3", finEssai: "18/10/2026", boutique: "Mboa Style", offres: "Essentiel : 3 000 FCFA par mois · Business : 7 500 FCFA par mois · Pro : 15 000 FCFA par mois" },
  E15: { boutique: "Mboa Style", dateExpiration: "15/10/2026", dateJ7: "22/10/2026", dateJ14: "29/10/2026" },
  E16: { boutique: "Mboa Style", offre: "Business", periode: "mensuel", montant: "7 500 FCFA", date: "15/10/2026", echeance: "15/11/2026", reference: "PAY-1042" },
  E17: { boutique: "Mboa Style", motif: "solde insuffisant" },
  E18: { boutique: "Mboa Style", offre: "Pro", dateEffet: "15/10/2026", quotaProduits: "illimité", quotaMessages: "5 000", quotaMembres: "10" },
  E19: { boutique: "Mboa Style" },
  E20: { boutique: "Mboa Style", motif: "produits interdits signalés" },
  E21: { reference: "#MB-1042", boutique: "Mboa Style", nomClient: "Estelle N.", resume: "Robe wax Akwa × 1, Sac en raphia × 1", total: "28 500 FCFA", livraison: "Douala, Akwa" },
  E22: { nombre: "2", raison: "numéro WhatsApp invalide" },
  E23: { pourcentage: "90", boutique: "Mboa Style", utilises: "900", quota: "1 000" },
  E24: { prenom: "Estelle", message: "Bonjour, comment ajouter ma deuxième boutique ?" },
  E25: {},
};
