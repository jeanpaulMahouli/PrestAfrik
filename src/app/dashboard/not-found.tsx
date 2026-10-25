import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";

export const metadata = { title: "Page introuvable" };

/** Page absente de l'espace vendeur : affichée dans le tableau de bord, avec son menu. */
export default function DashboardNotFound() {
  return (
    <VendorShell>
      <section className="v-card v-empty v-not-found">
        <p aria-hidden="true" className="v-not-found-code">404</p>
        <h1 className="v-page-title">Page introuvable</h1>
        <p>Cet élément n’existe pas ou plus dans cette boutique : il a peut-être été supprimé, ou le lien est incomplet.</p>
        <div className="v-not-found-actions">
          <Link className="btn btn-primary" href="/dashboard">Tableau de bord</Link>
          <Link className="btn btn-secondary" href="/dashboard/commandes">Mes commandes</Link>
          <Link className="btn btn-secondary" href="/dashboard/produits">Mes produits</Link>
        </div>
      </section>
    </VendorShell>
  );
}
