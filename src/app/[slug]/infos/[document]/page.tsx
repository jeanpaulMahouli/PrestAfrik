import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalPages, type LegalSlug } from "@/components/legal/legal-content";
import { ChevronRight } from "@/components/ui/icons";
import { storeHref } from "@/lib/store-host";
import { storeBasePath } from "@/lib/store-links";
import { getStorefrontStore } from "@/modules/catalog/service";

// Documents légaux affichés dans la boutique (pied de page « Aide à l'achat ») : même contenu que
// prestafrik.com/legal/…, avec le design de la boutique, sans quitter la vitrine.
const storeDocuments = ["conditions-de-vente", "politique-de-confidentialite"] as const satisfies readonly LegalSlug[];
type StoreDocument = (typeof storeDocuments)[number];
const isStoreDocument = (value: string): value is StoreDocument => (storeDocuments as readonly string[]).includes(value);

export async function generateMetadata({ params }: PageProps<"/[slug]/infos/[document]">): Promise<Metadata> {
  const { slug, document } = await params;
  const store = await getStorefrontStore(slug);
  if (!store || !isStoreDocument(document)) return { title: "Page introuvable" };
  return { title: `${legalPages[document].title} · ${store.name}`, robots: { index: false, follow: true } };
}

export default async function StoreLegalPage({ params }: PageProps<"/[slug]/infos/[document]">) {
  const { slug, document } = await params;
  const store = await getStorefrontStore(slug);
  if (!store || !isStoreDocument(document)) notFound();
  const base = await storeBasePath(store.slug);
  const page = legalPages[document];

  return (
    <main className="sf-page sf-editorial sf-legal">
      <nav aria-label="Fil d’Ariane" className="sf-breadcrumb">
        <Link href={storeHref(base)}>Accueil</Link>
        <ChevronRight aria-hidden="true" size={14} />
        <span aria-current="page">{page.title}</span>
      </nav>
      <h1>{page.title}</h1>
      <nav aria-label="Autres informations" className="sf-legal-tabs">
        <Link aria-current={document === "conditions-de-vente" ? "page" : undefined} href={storeHref(base, "infos", "conditions-de-vente")}>
          Conditions de vente
        </Link>
        <Link aria-current={document === "politique-de-confidentialite" ? "page" : undefined} href={storeHref(base, "infos", "politique-de-confidentialite")}>
          Confidentialité
        </Link>
      </nav>
      <div className="sf-legal-body">{page.content}</div>
    </main>
  );
}
