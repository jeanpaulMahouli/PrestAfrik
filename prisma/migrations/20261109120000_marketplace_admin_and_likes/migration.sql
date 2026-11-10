-- Marketplace : administration des emplacements publicitaires, bonne affaire vedette, boutiques exclues,
-- et « j'aime » des visiteurs sur les produits (un par visiteur et par produit).
-- La RLS est activée automatiquement sur la nouvelle table (migration 20261103120000_supabase_rls_lockdown).

-- Emplacements publicitaires de la marketplace (Administration → Annonces).
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_SELLER';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_FEATURED_COLUMN';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_DUO';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_COLUMN_TOP';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_COLUMN_BOTTOM';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_WIDE';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_SEARCH_SIDE';
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_MENU';

-- Administration → Marketplace : bonne affaire vedette, boutique exclue (sa vitrine reste en ligne).
ALTER TYPE "MarketplacePickSection" ADD VALUE 'DEAL_LEAD';
ALTER TYPE "MarketplacePickSection" ADD VALUE 'EXCLUDED_STORE';

-- « J'aime » des visiteurs.
CREATE TABLE "ProductLike" (
    "productId" TEXT NOT NULL,
    "visitorId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("productId","visitorId")
);

ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
