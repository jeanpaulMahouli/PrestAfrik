import { Store } from "@/components/ui/icons";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { BannerManager } from "@/components/merchandising/banner-manager";
import { MarketingTabs } from "@/components/marketing/marketing-tabs";
import { prisma } from "@/lib/prisma";
import { linkTargets } from "@/modules/merchandising/server";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Bannière de la boutique" };

export default async function StoreBannerPage() {
  const { store } = await requireStorePermission("store.manage");
  const [banners, targets] = await Promise.all([
    prisma.storeBanner.findMany({
      where: { storeId: store.id },
      orderBy: { position: "asc" },
      select: { id: true, imageUrl: true, altText: true, linkType: true, categoryId: true, productId: true },
    }),
    linkTargets(store.id),
  ]);

  return (
    <VendorShell>
      <MarketingTabs current="/dashboard/marketing/banniere" />
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Bannière</h1>
          <p className="v-page-subtitle">
            Jusqu’à 4 images.
          </p>
        </div>
        <div className="v-page-actions">
          <Link className="btn btn-secondary" href={`/${store.slug}`} target="_blank"><Store aria-hidden="true" size={18} /> Visiter ma boutique</Link>
        </div>
      </div>
      <BannerManager banners={banners} targets={targets} />
    </VendorShell>
  );
}
