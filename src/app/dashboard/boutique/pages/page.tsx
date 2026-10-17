import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { PageEditor } from "@/components/pages/page-editor";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { createStorePage, deleteStorePage } from "@/modules/pages/actions";
import { blocksSchema, pageKindKeys, pageKinds, type PageKind } from "@/modules/pages/blocks";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Pages de la boutique" };

export default async function StorePagesPage({ searchParams }: PageProps<"/dashboard/boutique/pages">) {
  const { store } = await requireStorePermission("store.manage");
  const params = await searchParams;
  const pages = await prisma.storePage.findMany({ where: { storeId: store.id } });
  const byKind = new Map(pages.map((page) => [page.kind, page]));
  const requested = typeof params.page === "string" && pageKindKeys.includes(params.page as PageKind) ? (params.page as PageKind) : null;
  const selected = (requested && byKind.get(requested)) ?? pages[0] ?? null;
  const missing = pageKindKeys.filter((kind) => !byKind.has(kind));

  return (
    <VendorShell>
      <StoreSectionNav current="/dashboard/boutique/pages" />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Pages de la boutique</h1>
          <p className="v-page-subtitle">Créez les pages de présentation de votre boutique (À propos, Contact, FAQ) avec des blocs simples à assembler.</p>
        </div>
      </div>
      {params.succes === "supprimee" && <p className="v-banner v-banner-success" role="status">Page supprimée.</p>}

      <div className="pages-layout">
        <section aria-labelledby="my-pages" className="v-card">
          <h2 className="v-card-title" id="my-pages">Mes pages</h2>
          <ul className="page-list">
            <li>
              <span>
                Boutique
                <small>Page principale · non supprimable</small>
              </span>
              <Badge tone={store.isPublished ? "success" : "neutral"}>{store.isPublished ? "Publiée" : "Brouillon"}</Badge>
            </li>
            {pageKindKeys.map((kind) => {
              const page = byKind.get(kind);
              return (
                <li aria-current={selected?.kind === kind ? "page" : undefined} key={kind}>
                  {page ? (
                    <Link href={`/dashboard/boutique/pages?page=${kind}`}>{pageKinds[kind].label}</Link>
                  ) : (
                    <span>
                      {pageKinds[kind].label}
                      <small>Pas encore créée</small>
                    </span>
                  )}
                  <Badge tone={page ? (page.status === "PUBLISHED" ? "success" : "neutral") : "neutral"}>
                    {page ? (page.status === "PUBLISHED" ? "Publiée" : "Brouillon") : "—"}
                  </Badge>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <ActionDialog action={createStorePage} submitLabel="Créer la page" title="Ajouter une page" triggerClassName="btn btn-secondary btn-block" triggerLabel="Ajouter une page">
              <label className="v-field">
                Type de page
                <select name="kind">
                  {missing.map((kind) => (
                    <option key={kind} value={kind}>{pageKinds[kind].label}</option>
                  ))}
                </select>
              </label>
              <p className="v-small v-muted">La page est créée en brouillon avec quelques blocs d’exemple à adapter.</p>
            </ActionDialog>
          )}
          {selected && (
            <ActionDialog
              action={deleteStorePage}
              description="La page et ses images seront supprimées de votre boutique."
              hiddenFields={{ kind: selected.kind }}
              submitClassName="btn btn-danger"
              submitLabel="Supprimer la page"
              title={`Supprimer la page « ${pageKinds[selected.kind].label} » ?`}
              triggerClassName="v-link-button page-delete"
              triggerLabel={`Supprimer la page « ${pageKinds[selected.kind].label} »`}
            />
          )}
        </section>

        {selected ? (
          <PageEditor
            initialBlocks={blocksSchema.safeParse(selected.blocks).data ?? []}
            initialTitle={selected.title}
            key={selected.id}
            kind={selected.kind}
            previewHref={store.isPublished && selected.status === "PUBLISHED" ? `/${store.slug}/page/${selected.slug}` : null}
          />
        ) : (
          <section className="v-card v-empty">
            <h2>Racontez votre histoire</h2>
            <p>Ajoutez une page « À propos », « Contact » ou une FAQ : vos clients vous font davantage confiance quand ils vous connaissent.</p>
          </section>
        )}
      </div>
    </VendorShell>
  );
}
