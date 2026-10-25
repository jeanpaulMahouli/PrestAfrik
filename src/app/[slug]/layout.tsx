import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import { StoreUnavailable } from "@/components/storefront/store-unavailable";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { prisma } from "@/lib/prisma";
import { storeBasePath } from "@/lib/store-links";
import { appBaseUrl, storePublicUrl } from "@/lib/urls";
import { getStorefrontStore } from "@/modules/catalog/service";
import { hexColorSchema } from "@/modules/catalog/validation";
import { getAccessibleTextColor } from "@/modules/stores/appearance";
import { getStorefrontExtras } from "@/modules/storefront/data";

function safeColor(value: string, fallback: string) {
  const parsed = hexColorSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

/** Boutique existante, publiée ou non : sert au favicon et à la page « bientôt en ligne ». */
const findStoreBySlug = cache((slug: string) =>
  prisma.store.findUnique({ where: { slug }, select: { name: true, logoUrl: true, primaryColor: true, isPublished: true, suspendedAt: true } }),
);

/** Favicon : le logo de la boutique s'il existe, sinon l'icône PrestAfrik (déclarée dans le layout racine). */
export async function generateMetadata({ params }: LayoutProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const store = await findStoreBySlug(slug);
  // Une boutique hors ligne (brouillon ou suspendue) n'est pas indexée par les moteurs de recherche.
  const robots = store && (!store.isPublished || store.suspendedAt) ? { index: false, follow: false } : undefined;
  if (!store?.logoUrl) return robots ? { robots } : {};
  // L'identifiant du fichier change à chaque nouveau logo : le navigateur ne garde pas l'ancienne icône.
  const version = store.logoUrl.split("/").pop()?.replace(/\.webp$/, "") ?? "1";
  const icon = (size: number) => `/api/boutique/${encodeURIComponent(slug)}/icone?taille=${size}&v=${version}`;
  return {
    icons: {
      icon: [
        { url: icon(32), type: "image/png", sizes: "32x32" },
        { url: icon(192), type: "image/png", sizes: "192x192" },
      ],
      apple: { url: icon(180), sizes: "180x180" },
    },
    ...(robots ? { robots } : {}),
  };
}

export default async function PublicStoreLayout({ children, params }: LayoutProps<"/[slug]">) {
  const { slug } = await params;
  const store = await getStorefrontStore(slug);
  if (!store) {
    // La boutique existe mais n'est pas en ligne (pas encore publiée, ou suspendue) : page d'attente plutôt qu'un 404.
    const existing = await findStoreBySlug(slug);
    if (!existing) {
      // Ancienne adresse d'une boutique renommée : redirection vers son adresse actuelle.
      const alias = await prisma.storeSlugAlias.findUnique({ where: { slug }, select: { store: { select: { slug: true } } } });
      const onSubdomain = (await storeBasePath(slug)) === "";
      if (alias) permanentRedirect(onSubdomain ? storePublicUrl(alias.store.slug) : `/${alias.store.slug}`);
      // Sous-domaine sans boutique : la page introuvable s'affiche sur le domaine principal, où ses liens fonctionnent.
      if (onSubdomain) redirect(`${appBaseUrl()}/${slug}`);
      notFound();
    }
    return (
      <StoreUnavailable
        store={{ name: existing.name, logoUrl: existing.logoUrl, primaryColor: safeColor(existing.primaryColor, "#FF9900"), suspended: Boolean(existing.suspendedAt) }}
      />
    );
  }
  const extras = await getStorefrontExtras(store.id);
  const primary = safeColor(store.primaryColor, "#FF9900");
  const secondary = safeColor(store.secondaryColor, "#000026");

  return (
    <StorefrontShell
      base={await storeBasePath(store.slug)}
      chat={
        extras.chat && extras.whatsappNumber
          ? { ...extras.chat, whatsappNumber: extras.whatsappNumber }
          : null
      }
      isPaused={store.subscriptionPaused}
      isPreview={store.isPreview}
      pages={extras.pages}
      store={{
        id: store.id,
        name: store.name,
        slug: store.slug,
        city: store.city,
        logoUrl: store.logoUrl,
        theme: store.theme,
        colors: {
          primary,
          onPrimary: getAccessibleTextColor(primary),
          secondary,
          onSecondary: getAccessibleTextColor(secondary),
          accent: safeColor(store.accentColor, "#EF765E"),
        },
      }}
    >
      {children}
    </StorefrontShell>
  );
}
