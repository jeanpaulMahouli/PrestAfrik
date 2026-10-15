import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { emailTexts, type EmailId } from "@/config/texts/emails";
import { emailRequiresBilling, renderEmail, sampleEmailVariables } from "@/modules/email/templates";

export const metadata: Metadata = { title: "Aperçu des e-mails", robots: { index: false, follow: false } };

/** Aperçu des 25 modèles avec des données d'exemple (développement uniquement, jamais en production). */
export default async function EmailPreviewPage({ searchParams }: PageProps<"/dev/emails">) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const ids = Object.keys(emailTexts) as EmailId[];
  const selected = (typeof params.id === "string" && ids.includes(params.id as EmailId) ? params.id : "E01") as EmailId;
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const definition = emailTexts[selected];
  const email = renderEmail(selected, sampleEmailVariables[selected], { baseUrl: base, actionUrl: "action" in definition ? `${base}/exemple-de-lien` : undefined });

  return (
    <main style={{ display: "grid", gridTemplateColumns: "minmax(14rem, 20rem) 1fr", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <nav aria-label="Modèles d’e-mails" style={{ padding: "1rem", borderRight: "1px solid #dce5de", background: "#f7f8f4" }}>
        <h1 style={{ fontSize: "1.1rem" }}>Modèles d’e-mails</h1>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.25rem" }}>
          {ids.map((id) => (
            <li key={id}>
              <a aria-current={id === selected ? "page" : undefined} href={`/dev/emails?id=${id}`} style={{ display: "block", padding: "0.4rem 0.6rem", borderRadius: 8, background: id === selected ? "#fff1d6" : "transparent", color: "#000026", textDecoration: "none", fontSize: 14 }}>
                <strong>{id}</strong> {emailTexts[id].name}
                {emailRequiresBilling(id) && <small style={{ color: "#a86305" }}> · bloqué (gratuité)</small>}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <section style={{ padding: "1rem", display: "grid", gap: "0.75rem", alignContent: "start" }}>
        <p style={{ margin: 0 }}><strong>Objet :</strong> {email.subject}</p>
        <p style={{ margin: 0, color: "#53645b" }}><strong>Pré-en-tête :</strong> {email.preheader}</p>
        <iframe sandbox="" srcDoc={email.html} style={{ width: "100%", height: "70vh", border: "1px solid #dce5de", borderRadius: 12, background: "white" }} title={`Aperçu HTML ${selected}`} />
        <details>
          <summary>Version texte</summary>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f8f4", padding: "1rem", borderRadius: 8 }}>{email.text}</pre>
        </details>
      </section>
    </main>
  );
}
