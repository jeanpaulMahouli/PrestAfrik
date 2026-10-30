import { ArrowDown, ArrowUp, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatFcfa } from "@/lib/format";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { addMarketplacePick, moveMarketplacePick, removeMarketplacePick } from "@/modules/marketplace/picks-actions";
import { getMarketplacePicks } from "@/modules/marketplace/shop";

export const metadata = { title: "Marketplace" };

const sections = {
  FLASH: {
    title: "Ventes flash",
    help: "Produits mis en avant avec un compte à rebours. Ils disparaissent seuls à la date de fin. Prix : ceux du vendeur (pensez à lui demander un prix promotionnel).",
    placeholder: "https://mboa-style.prestafrik.com/robe-wax",
    product: true,
  },
  EXCLUSIVE: {
    title: "Offres exclusives PrestAfrik",
    help: "Une sélection de produits négociée avec les vendeurs, dans un bandeau doré. Date de fin facultative.",
    placeholder: "https://mboa-style.prestafrik.com/robe-wax",
    product: true,
  },
  FEATURED_STORE: {
    title: "Boutiques à la une",
    help: "Les boutiques présentées en grand. Sans sélection, la marketplace montre les boutiques les mieux notées.",
    placeholder: "https://mboa-style.prestafrik.com",
    product: false,
  },
} as const;

/** Administration → Marketplace : ce que l'administration met en avant sur shop.prestafrik.com. */
export default async function AdminMarketplacePage({ searchParams }: PageProps<"/admin/marketplace">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const picks = await getMarketplacePicks();
  const now = Date.now();

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Marketplace</h1>
          <p className="v-page-subtitle">
            Ce qui est mis en avant sur <a href={shopUrl("/")} rel="noopener noreferrer" target="_blank">la marketplace</a>. Les promotions, les mieux notés, les nouveautés et les rubriques se remplissent seuls ; les visuels du haut se gèrent dans{" "}
            <Link href="/admin/annonces">Annonces</Link>.
          </p>
        </div>
      </div>
      <AdminFeedback params={params} />

      {(Object.keys(sections) as (keyof typeof sections)[]).map((section) => {
        const rows = picks.filter((pick) => pick.section === section);
        const config = sections[section];
        return (
          <section aria-labelledby={`rubrique-${section}`} className="v-card admin-announce" key={section}>
            <h2 className="v-card-title" id={`rubrique-${section}`}>
              {config.title}
            </h2>
            <p className="v-small v-muted">{config.help}</p>

            {rows.length ? (
              <ul className="admin-announce-list">
                {rows.map((pick, index) => {
                  const expired = pick.endsAt !== null && pick.endsAt.getTime() <= now;
                  const product = pick.product;
                  const href = product ? `${storePublicUrl(product.store.slug)}/${product.slug}` : pick.store ? storePublicUrl(pick.store.slug) : "#";
                  return (
                    <li className={expired ? "is-off" : ""} key={pick.id}>
                      <div className="admin-announce-text">
                        <strong>
                          {product ? product.name : pick.store?.name}{" "}
                          <a aria-label="Ouvrir dans un nouvel onglet" href={href} rel="noopener noreferrer" target="_blank">
                            <ExternalLink aria-hidden="true" size={14} />
                          </a>
                        </strong>
                        <small>
                          {product
                            ? `${product.store.name} · ${formatFcfa(product.promotionalPriceXaf ?? product.priceXaf)}${product.promotionalPriceXaf ? ` (au lieu de ${formatFcfa(product.priceXaf)})` : ""}`
                            : "Boutique"}
                        </small>
                        {pick.endsAt && <small>Jusqu’au {formatDateTime(pick.endsAt)}</small>}
                        {expired && <Badge tone="neutral">Terminée</Badge>}
                        {product && product.status !== "ACTIVE" && <Badge tone="warning">Produit hors ligne</Badge>}
                        {pick.store && !pick.store.isPublished && <Badge tone="warning">Boutique hors ligne</Badge>}
                      </div>
                      <div className="admin-announce-actions">
                        <form action={moveMarketplacePick}>
                          <input name="id" type="hidden" value={pick.id} />
                          <input name="direction" type="hidden" value="up" />
                          <SubmitButton aria-label="Monter" className="icon-button" disabled={index === 0} pendingLabel="">
                            <ArrowUp aria-hidden="true" size={16} />
                          </SubmitButton>
                        </form>
                        <form action={moveMarketplacePick}>
                          <input name="id" type="hidden" value={pick.id} />
                          <input name="direction" type="hidden" value="down" />
                          <SubmitButton aria-label="Descendre" className="icon-button" disabled={index === rows.length - 1} pendingLabel="">
                            <ArrowDown aria-hidden="true" size={16} />
                          </SubmitButton>
                        </form>
                        <form action={removeMarketplacePick}>
                          <input name="id" type="hidden" value={pick.id} />
                          <SubmitButton aria-label="Retirer" className="icon-button icon-button-danger" pendingLabel="">
                            <Trash2 aria-hidden="true" size={16} />
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="v-muted">Rien pour l’instant : cette rubrique est masquée sur la marketplace.</p>
            )}

            <form action={addMarketplacePick} className="admin-announce-form">
              <input name="section" type="hidden" value={section} />
              <label className="v-field">
                {config.product ? "Lien du produit" : "Lien de la boutique"}
                <input maxLength={300} name="link" placeholder={config.placeholder} required />
              </label>
              <label className="v-field">
                Fin {section === "FLASH" ? "de la vente flash" : "(facultatif)"}, heure d’Afrique centrale
                <input name="endsAt" required={section === "FLASH"} type="datetime-local" />
              </label>
              <SubmitButton className="btn btn-primary" pendingLabel="Ajout…">
                Ajouter à « {config.title} »
              </SubmitButton>
            </form>
          </section>
        );
      })}
    </>
  );
}
