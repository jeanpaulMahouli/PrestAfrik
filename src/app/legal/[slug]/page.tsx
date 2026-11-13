import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/legal-page";
import { disabledPages } from "@/components/landing/content";
import { legalPages, type LegalSlug } from "@/components/legal/legal-content";

// Mentions légales : contenu provisoire tant que l'identité juridique de l'entreprise (forme, siège, RCCM,
// NIU, responsable de publication, hébergeur) n'est pas fournie ; les informations manquantes sont signalées.

export const dynamic = "force-dynamic";

const isAvailable = (slug: string): slug is LegalSlug => Object.hasOwn(legalPages, slug) && !disabledPages.has(`/legal/${slug}`);

export function generateStaticParams() {
  return Object.keys(legalPages)
    .filter(isAvailable)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isAvailable(slug)) return { title: "Informations légales" };
  return { title: legalPages[slug].title, alternates: { canonical: `/legal/${slug}` } };
}

export default async function LegalDocumentPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  if (!isAvailable(slug)) notFound();
  const page = legalPages[slug];

  return <LegalPage title={page.title}>{page.content}</LegalPage>;
}
