import Link from "next/link";
import { StoreImage } from "@/components/ui/store-image";

/**
 * Affichée à la place d'une page introuvable quand la boutique existe mais n'est pas (ou plus) en ligne :
 * le client qui a reçu le lien comprend qu'il doit revenir plus tard.
 */
export function StoreUnavailable({ store }: { store: { name: string; logoUrl: string | null; primaryColor: string; suspended: boolean } }) {
  return (
    <main className="sf-unavailable" style={{ "--sf-unavailable-color": store.primaryColor } as React.CSSProperties}>
      <section className="sf-unavailable-card">
        {store.logoUrl ? (
          <StoreImage alt="" className="sf-unavailable-logo" height={96} src={store.logoUrl} width={96} />
        ) : (
          <span aria-hidden="true" className="sf-unavailable-logo sf-unavailable-initial">{store.name.trim()[0]?.toLocaleUpperCase("fr-FR") ?? "B"}</span>
        )}
        <h1>{store.name}</h1>
        {store.suspended ? (
          <p>Cette boutique est temporairement indisponible. Revenez un peu plus tard, ou contactez directement le vendeur.</p>
        ) : (
          <>
            <p className="sf-unavailable-badge">Bientôt en ligne</p>
            <p>La boutique prépare son catalogue et ouvre très bientôt ses portes. Gardez ce lien : vous pourrez commander ici dès son ouverture.</p>
          </>
        )}
        <p className="sf-unavailable-footer">
          Powered by <Link href="/">PrestAfrik</Link>
        </p>
      </section>
    </main>
  );
}
