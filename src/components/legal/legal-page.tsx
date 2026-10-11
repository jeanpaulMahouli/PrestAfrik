import Link from "next/link";

type LegalPageProps = {
  title: string;
  children: React.ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <main className="legal-page">
      <nav aria-label="Documents légaux">
        <Link href="/legal/mentions-legales">Mentions légales</Link>
        <Link href="/legal/conditions-generales">Conditions générales</Link>
        <Link href="/legal/politique-de-confidentialite">Confidentialité</Link>
        <Link href="/legal/conditions-de-vente">Conditions de vente</Link>
      </nav>
      <h1>{title}</h1>
      <p className="legal-updated">Document de travail · Version du 11 octobre 2026</p>
      
      {children}
    </main>
  );
}
