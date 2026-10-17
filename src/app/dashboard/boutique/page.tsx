import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { ShareStoreButton } from "@/components/shared/share-store-button";
import { DeleteStoreZone } from "@/components/stores/delete-store-zone";
import { StoreAppearanceForm } from "@/components/stores/store-appearance-form";
import { StoreSectionNav } from "@/components/stores/store-section-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import { splitE164 } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";
import { requireStorePermission } from "@/modules/stores/context";
import { cameroonCities } from "@/modules/stores/options";
import { getPublicationChecklist } from "@/modules/stores/publication";
import { publishStore, resetStoreColors, unpublishStore } from "@/modules/stores/settings-actions";

export const metadata = { title: "Ma boutique" };

const successMessages: Record<string, string> = {
  enregistre: "Modifications enregistrées. Votre boutique est à jour.",
  publication: "Votre boutique prend vie ! Tout est prêt : partagez-la.",
  brouillon: "Votre boutique est en brouillon : elle n’est plus visible par vos clients.",
  couleurs: "Les couleurs PrestAfrik sont rétablies.",
  "logo-retire": "Logo retiré : les initiales de votre boutique sont affichées.",
};

export default async function StoreSettingsPage({ searchParams }: PageProps<"/dashboard/boutique">) {
  const { session, store, membership } = await requireStorePermission("store.manage");
  const params = await searchParams;
  const [activities, checklist, counts] = await Promise.all([
    prisma.activity.findMany({ orderBy: { position: "asc" }, select: { id: true, label: true } }),
    getPublicationChecklist(store.id, session.user.emailVerified),
    prisma.store.findUniqueOrThrow({ where: { id: store.id }, select: { _count: { select: { orders: true, products: true } } } }),
  ]);
  const missing = checklist.filter((item) => !item.done && item.key !== "delivery");
  const phone = splitE164(store.phoneE164 ?? store.contactPhone);
  const error = typeof params.erreur === "string" ? params.erreur : null;
  const success = typeof params.succes === "string" ? successMessages[params.succes] : null;
  const publicUrl = storePublicUrl(store.slug);

  return (
    <VendorShell>
      <StoreSectionNav current="/dashboard/boutique" />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Ma boutique</h1>
          <p className="v-page-subtitle">Personnalisez l’apparence de votre boutique : logo, thème, couleurs et informations pratiques.</p>
        </div>
        <div className="v-page-actions">
          <form action={resetStoreColors}>
            <SubmitButton className="btn btn-secondary" pendingLabel="…">Retour aux couleurs par défaut</SubmitButton>
          </form>
          {store.isPublished ? (
            <>
              <ShareStoreButton className="btn btn-secondary" published storeName={store.name} storeUrl={publicUrl} />
              <form action={unpublishStore}>
                <SubmitButton className="btn btn-secondary" pendingLabel="…">Mettre en brouillon</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <Link className="btn btn-secondary" href={`/${store.slug}`} target="_blank">Prévisualiser</Link>
              <form action={publishStore}>
                <SubmitButton className="btn btn-primary" disabled={missing.length > 0} pendingLabel="Publication…">Publier</SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}
      {!store.isPublished && missing.length > 0 && (
        <section aria-labelledby="publish-missing" className="v-banner">
          <strong id="publish-missing">Encore {missing.length} étape{missing.length > 1 ? "s" : ""} avant de publier :</strong>
          <ul className="publish-missing-list">
            {missing.map((item) => (
              <li key={item.key}><Link href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <StoreAppearanceForm
        activities={activities}
        cities={cameroonCities}
        initialValues={{
          name: store.name,
          slug: store.slug,
          description: store.description ?? "",
          activityId: store.activityId ?? "",
          activityOther: store.activityOther ?? "",
          city: store.city ?? "",
          neighborhood: store.neighborhood ?? "",
          phoneCountry: phone.country,
          phoneNational: phone.national,
          contactEmail: store.contactEmail ?? "",
          address: store.address ?? "",
          pickupEnabled: store.pickupEnabled,
          pickupAddress: store.pickupAddress ?? "",
          pickupHours: store.pickupHours ?? "",
          logoUrl: store.logoUrl,
          theme: store.theme,
          primaryColor: store.primaryColor,
          secondaryColor: store.secondaryColor,
          accentColor: store.accentColor,
        }}
        publicUrl={publicUrl}
        published={store.isPublished}
        sideFooter={
          membership.role === "OWNER" ? <DeleteStoreZone orderCount={counts._count.orders} productCount={counts._count.products} storeName={store.name} /> : null
        }
      />
    </VendorShell>
  );
}
