import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/** Espaces privés (vendeurs, administration, API) fermés aux moteurs de recherche ; vitrines et site ouverts. */
const privateSections = ["/dashboard", "/admin", "/dev", "/invitations", "/commande", "/reinitialiser", "/mot-de-passe-oublie", "/boutiques"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Les icônes des boutiques (/api/boutique/…/icone) restent lisibles : Google les affiche dans ses résultats.
      allow: ["/", "/api/boutique/"],
      // Les règles sont des préfixes : « /dev$ » et « /dev/ » ne bloquent pas une boutique « /devshop ».
      disallow: ["/api/", ...privateSections.flatMap((path) => [`${path}$`, `${path}/`])],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
