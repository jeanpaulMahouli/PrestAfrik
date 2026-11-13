import "@/styles/admin-content.css";
import { ArrowDown, ArrowUp, Building2, Eye, EyeOff, Handshake, ImagePlus, LayoutDashboard, LayoutTemplate, Link2, Monitor, MousePointerClick, Search, ShoppingBag, Smartphone, Store, Trash2, UtensilsCrossed, type AppIcon } from "@/components/ui/icons";
import Link from "next/link";
import type { AnnouncementPlacement, PlatformAnnouncement } from "@prisma/client";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { createAnnouncement, deleteAnnouncement, moveAnnouncement, toggleAnnouncement } from "@/modules/announcements/actions";

export const metadata = { title: "Annonces" };

type Slot = { placement: AnnouncementPlacement; title: string; device: "ordinateur" | "téléphone" | "tous"; size: string; max: number; help: string };
type Group = { id: string; title: string; icon: AppIcon; text: string; slots: Slot[] };

/** Emplacements d'images, regroupés comme sur le site (univers de la marketplace, tableau de bord). */
const spaces: Record<"marketplace" | "tableau-de-bord", { label: string; icon: AppIcon; groups: Group[] }> = {
  marketplace: {
    label: "Marketplace",
    icon: Store,
    groups: [
      {
        id: "shopping",
        title: "Shopping",
        icon: ShoppingBag,
        text: "Haut de l’accueil : grand diaporama, et à droite « Devenir vendeur » puis un visuel. Sur téléphone, « Devenir vendeur » passe en premier.",
        slots: [
          { placement: "SHOP_CAROUSEL", title: "Grand diaporama du héros", device: "tous", size: "1744 × 1040 px", max: 6, help: "Une image toutes les 6 secondes. Sans image : le visuel provisoire de la maquette." },
          { placement: "SHOP_SELLER", title: "Bannière « Devenir vendeur »", device: "tous", size: "848 × 496 px", max: 1, help: "Toujours vers /boutique (destination des publicités). Le lien saisi est ignoré." },
          { placement: "SHOP_BANNER", title: "Visuel sous « Devenir vendeur »", device: "tous", size: "848 × 496 px", max: 1, help: "À droite du diaporama, sous la bannière vendeur." },
        ],
      },
      {
        id: "blocs",
        title: "Blocs publicitaires de l’accueil",
        icon: LayoutTemplate,
        text: "Les emplacements entre les produits, dans l’ordre de la page. Sans image : le visuel provisoire de la maquette.",
        slots: [
          { placement: "SHOP_FEATURED_COLUMN", title: "Colonne à gauche des « Produits phares »", device: "ordinateur", size: "624 × 1432 px", max: 1, help: "Grande colonne verticale. Masquée sur tablette et téléphone." },
          { placement: "SHOP_DUO", title: "Deux bannières côte à côte", device: "tous", size: "1296 × 672 px", max: 2, help: "Sous les « Produits phares ». L’une sous l’autre sur téléphone." },
          { placement: "SHOP_COLUMN_TOP", title: "Colonne de droite, visuel du haut", device: "tous", size: "624 × 856 px", max: 1, help: "À droite du second bloc de produits." },
          { placement: "SHOP_COLUMN_BOTTOM", title: "Colonne de droite, visuel du bas", device: "tous", size: "624 × 528 px", max: 1, help: "Sous le visuel du haut." },
          { placement: "SHOP_WIDE", title: "Grande bannière", device: "tous", size: "2876 × 848 px", max: 1, help: "Pleine largeur, avant les mini-listes." },
        ],
      },
      {
        id: "pages",
        title: "Recherche et menu",
        icon: Search,
        text: "Visuels de la page de recherche et du grand menu des catégories.",
        slots: [
          { placement: "SHOP_SEARCH_SIDE", title: "Colonne des filtres (recherche)", device: "ordinateur", size: "624 × 1150 px", max: 1, help: "Sous les filtres de la page de recherche." },
          { placement: "SHOP_MENU", title: "Grand menu « Toutes les catégories »", device: "ordinateur", size: "624 × 768 px", max: 1, help: "À droite des produits de la catégorie survolée." },
        ],
      },
      {
        id: "immobilier",
        title: "Immobilier",
        icon: Building2,
        text: "Une seule bannière, sur ordinateur et téléphone.",
        slots: [{ placement: "SHOP_IMMO", title: "Bannière Immobilier", device: "tous", size: "1600 × 600 px", max: 1, help: "Gardez le texte important au centre : l’image est recadrée sur téléphone." }],
      },
      {
        id: "services",
        title: "Services",
        icon: Handshake,
        text: "Une seule bannière, sur ordinateur et téléphone.",
        slots: [{ placement: "SHOP_SERVICES", title: "Bannière Services", device: "tous", size: "1600 × 600 px", max: 1, help: "Gardez le texte important au centre : l’image est recadrée sur téléphone." }],
      },
      {
        id: "restauration",
        title: "Restauration",
        icon: UtensilsCrossed,
        text: "Une seule bannière, sur ordinateur et téléphone.",
        slots: [{ placement: "SHOP_RESTAURATION", title: "Bannière Restauration", device: "tous", size: "1600 × 600 px", max: 1, help: "Gardez le texte important au centre : l’image est recadrée sur téléphone." }],
      },
    ],
  },
  "tableau-de-bord": {
    label: "Tableau de bord vendeurs",
    icon: LayoutDashboard,
    groups: [
      {
        id: "vendeurs",
        title: "Haut du tableau de bord",
        icon: LayoutDashboard,
        text: "Visible par tous les vendeurs, en haut de leur accueil.",
        slots: [
          { placement: "CAROUSEL", title: "Diaporama", device: "tous", size: "1920 × 600 px", max: 6, help: "Pleine largeur, une image toutes les 6 secondes." },
          { placement: "BANNER", title: "Bannière fine", device: "tous", size: "1920 × 240 px", max: 3, help: "Sous le diaporama : la première image visible s’affiche." },
        ],
      },
    ],
  },
};

const deviceIcon = { ordinateur: Monitor, téléphone: Smartphone, tous: Monitor } as const;
const deviceLabel = { ordinateur: "Ordinateur", téléphone: "Téléphone", tous: "Ordinateur et téléphone" } as const;

function ImageCard({ item, index, count }: { item: PlatformAnnouncement; index: number; count: number }) {
  const shop = item.placement.startsWith("SHOP_");
  return (
    <li className={`ann-card${item.active ? "" : " is-off"}`}>
      <div className={`ann-card-media ann-ratio-${item.placement.toLowerCase()}`}>
        {/* Image déjà convertie au bon format à l'envoi. */}
        <img alt="" src={item.imageUrl} />
        {!item.active && <span className="ann-card-flag">Masquée</span>}
        {count > 1 && <span className="ann-card-order">{index + 1}</span>}
      </div>
      <div className="ann-card-body">
        <strong title={item.altText}>{item.altText}</strong>
        <span className="ann-card-meta">
          <Link2 aria-hidden="true" size={13} /> {item.linkUrl ?? "Sans lien"}
        </span>
        {shop && (
          <span className="ann-card-meta">
            <MousePointerClick aria-hidden="true" size={13} /> {item.ctaLabel ?? "Découvrir"}
          </span>
        )}
      </div>
      <div className="ann-card-actions">
        {count > 1 && (
          <>
            <form action={moveAnnouncement}>
              <input name="id" type="hidden" value={item.id} />
              <input name="direction" type="hidden" value="up" />
              <SubmitButton aria-label="Avancer" className="icon-button" disabled={index === 0} pendingLabel="">
                <ArrowUp aria-hidden="true" size={16} />
              </SubmitButton>
            </form>
            <form action={moveAnnouncement}>
              <input name="id" type="hidden" value={item.id} />
              <input name="direction" type="hidden" value="down" />
              <SubmitButton aria-label="Reculer" className="icon-button" disabled={index === count - 1} pendingLabel="">
                <ArrowDown aria-hidden="true" size={16} />
              </SubmitButton>
            </form>
          </>
        )}
        <form action={toggleAnnouncement}>
          <input name="id" type="hidden" value={item.id} />
          <SubmitButton aria-label={item.active ? "Masquer" : "Afficher"} className="icon-button" pendingLabel="">
            {item.active ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
          </SubmitButton>
        </form>
        <form action={deleteAnnouncement} className="ann-card-delete">
          <input name="id" type="hidden" value={item.id} />
          <SubmitButton aria-label="Supprimer" className="icon-button icon-button-danger" pendingLabel="">
            <Trash2 aria-hidden="true" size={16} />
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}

function SlotBlock({ slot, rows }: { slot: Slot; rows: PlatformAnnouncement[] }) {
  const Device = deviceIcon[slot.device];
  const full = rows.length >= slot.max;
  const shop = slot.placement.startsWith("SHOP_");
  return (
    <section aria-labelledby={`slot-${slot.placement}`} className="ann-slot">
      <header className="ann-slot-head">
        <div>
          <h3 id={`slot-${slot.placement}`}>{slot.title}</h3>
          <p>{slot.help}</p>
        </div>
        <ul aria-label="Caractéristiques" className="ann-chips">
          <li>
            <Device aria-hidden="true" size={14} /> {deviceLabel[slot.device]}
          </li>
          <li>{slot.size}</li>
          <li className={full ? "is-full" : undefined}>
            {rows.length} / {slot.max} image{slot.max > 1 ? "s" : ""}
          </li>
        </ul>
      </header>

      <ul className={`ann-grid${slot.max === 1 ? " is-single" : ""}`}>
        {rows.map((item, index) => (
          <ImageCard count={rows.length} index={index} item={item} key={item.id} />
        ))}
        {!full && (
          <li className="ann-add">
            <details>
              <summary className={`ann-add-trigger ann-ratio-${slot.placement.toLowerCase()}`}>
                <ImagePlus aria-hidden="true" size={26} />
                <span>Ajouter une image</span>
                <small>{slot.size}</small>
              </summary>
              <form action={createAnnouncement} className="ann-add-form" encType="multipart/form-data">
                <input name="placement" type="hidden" value={slot.placement} />
                <label className="v-field">
                  Image (PNG, JPG ou WebP, 2 Mo au plus)
                  <input accept="image/png,image/jpeg,image/webp" name="image" required type="file" />
                </label>
                <label className="v-field">
                  Description (pour les lecteurs d’écran)
                  <input maxLength={160} name="altText" placeholder="Ex. Soldes de la rentrée" required />
                </label>
                <label className="v-field">
                  Lien au clic (facultatif)
                  <input maxLength={500} name="linkUrl" placeholder={shop ? "/recherche?promo=1 ou https://…" : "/dashboard/marketing ou https://…"} />
                </label>
                {shop && (
                  <label className="v-field">
                    Texte du bouton (facultatif)
                    <input maxLength={40} name="ctaLabel" placeholder="« Découvrir » par défaut" />
                  </label>
                )}
                <SubmitButton className="btn btn-primary" pendingLabel="Envoi de l’image…">
                  Ajouter l’image
                </SubmitButton>
              </form>
            </details>
          </li>
        )}
      </ul>
    </section>
  );
}

/** Administration → Annonces : les images de la marketplace (par univers) et du tableau de bord des vendeurs. */
export default async function AdminAnnouncementsPage({ searchParams }: PageProps<"/admin/annonces">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const space = params.espace === "tableau-de-bord" ? "tableau-de-bord" : "marketplace";
  const items = await prisma.platformAnnouncement.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }] });
  const count = (key: keyof typeof spaces) => items.filter((item) => spaces[key].groups.some((group) => group.slots.some((slot) => slot.placement === item.placement))).length;

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Annonces</h1>
          <p className="v-page-subtitle">Les images en haut de la marketplace et du tableau de bord des vendeurs.</p>
        </div>
      </div>
      <AdminFeedback params={params} />

      <nav aria-label="Espace" className="ann-tabs">
        {(Object.keys(spaces) as (keyof typeof spaces)[]).map((key) => {
          const Icon = spaces[key].icon;
          return (
            <Link aria-current={space === key ? "page" : undefined} href={key === "marketplace" ? "/admin/annonces" : `/admin/annonces?espace=${key}`} key={key}>
              <Icon aria-hidden="true" size={17} /> {spaces[key].label} <small>{count(key)}</small>
            </Link>
          );
        })}
      </nav>

      {space === "marketplace" && (
        <nav aria-label="Univers" className="ann-jump">
          {spaces.marketplace.groups.map((group) => {
            const Icon = group.icon;
            return (
              <a href={`#${group.id}`} key={group.id}>
                <Icon aria-hidden="true" size={15} /> {group.title}
              </a>
            );
          })}
        </nav>
      )}

      <div className="ann-groups">
        {spaces[space].groups.map((group) => {
          const Icon = group.icon;
          return (
            <section aria-labelledby={`groupe-${group.id}`} className="v-card ann-group" id={group.id} key={group.id}>
              <header className="ann-group-head">
                <span aria-hidden="true" className="ann-group-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h2 id={`groupe-${group.id}`}>{group.title}</h2>
                  <p>{group.text}</p>
                </div>
              </header>
              {group.slots.map((slot) => (
                <SlotBlock key={slot.placement} rows={items.filter((item) => item.placement === slot.placement)} slot={slot} />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
