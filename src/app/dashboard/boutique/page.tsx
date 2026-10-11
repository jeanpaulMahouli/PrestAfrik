import { StoreTheme } from "@prisma/client";
import Link from "next/link";
import { StoreAppearanceForm } from "@/components/stores/store-appearance-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  publishStore,
  resetStoreColors,
  unpublishStore,
} from "@/modules/stores/settings-actions";
import { requireStorePermission } from "@/modules/stores/context";
import { cameroonCities, storeBusinessCategories } from "@/modules/stores/options";

export default async function StoreSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const { session, store, memberships, membership } = await requireStorePermission("store.manage");
  const { erreur, succes } = await searchParams;

  return (
    <DashboardShell memberships={memberships} role={membership.role} store={store} userEmail={session.user.email} userName={session.user.name}>
      <div className="page-heading">
        <div>
          <h1 className="dashboard-heading">Ma boutique</h1>
          <p className="dashboard-copy">{store.isPublished ? "Ta boutique est en ligne." : "Ta boutique est en brouillon."}</p>
        </div>
        <div className="page-actions">
          <form action={resetStoreColors}>
            <SubmitButton className="secondary-button" pendingLabel="Rétablissement…">
              Retour aux couleurs par défaut
            </SubmitButton>
          </form>
          {store.isPublished ? (
            <Link className="primary-button" href={`/boutique/${store.slug}`} target="_blank">
              Voir ma boutique
            </Link>
          ) : (
            <>
              <Link className="secondary-button" href={`/boutique/${store.slug}`} target="_blank">
                Prévisualiser
              </Link>
              <form action={publishStore}>
                <SubmitButton className="primary-button" pendingLabel="Publication…">
                  Publier
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
      {succes && <p className="notice" role="status">{statusMessage(succes)}</p>}
      <StoreAppearanceForm
        error={erreur}
        initialValues={{
          name: store.name,
          businessCategory: storeBusinessCategories.find(
            (category) => category === store.businessCategory,
          ) ?? (store.businessCategory === "Mode" ? "Vêtements" : ""),
          city: cameroonCities.find((city) => city === store.city) ?? "",
          description: store.description ?? "",
          logoUrl: store.logoUrl,
          theme: store.theme ?? StoreTheme.CATALOGUE_EXPRESS,
          primaryColor: store.primaryColor,
          secondaryColor: store.secondaryColor,
          accentColor: store.accentColor,
        }}
      />
      <section className="surface-card publication-status">
        <div>
          <h2>Publication de ta boutique</h2>
          <p className="dashboard-copy">
            Adresse publique : <strong>prestafrik.com/boutique/{store.slug}</strong>
          </p>
          {!session.user.emailVerified && (
            <p className="notice notice-warning">
              Confirme ton adresse e-mail avant de publier ta boutique.
            </p>
          )}
        </div>
        {store.isPublished && (
          <form action={unpublishStore}>
            <SubmitButton className="secondary-button" pendingLabel="Mise en brouillon…">
              Mettre en brouillon
            </SubmitButton>
          </form>
        )}
      </section>
    </DashboardShell>
  );
}

function statusMessage(status: string) {
  if (status === "publication") return "Tout est prêt : ta boutique est publiée !";
  if (status === "brouillon") return "Ta boutique est maintenant en brouillon.";
  if (status === "couleurs") return "Les couleurs de PrestAfrik sont rétablies.";
  return "Modifications enregistrées.";
}
