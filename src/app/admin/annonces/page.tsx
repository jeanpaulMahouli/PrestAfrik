import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { createAnnouncement, deleteAnnouncement, moveAnnouncement, toggleAnnouncement } from "@/modules/announcements/actions";

export const metadata = { title: "Annonces" };

const placements = {
  CAROUSEL: { title: "Tableau de bord : diaporama", help: "Pleine largeur en haut du tableau de bord des vendeurs, une image toutes les 6 secondes. Format conseillé : 1920 × 600 px (6 images au plus)." },
  BANNER: { title: "Tableau de bord : bannière", help: "Bande fine sous le diaporama. Format conseillé : 1920 × 240 px (la première image active s’affiche)." },
  SHOP_CAROUSEL: { title: "Marketplace : grand diaporama", help: "En haut de shop.prestafrik.com, une image toutes les 5 secondes. Format conseillé : 1600 × 600 px (6 images au plus)." },
  SHOP_BANNER: { title: "Marketplace : visuels à côté", help: "Deux visuels empilés à droite du diaporama (sous le diaporama sur téléphone). Format conseillé : 1200 × 450 px (2 images au plus)." },
} as const;

/** Annonces de PrestAfrik sur le tableau de bord des vendeurs : ajout, ordre, masquer, supprimer. */
export default async function AdminAnnouncementsPage({ searchParams }: PageProps<"/admin/annonces">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const items = await prisma.platformAnnouncement.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Annonces</h1>
          <p className="v-page-subtitle">Les images affichées en haut du tableau de bord de tous les vendeurs et en haut de la marketplace : nouveautés, conseils, offres de PrestAfrik.</p>
        </div>
      </div>
      <AdminFeedback params={params} />

      {(Object.keys(placements) as (keyof typeof placements)[]).map((placement) => {
        const rows = items.filter((item) => item.placement === placement);
        return (
          <section aria-labelledby={`annonces-${placement}`} className="v-card admin-announce" key={placement}>
            <h2 className="v-card-title" id={`annonces-${placement}`}>
              {placements[placement].title}
            </h2>
            <p className="v-small v-muted">{placements[placement].help}</p>

            {rows.length ? (
              <ul className="admin-announce-list">
                {rows.map((item, index) => (
                  <li className={item.active ? "" : "is-off"} key={item.id}>
                    {/* Image déjà convertie au bon format à l'envoi. */}
                    <img alt="" className={`admin-announce-thumb admin-announce-thumb-${placement.toLowerCase()}`} src={item.imageUrl} />
                    <div className="admin-announce-text">
                      <strong>{item.altText}</strong>
                      <small>{item.linkUrl ? `Lien : ${item.linkUrl}` : "Sans lien"}</small>
                      {!item.active && <Badge tone="neutral">Masquée</Badge>}
                    </div>
                    <div className="admin-announce-actions">
                      <form action={moveAnnouncement}>
                        <input name="id" type="hidden" value={item.id} />
                        <input name="direction" type="hidden" value="up" />
                        <SubmitButton aria-label="Monter" className="icon-button" disabled={index === 0} pendingLabel="">
                          <ArrowUp aria-hidden="true" size={16} />
                        </SubmitButton>
                      </form>
                      <form action={moveAnnouncement}>
                        <input name="id" type="hidden" value={item.id} />
                        <input name="direction" type="hidden" value="down" />
                        <SubmitButton aria-label="Descendre" className="icon-button" disabled={index === rows.length - 1} pendingLabel="">
                          <ArrowDown aria-hidden="true" size={16} />
                        </SubmitButton>
                      </form>
                      <form action={toggleAnnouncement}>
                        <input name="id" type="hidden" value={item.id} />
                        <SubmitButton aria-label={item.active ? "Masquer" : "Afficher"} className="icon-button" pendingLabel="">
                          {item.active ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                        </SubmitButton>
                      </form>
                      <form action={deleteAnnouncement}>
                        <input name="id" type="hidden" value={item.id} />
                        <SubmitButton aria-label="Supprimer" className="icon-button icon-button-danger" pendingLabel="">
                          <Trash2 aria-hidden="true" size={16} />
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v-muted">Aucune image pour l’instant : rien ne s’affiche à cet emplacement.</p>
            )}

            <form action={createAnnouncement} className="admin-announce-form" encType="multipart/form-data">
              <input name="placement" type="hidden" value={placement} />
              <label className="v-field">
                Image (PNG, JPG ou WebP, 2 Mo au plus)
                <input accept="image/png,image/jpeg,image/webp" name="image" required type="file" />
              </label>
              <label className="v-field">
                Description de l’image
                <input maxLength={160} name="altText" placeholder="Ex. Nouveau : les campagnes WhatsApp" required />
              </label>
              <label className="v-field">
                Lien au clic (facultatif)
                <input maxLength={500} name="linkUrl" placeholder="/dashboard/marketing ou https://…" />
              </label>
              <SubmitButton className="btn btn-primary" pendingLabel="Envoi de l’image…">
                Ajouter à « {placements[placement].title} »
              </SubmitButton>
            </form>
          </section>
        );
      })}
    </>
  );
}
