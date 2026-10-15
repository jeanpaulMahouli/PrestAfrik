import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { texts } from "@/config/texts";
import { getStoreContext } from "@/modules/stores/context";

export const metadata = { title: "Accès refusé" };

const actions: Record<string, string> = {
  "products.manage": "ajouter, modifier ou supprimer des produits",
  "orders.manage": "annuler des commandes",
  "orders.export": "exporter les commandes",
  "customers.manage": "modifier les fiches clients",
  "payments.read": "voir l’argent reçu",
  "payments.manage": "valider des commandes",
  "delivery.manage": "gérer les zones de livraison",
  "marketing.manage": "envoyer des campagnes",
  "team.read": "voir l’équipe",
  "team.manage": "gérer l’équipe",
  "store.manage": "modifier la boutique",
  "subscription.manage": "gérer l’abonnement",
};

/** Affichée quand un membre ouvre une page que son rôle ne permet pas (au lieu d'une erreur serveur). */
export default async function AccessDeniedPage({ searchParams }: PageProps<"/dashboard/acces-refuse">) {
  const { membership, store } = await getStoreContext();
  const params = await searchParams;
  const right = typeof params.droit === "string" ? actions[params.droit] : undefined;
  const role = texts.vendor.shell.roles[membership.role as keyof typeof texts.vendor.shell.roles] ?? membership.role;

  return (
    <VendorShell>
      <section aria-labelledby="denied-title" className="v-card v-empty access-denied">
        <h1 id="denied-title">Cette action n’est pas disponible pour votre rôle</h1>
        <p>
          Vous êtes <strong>{role}</strong> dans {store.name}.{" "}
          {right ? `Votre rôle ne permet pas de ${right}.` : "Votre rôle ne permet pas d’ouvrir cette page."} Si vous en avez besoin, demandez au
          propriétaire de la boutique de modifier votre rôle.
        </p>
        <Link className="btn btn-primary" href="/dashboard">Retour à l’accueil</Link>
      </section>
    </VendorShell>
  );
}
