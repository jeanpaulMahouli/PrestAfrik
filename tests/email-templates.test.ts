import { describe, expect, it } from "vitest";
import { emailTexts, type EmailId } from "../src/config/texts/emails";
import { EmailVariableError, emailRequiresBilling, fillVariables, renderEmail, sampleEmailVariables } from "../src/modules/email/templates";

const ids = Object.keys(emailTexts) as EmailId[];
const base = "https://prestafrik.example";

describe("modèles d’e-mails", () => {
  it("contient les 25 modèles du document, plus E26 (droits d’administration) et E27 (réponse du support)", () => {
    expect(ids).toHaveLength(27);
  });

  it.each(ids)("%s : toutes les variables sont remplacées, version texte comprise", (id) => {
    const hasAction = "action" in emailTexts[id];
    const email = renderEmail(id, sampleEmailVariables[id], { baseUrl: base, actionUrl: hasAction ? `${base}/lien` : undefined });
    for (const part of [email.subject, email.preheader, email.html, email.text]) expect(part).not.toMatch(/\{\{\w+\}\}/);
    expect(email.text).toContain("L’équipe PrestAfrik");
    expect(email.html).toContain('lang="fr"');
    if (hasAction) expect(email.text).toContain(`${base}/lien`);
    expect(email.subject.length).toBeLessThanOrEqual(90);
  });

  it("refuse un e-mail avec une variable manquante", () => {
    expect(() => fillVariables("Bonjour {{prenom}}", {})).toThrow(EmailVariableError);
    expect(() => renderEmail("E04", {}, { baseUrl: base, actionUrl: `${base}/lien` })).toThrow(EmailVariableError);
  });

  it("refuse un bouton sans lien ou avec un lien non HTTP", () => {
    expect(() => renderEmail("E02", { prenom: "Awa" }, { baseUrl: base })).toThrow(EmailVariableError);
    expect(() => renderEmail("E02", { prenom: "Awa" }, { baseUrl: base, actionUrl: "javascript:alert(1)" })).toThrow(EmailVariableError);
  });

  it("échappe le contenu saisi par les utilisateurs", () => {
    const email = renderEmail("E24", { prenom: "<b>Estelle</b>", message: "<script>alert(1)</script>" }, { baseUrl: base });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("vouvoie et n’évoque plus la confirmation de commande par le client (ADR-013)", () => {
    const all = JSON.stringify(emailTexts);
    expect(all).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes)(?!\p{L})/iu);
    expect(JSON.stringify(emailTexts.E21)).not.toMatch(/confirm/i);
    expect(JSON.stringify(emailTexts.E13)).not.toMatch(/confirment/i);
  });

  it("marque les e-mails d’abonnement, bloqués pendant la gratuité (ADR-014)", () => {
    expect(ids.filter(emailRequiresBilling)).toEqual(["E14", "E15", "E16", "E17", "E18", "E19", "E23"]);
  });
});
