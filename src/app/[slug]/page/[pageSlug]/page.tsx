import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreImage } from "@/components/ui/store-image";
import { formatPhone } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { storeHref } from "@/lib/store-host";
import { storeBasePath } from "@/lib/store-links";
import { getStorefrontStore } from "@/modules/catalog/service";
import { blocksSchema, pageKinds, type PageBlock } from "@/modules/pages/blocks";
import { getStorefrontExtras, type StorefrontExtras } from "@/modules/storefront/data";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";
import { BackIcon } from "@/components/ui/icons";

async function loadPage(slug: string, pageSlug: string) {
  const store = await getStorefrontStore(slug);
  if (!store || !/^[a-z0-9-]{1,60}$/.test(pageSlug)) return null;
  const page = await prisma.storePage.findFirst({
    where: { storeId: store.id, slug: pageSlug, ...(store.isPreview ? {} : { status: "PUBLISHED" }) },
    select: { title: true, blocks: true },
  });
  return page ? { store, page } : null;
}

export async function generateMetadata({ params }: PageProps<"/[slug]/page/[pageSlug]">) {
  const { slug, pageSlug } = await params;
  const loaded = await loadPage(slug, pageSlug);
  return { title: loaded ? `${loaded.page.title} · ${loaded.store.name}` : "Page introuvable" };
}

/** Page éditoriale publique : uniquement des blocs validés, jamais de HTML stocké (brief §6.5). */
export default async function StoreEditorialPage({ params }: PageProps<"/[slug]/page/[pageSlug]">) {
  const { slug, pageSlug } = await params;
  const loaded = await loadPage(slug, pageSlug);
  if (!loaded) notFound();
  const { store, page } = loaded;
  const blocks = blocksSchema.safeParse(page.blocks);
  const [extras, base] = await Promise.all([getStorefrontExtras(store.id), storeBasePath(store.slug)]);

  return (
    <main className="sf-page sf-editorial">
      <div className="sf-page-head">
        <Link aria-label="Retour au catalogue" className="sf-back" href={storeHref(base)}><BackIcon size={18} /></Link>
        <h1>{page.title}</h1>
      </div>
      {blocks.success ? (
        blocks.data.map((block, index) => <Block block={block} extras={extras} key={index} base={base} storeName={store.name} />)
      ) : (
        <p className="sf-muted">Cette page est en cours de mise à jour.</p>
      )}
    </main>
  );
}

function Block({ block, extras, base, storeName }: { block: PageBlock; extras: StorefrontExtras; base: string; storeName: string }) {
  switch (block.type) {
    case "heading":
      return <h2>{block.text}</h2>;
    case "paragraph":
      return block.text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>);
    case "image":
      return block.url ? (
        <figure className="sf-editorial-image">
          <StoreImage alt={block.alt} height={900} sizes="(max-width: 768px) 100vw, 720px" src={block.url.replace(/-(?:320|1600)\.webp$/, "-800.webp")} width={1200} />
        </figure>
      ) : null;
    case "list":
      return (
        <ul className="sf-editorial-list">
          {block.items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      );
    case "qa":
      return (
        <details className="sf-faq">
          <summary>{block.question}</summary>
          <p>{block.answer}</p>
        </details>
      );
    case "button": {
      if (block.target === "whatsapp") {
        return extras.whatsappNumber ? (
          <a className="sf-btn sf-btn-whatsapp" href={buildWaMeUrl(extras.whatsappNumber, `Bonjour ${storeName}, `)} rel="noopener noreferrer" target="_blank">{block.label}</a>
        ) : null;
      }
      const href = block.target === "contact" ? storeHref(base, "page", pageKinds.CONTACT.slug) : storeHref(base);
      return <Link className="sf-btn sf-btn-primary" href={href}>{block.label}</Link>;
    }
    case "contact": {
      const phone = extras.store.phoneE164 ?? extras.store.contactPhone;
      const address = [extras.store.address, extras.store.neighborhood, extras.store.city].filter(Boolean).join(", ");
      return (
        <dl className="sf-contact">
          {block.showPhone && phone && (
            <div><dt>Téléphone</dt><dd><a href={`tel:${phone}`}>{formatPhone(phone)}</a></dd></div>
          )}
          {block.showEmail && extras.store.contactEmail && (
            <div><dt>E-mail</dt><dd><a href={`mailto:${extras.store.contactEmail}`}>{extras.store.contactEmail}</a></dd></div>
          )}
          {block.showAddress && address && <div><dt>Adresse</dt><dd>{address}</dd></div>}
          {block.showHours && extras.store.pickupHours && <div><dt>Horaires</dt><dd>{extras.store.pickupHours}</dd></div>}
        </dl>
      );
    }
  }
}
