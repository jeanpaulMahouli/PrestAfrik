import "@/styles/admin-content.css";
import { ArrowDown, ArrowUp, Crown, ExternalLink, Eye, EyeOff, LayoutGrid, Megaphone, Plus, Sparkles, Timer, Trash2, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AutoSubmitFile } from "@/components/admin/auto-submit-file";
import { categoryIcon } from "@/components/shop/category-icons";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatFcfa } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { shopUrl, storePublicUrl } from "@/lib/urls";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { getShopTickerSeconds } from "@/modules/announcements/queries";
import { addMarketplacePick, moveMarketplacePick, removeMarketplacePick } from "@/modules/marketplace/picks-actions";
import { getMarketplacePicks } from "@/modules/marketplace/shop";
import { addTicker, removeCategoryImage, removeTicker, setCategoryImage, setTickerSeconds, toggleTicker } from "@/modules/marketplace/visuals-actions";

export const metadata = { title: "Marketplace" };

const sections: Record<"FLASH" | "EXCLUSIVE" | "FEATURED_STORE", { title: string; icon: LucideIcon; help: string; placeholder: string; product: boolean }> = {
  FLASH: { title: "Offre du jour", icon: Zap, help: "Produits avec compte à rebours ; ils disparaissent seuls à la date de fin.", placeholder: "https://mboa-style.prestafrik.com/robe-wax", product: true },
  EXCLUSIVE: { title: "Exclusivités PrestAfrik", icon: Crown, help: "Sélection négociée avec les vendeurs, dans un bandeau doré.", placeholder: "https://mboa-style.prestafrik.com/robe-wax", product: true },
  FEATURED_STORE: { title: "Boutiques à la une", icon: Sparkles, help: "Sans sélection, les boutiques les mieux notées s’affichent.", placeholder: "https://mboa-style.prestafrik.com", product: false },
};

const tabs = {
  "mises-en-avant": { label: "Mises en avant", icon: Sparkles },
  bandeau: { label: "Bandeau publicitaire", icon: Megaphone },
  categories: { label: "Catégories", icon: LayoutGrid },
} as const;
type Tab = keyof typeof tabs;

/** Administration → Marketplace : mises en avant, bandeau publicitaire et images des catégories, en onglets. */
export default async function AdminMarketplacePage({ searchParams }: PageProps<"/admin/marketplace">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const tab: Tab = typeof params.onglet === "string" && Object.hasOwn(tabs, params.onglet) ? (params.onglet as Tab) : "mises-en-avant";
  const [picks, activities, tickers, tickerSeconds] = await Promise.all([
    getMarketplacePicks(),
    prisma.activity.findMany({ orderBy: { position: "asc" }, select: { id: true, slug: true, label: true, imageUrl: true } }),
    prisma.marketplaceTicker.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    getShopTickerSeconds(),
  ]);
  const now = Date.now();
  const counts: Record<Tab, number> = { "mises-en-avant": picks.length, bandeau: tickers.length, categories: activities.filter((activity) => activity.imageUrl).length };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Marketplace</h1>
          <p className="v-page-subtitle">
            Ce que l’équipe met en avant sur <a href={shopUrl("/")} rel="noopener noreferrer" target="_blank">la marketplace</a>. Les bannières se gèrent dans <Link href="/admin/annonces">Annonces</Link>.
          </p>
        </div>
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Rubriques" className="ann-tabs">
        {(Object.keys(tabs) as Tab[]).map((key) => {
          const Icon = tabs[key].icon;
          return (
            <Link aria-current={tab === key ? "page" : undefined} href={key === "mises-en-avant" ? "/admin/marketplace" : `/admin/marketplace?onglet=${key}`} key={key}>
              <Icon aria-hidden="true" size={17} /> {tabs[key].label} <small>{counts[key]}</small>
            </Link>
          );
        })}
      </nav>

      {tab === "mises-en-avant" && (
        <div className="ann-groups">
          {(Object.keys(sections) as (keyof typeof sections)[]).map((section) => {
            const rows = picks.filter((pick) => pick.section === section);
            const config = sections[section];
            const Icon = config.icon;
            return (
              <section aria-labelledby={`rubrique-${section}`} className="v-card ann-group" key={section}>
                <header className="ann-group-head">
                  <span aria-hidden="true" className="ann-group-icon">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h2 id={`rubrique-${section}`}>{config.title}</h2>
                    <p>{config.help}</p>
                  </div>
                </header>

                {rows.length > 0 && (
                  <ul className="mkt-ticker-list">
                    {rows.map((pick, index) => {
                      const expired = pick.endsAt !== null && pick.endsAt.getTime() <= now;
                      const product = pick.product;
                      const href = product ? `${storePublicUrl(product.store.slug)}/${product.slug}` : pick.store ? storePublicUrl(pick.store.slug) : "#";
                      return (
                        <li className={expired ? "is-off" : undefined} key={pick.id}>
                          <span aria-hidden="true" className="mkt-ticker-index">{index + 1}</span>
                          <span className="mkt-ticker-text">
                            <strong>
                              {product ? product.name : pick.store?.name}{" "}
                              <a aria-label="Ouvrir dans un nouvel onglet" href={href} rel="noopener noreferrer" target="_blank">
                                <ExternalLink aria-hidden="true" size={13} />
                              </a>
                            </strong>
                            <small>
                              {product ? `${product.store.name} · ${formatFcfa(product.promotionalPriceXaf ?? product.priceXaf)}` : "Boutique"}
                              {pick.endsAt ? ` · jusqu’au ${formatDateTime(pick.endsAt)}` : ""}
                            </small>
                          </span>
                          {expired && <Badge tone="neutral">Terminée</Badge>}
                          {product && product.status !== "ACTIVE" && <Badge tone="warning">Hors ligne</Badge>}
                          {pick.store && !pick.store.isPublished && <Badge tone="warning">Hors ligne</Badge>}
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
                        </li>
                      );
                    })}
                  </ul>
                )}

                <details className="ann-add">
                  <summary className="ann-add-trigger ann-add-inline">
                    <Plus aria-hidden="true" size={18} /> {config.product ? "Ajouter un produit" : "Ajouter une boutique"}
                  </summary>
                  <form action={addMarketplacePick} className="ann-add-form">
                    <input name="section" type="hidden" value={section} />
                    <label className="v-field">
                      {config.product ? "Lien du produit" : "Lien de la boutique"}
                      <input maxLength={300} name="link" placeholder={config.placeholder} required />
                    </label>
                    <label className="v-field">
                      Fin {section === "FLASH" ? "de l’offre" : "(facultatif)"}, heure d’Afrique centrale
                      <input name="endsAt" required={section === "FLASH"} type="datetime-local" />
                    </label>
                    <SubmitButton className="btn btn-primary" pendingLabel="Ajout…">
                      Ajouter
                    </SubmitButton>
                  </form>
                </details>
              </section>
            );
          })}
        </div>
      )}

      {tab === "bandeau" && (
        <section aria-labelledby="bandeau-titre" className="v-card ann-group">
          <header className="ann-group-head">
            <span aria-hidden="true" className="ann-group-icon">
              <Megaphone size={20} />
            </span>
            <div>
              <h2 id="bandeau-titre">Bandeau publicitaire</h2>
              <p>Tout en haut de la marketplace, ordinateur et téléphone. 8 textes au plus, 140 caractères chacun.</p>
            </div>
          </header>

          <form action={setTickerSeconds} className="mkt-settings">
            <label className="v-field">
              <span>
                <Timer aria-hidden="true" size={15} /> Durée de chaque texte
              </span>
              <select defaultValue={tickerSeconds} name="seconds">
                {[2, 3, 4, 5, 6, 8, 10, 15].map((value) => (
                  <option key={value} value={value}>
                    {value} secondes
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">
              Enregistrer
            </SubmitButton>
          </form>

          {tickers.length ? (
            <ul className="mkt-ticker-list">
              {tickers.map((ticker, index) => (
                <li className={ticker.active ? undefined : "is-off"} key={ticker.id}>
                  <span aria-hidden="true" className="mkt-ticker-index">{index + 1}</span>
                  <span className="mkt-ticker-text">
                    <strong>{ticker.text}</strong>
                    <small>{ticker.linkUrl ?? "Sans lien"}</small>
                  </span>
                  {!ticker.active && <Badge tone="neutral">Masqué</Badge>}
                  <form action={toggleTicker}>
                    <input name="id" type="hidden" value={ticker.id} />
                    <SubmitButton aria-label={ticker.active ? "Masquer" : "Afficher"} className="icon-button" pendingLabel="">
                      {ticker.active ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                    </SubmitButton>
                  </form>
                  <form action={removeTicker}>
                    <input name="id" type="hidden" value={ticker.id} />
                    <SubmitButton aria-label="Supprimer" className="icon-button icon-button-danger" pendingLabel="">
                      <Trash2 aria-hidden="true" size={16} />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v-muted">Aucun texte : trois messages par défaut s’affichent (paiement à la livraison, WhatsApp, ouvrir sa boutique).</p>
          )}

          {tickers.length < 8 && (
            <details className="ann-add">
              <summary className="ann-add-trigger ann-add-inline">
                <Plus aria-hidden="true" size={18} /> Ajouter un texte
              </summary>
              <form action={addTicker} className="ann-add-form">
                <label className="v-field">
                  Texte
                  <input maxLength={140} name="text" placeholder="Ex. -20 % sur la mode ce week-end à Douala !" required />
                </label>
                <label className="v-field">
                  Lien au clic (facultatif)
                  <input maxLength={500} name="linkUrl" placeholder="/recherche?promo=1 ou https://…" />
                </label>
                <SubmitButton className="btn btn-primary" pendingLabel="Ajout…">
                  Ajouter
                </SubmitButton>
              </form>
            </details>
          )}
        </section>
      )}

      {tab === "categories" && (
        <section aria-labelledby="categories-titre" className="v-card ann-group">
          <header className="ann-group-head">
            <span aria-hidden="true" className="ann-group-icon">
              <LayoutGrid size={20} />
            </span>
            <div>
              <h2 id="categories-titre">Images des catégories</h2>
              <p>Image ronde de chaque catégorie : carré de 400 × 400 px conseillé. Sans image, l’icône s’affiche.</p>
            </div>
          </header>
          <ul className="mkt-categories">
            {activities.map((activity) => {
              const { icon: Icon, tint } = categoryIcon(activity.slug);
              return (
                <li className="mkt-category" key={activity.id}>
                  <span className="mkt-category-circle" style={{ "--tint": tint } as React.CSSProperties}>
                    {/* Image déjà recadrée en carré à l'envoi. */}
                    {activity.imageUrl ? <img alt="" src={activity.imageUrl} /> : <Icon aria-hidden="true" size={28} />}
                  </span>
                  <strong>{activity.label}</strong>
                  <div className="mkt-category-tools">
                    <form action={setCategoryImage} encType="multipart/form-data">
                      <input name="activityId" type="hidden" value={activity.id} />
                      <AutoSubmitFile ariaLabel={`Image de ${activity.label}`} label={activity.imageUrl ? "Changer" : "Image"} />
                    </form>
                    {activity.imageUrl && (
                      <form action={removeCategoryImage}>
                        <input name="activityId" type="hidden" value={activity.id} />
                        <SubmitButton aria-label={`Retirer l’image de ${activity.label}`} className="icon-button icon-button-danger" pendingLabel="">
                          <Trash2 aria-hidden="true" size={15} />
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="v-small v-muted">Choisissez un fichier : il est envoyé aussitôt.</p>
        </section>
      )}
    </>
  );
}
