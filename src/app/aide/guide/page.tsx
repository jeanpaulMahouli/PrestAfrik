import "@/styles/guide.css";
import type { Metadata } from "next";
import { guideChapters } from "@/components/guide/chapters";
import { GuideBrowser } from "@/components/guide/guide-browser";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Guide du vendeur · PrestAfrik" },
  description:
    "Le guide pas à pas du tableau de bord PrestAfrik : créer sa boutique, ajouter ses produits, traiter ses commandes, recueillir des avis clients, livrer, encaisser et faire grandir sa boutique.",
  alternates: { canonical: "/aide/guide" },
};

/** Guide vendeur : un chapitre par fonction du tableau de bord, illustré par la vraie interface. */
export default async function GuidePage() {
  const signedIn = await isSignedIn();
  return (
    <PageShell
      className="lp-page--guide"
      hero={{
        title: "Bien utiliser PrestAfrik, pas à pas",
        subtitle: "De la création de votre boutique à vos premiers avis clients : chaque fonction du tableau de bord, en images.",
      }}
      signedIn={signedIn}
    >
      <GuideBrowser chapters={guideChapters} />
    </PageShell>
  );
}
