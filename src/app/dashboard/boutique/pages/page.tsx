import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { PageEditor } from "@/components/pages/page-editor";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { createStorePage, deleteStorePage, moveStorePage, setStorePageVisibility } from "@/modules/pages/actions";
import { blocksSchema, pageKindKeys, pageKinds, type PageKind } from "@/modules/pages/blocks";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Pages de la boutique" };

const successMessages: Record<string, string> = {
  supprimee: "Page supprimée.",
  affichee: "La page est publiée : elle apparaît dans le menu de votre boutique.",
  masquee: "La page est masquée : elle n’apparaît plus dans le menu de votre boutique.",
};

export default async function StorePagesPage({ searchParams }: PageProps<"/dashboard/boutique/pages">) {
  const { store } = await requireStorePermission("store.manage");
  const params = await searchParams;
  const pages = await prisma.storePage.findMany({ where: { storeId: store.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
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
      {typeof params.succes === "string" && successMessages[params.succes] && <p className="v-banner v-banner-success" role="status">{successMessages[params.succes]}</p>}
      <p className="v-banner v-banner-info">
        {pages.some((page) => page.status === "PUBLISHED")
          ? "Vos pages publiées apparaissent dans le menu de votre boutique, juste après « Boutique », dans l’ordre ci-dessous."
          : "Publiez au moins une page : un menu apparaîtra alors en haut de votre boutique (« Boutique », puis vos pages)."}
      </p>

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
            {pages.map((page, index) => (
              <li aria-current={selected?.kind === page.kind ? "page" : undefined} key={page.kind}>
                <Link href={`/dashboard/boutique/pages?page=${page.kind}`}>{pageKinds[page.kind].label}</Link>
                <span className="icon-actions">
                  <form action={moveStorePage}>
                    <input name="kind" type="hidden" value={page.kind} />
                    <SubmitButton aria-label={`Monter « ${pageKinds[page.kind].label} » dans le menu`} className="icon-button" disabled={index === 0} name="direction" pendingLabel="" title="Monter dans le menu" value="up">
                      <ArrowUp aria-hidden="true" size={15} />
                    </SubmitButton>
                    <SubmitButton aria-label={`Descendre « ${pageKinds[page.kind].label} » dans le menu`} className="icon-button" disabled={index === pages.length - 1} name="direction" pendingLabel="" title="Descendre dans le menu" value="down">
                      <ArrowDown aria-hidden="true" size={15} />
                    </SubmitButton>
                  </form>
                  <form action={setStorePageVisibility}>
                    <input name="kind" type="hidden" value={page.kind} />
                    <input name="visible" type="hidden" value={page.status === "PUBLISHED" ? "0" : "1"} />
                    <SubmitButton
                      aria-label={page.status === "PUBLISHED" ? `Masquer « ${pageKinds[page.kind].label} » du menu` : `Afficher « ${pageKinds[page.kind].label} » dans le menu`}
                      className={`icon-button${page.status === "PUBLISHED" ? " is-on" : ""}`}
                      pendingLabel=""
                      title={page.status === "PUBLISHED" ? "Visible dans le menu : touchez pour masquer" : "Masquée : touchez pour l’afficher dans le menu"}
                    >
                      {page.status === "PUBLISHED" ? <Eye aria-hidden="true" size={15} /> : <EyeOff aria-hidden="true" size={15} />}
                    </SubmitButton>
                  </form>
                  <Badge tone={page.status === "PUBLISHED" ? "success" : "neutral"}>{page.status === "PUBLISHED" ? "Publiée" : "Brouillon"}</Badge>
                </span>
              </li>
            ))}
            {missing.map((kind) => (
              <li key={kind}>
                <span>
                  {pageKinds[kind].label}
                  <small>Pas encore créée</small>
                </span>
                <Badge tone="neutral">—</Badge>
              </li>
            ))}
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
