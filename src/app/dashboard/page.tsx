import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { PeriodFilter } from "@/components/shared/period-filter";
import { ShareStoreButton } from "@/components/shared/share-store-button";
import { StatCard } from "@/components/ui/stat-card";
import { formatFcfa, plural } from "@/lib/format";
import { resolvePeriod } from "@/lib/periods";
import { storePublicUrl } from "@/lib/urls";
import { hasPermission } from "@/modules/auth/permissions";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Accueil" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { session, store, membership } = await getStoreContext();
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const period = resolvePeriod({ periode: value("periode"), du: value("du"), au: value("au") });
  const overview = await getDashboardOverview(store.id, period.from, period.to);
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(membership.role, permission);
  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;

  const tasks = [
    { count: overview.ordersToValidate, label: (n: number) => `${plural(n, "nouvelle commande", "nouvelles commandes")} à valider`, action: "Voir", href: "/dashboard/commandes?onglet=nouvelles", show: can("orders.read") },
    { count: overview.failedMessages, label: (n: number) => `${plural(n, "message")} WhatsApp échoué${n === 1 ? "" : "s"}`, action: "Réessayer", href: "/dashboard/boutique/whatsapp", show: can("store.manage") },
    { count: overview.soldOutProducts, label: (n: number) => `${plural(n, "produit")} épuisé${n === 1 ? "" : "s"}`, action: "Réapprovisionner", href: "/dashboard/produits?disponibilite=SOLD_OUT", show: can("products.read") },
    { count: overview.customersToRecontact, label: (n: number) => `${plural(n, "client")} à recontacter`, action: "Ouvrir la liste", href: "/dashboard/clients?segment=to-recontact", show: can("customers.read") },
  ].filter((task) => task.show && task.count > 0);

  const checklist = [
    { label: "Créer ma boutique", done: true, href: "/dashboard/boutique" },
    { label: "Ajouter mon premier produit", done: overview.activeProducts > 0, href: "/dashboard/produits/nouveau" },
    { label: "Régler mes zones de livraison", done: overview.activeZones > 0, href: "/dashboard/livraisons" },
    { label: "Connecter WhatsApp", done: overview.whatsappConnected, href: "/dashboard/boutique/whatsapp" },
    { label: "Partager ma boutique", done: store.isPublished, href: "/dashboard/boutique" },
  ];
  const doneSteps = checklist.filter((step) => step.done).length;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Bienvenue, {firstName} ! Votre boutique prend vie.</h1>
          <p className="v-page-subtitle">
            Voici l’essentiel de votre activité. Rien à chercher : tout ce qui demande votre attention est ici.
          </p>
        </div>
        <div className="v-page-actions">
          <PeriodFilter basePath="/dashboard" period={period} />
          <ShareStoreButton published={store.isPublished} storeName={store.name} storeUrl={storePublicUrl(store.slug)} />
        </div>
      </div>

      {store.onboardingStep !== null && (
        <p className="v-banner v-banner-info onboarding-resume" role="status">
          <span>La création de votre boutique n’est pas terminée (étape {store.onboardingStep} sur 8). Tout ce que vous avez saisi est enregistré.</span>
          <Link className="btn btn-primary btn-sm" href={`/boutiques/nouvelle?boutique=${store.id}&etape=${store.onboardingStep}`}>
            Reprendre la création
          </Link>
        </p>
      )}

      <p className={`v-banner ${overview.newOrdersToday ? "" : "v-banner-info"}`} role="status">
        {overview.newOrdersToday
          ? `Bravo ! ${plural(overview.newOrdersToday, "nouvelle commande", "nouvelles commandes")} depuis ce matin. Vos clients vous font confiance.`
          : store.isPublished
            ? "Vos prochains clients vous attendent ! Partagez le lien de votre boutique sur WhatsApp pour recevoir vos premières commandes du jour."
            : "Votre boutique est en brouillon. Publiez-la depuis « Ma boutique » pour recevoir vos premières commandes."}
      </p>

      <section aria-label="Chiffres clés" className="stat-grid">
        <StatCard hint="à valider" label="Nouvelles commandes" value={String(overview.ordersToValidate)} />
        <StatCard hint={period.key === "aujourdhui" ? "aujourd’hui" : "sur la période"} label="Commandes validées" value={String(overview.validatedOrders)} />
        {can("payments.read") && (
          <StatCard hint={period.key === "aujourdhui" ? "aujourd’hui" : "sur la période"} label="Argent reçu" value={formatFcfa(overview.receivedXaf)} />
        )}
      </section>

      <div className="v-split home-panels">
        <section aria-labelledby="todo-title" className="v-card">
          <h2 className="v-card-title" id="todo-title">À faire aujourd’hui</h2>
          {tasks.length ? (
            <ul className="todo-list">
              {tasks.map((task) => (
                <li key={task.href}>
                  <span>{task.label(task.count)}</span>
                  <Link href={task.href}>{task.action}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="todo-empty">Tout est à jour. Bravo ! Profitez-en pour ajouter de nouveaux produits ou partager votre boutique.</p>
          )}
          {can("customers.read") && overview.regularCustomers > 0 && (
            <p className="v-muted v-small home-regulars">
              {plural(overview.regularCustomers, "client régulier", "clients réguliers")} (3 commandes ou plus).
            </p>
          )}
        </section>

        <section aria-labelledby="onboarding-title" className="v-card">
          <h2 className="v-card-title" id="onboarding-title">Pour bien démarrer</h2>
          <p className="v-muted v-small onboarding-progress">
            {doneSteps === checklist.length
              ? "Toutes les étapes sont terminées. Bravo, votre boutique est prête !"
              : `${doneSteps} étape${doneSteps > 1 ? "s" : ""} sur ${checklist.length} terminée${doneSteps > 1 ? "s" : ""}. Vos prochains clients vous attendent !`}
          </p>
          <ul className="onboarding-list">
            {checklist.map((step) => (
              <li className={step.done ? "is-done" : ""} key={step.label}>
                <span aria-hidden="true" className="onboarding-dot" />
                {step.done ? (
                  <span>
                    <span className="visually-hidden">Terminé : </span>
                    {step.label}
                  </span>
                ) : (
                  <Link href={step.href}>{step.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </VendorShell>
  );
}
