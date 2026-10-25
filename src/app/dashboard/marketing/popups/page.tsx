import { VendorShell } from "@/components/layout/vendor-shell";
import { MarketingTabs } from "@/components/marketing/marketing-tabs";
import { PopupManager, type ManagedPopup } from "@/components/merchandising/popup-manager";
import { prisma } from "@/lib/prisma";
import { storeLinkLabels } from "@/modules/merchandising/links";
import { linkTargets } from "@/modules/merchandising/server";
import { dayInputValue } from "@/modules/merchandising/validation";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Popups" };

const flashMessages: Record<string, string> = {
  active: "Popup activé : vos visiteurs le verront à l’ouverture de la boutique.",
  "active-seul": "Popup activé. C’est maintenant le seul popup actif : les autres ont été désactivés automatiquement.",
  desactive: "Popup désactivé : il n’apparaît plus dans votre boutique.",
  supprime: "Popup supprimé.",
};

function popupState(popup: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date): ManagedPopup["state"] {
  if (!popup.isActive) return { label: "Inactif", tone: "neutral" };
  if (popup.endsAt && popup.endsAt < now) return { label: "Terminé (date de fin passée)", tone: "warning" };
  if (popup.startsAt && popup.startsAt > now) return { label: "Programmé", tone: "warning" };
  return { label: "Actif : visible dans la boutique", tone: "success" };
}

export default async function PopupsPage({ searchParams }: PageProps<"/dashboard/marketing/popups">) {
  const { store } = await requireStorePermission("marketing.manage");
  const params = await searchParams;
  const [popups, targets] = await Promise.all([
    prisma.storePopup.findMany({
      where: { storeId: store.id },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      include: { category: { select: { name: true } }, product: { select: { name: true } } },
    }),
    linkTargets(store.id),
  ]);
  const now = new Date();
  const managed: ManagedPopup[] = popups.map((popup) => ({
    id: popup.id,
    title: popup.title,
    imageUrl: popup.imageUrl,
    altText: popup.altText,
    isActive: popup.isActive,
    startsOn: dayInputValue(popup.startsAt),
    endsOn: dayInputValue(popup.endsAt),
    linkType: popup.linkType,
    categoryId: popup.categoryId,
    productId: popup.productId,
    state: popupState(popup, now),
    linkLabel:
      popup.linkType === "CATEGORY" && popup.category
        ? `catégorie « ${popup.category.name} »`
        : popup.linkType === "PRODUCT" && popup.product
          ? `produit « ${popup.product.name} »`
          : storeLinkLabels[popup.linkType].toLowerCase(),
  }));
  const flash = typeof params.succes === "string" ? (flashMessages[params.succes] ?? null) : null;

  return (
    <VendorShell>
      <MarketingTabs current="/dashboard/marketing/popups" />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Popups</h1>
          <p className="v-page-subtitle">
            Une image qui s’affiche à l’ouverture de votre boutique, une fois par visite. Votre boutique a un seul popup : modifiez-le, activez-le ou désactivez-le quand vous voulez.
          </p>
        </div>
      </div>
      <PopupManager flash={flash} popups={managed} targets={targets} />
    </VendorShell>
  );
}
