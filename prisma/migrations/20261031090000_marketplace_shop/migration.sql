-- Marketplace shop.prestafrik.com : visuels gérés par l'administration et sélections (ventes flash,
-- offres exclusives, boutiques à la une). Migration additive : rien d'existant n'est modifié.
ALTER TYPE "AnnouncementPlacement" ADD VALUE IF NOT EXISTS 'SHOP_CAROUSEL';
ALTER TYPE "AnnouncementPlacement" ADD VALUE IF NOT EXISTS 'SHOP_BANNER';

CREATE TYPE "MarketplacePickSection" AS ENUM ('FLASH', 'EXCLUSIVE', 'FEATURED_STORE');

CREATE TABLE "MarketplacePick" (
    "id" TEXT NOT NULL,
    "section" "MarketplacePickSection" NOT NULL,
    "productId" TEXT,
    "storeId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplacePick_pkey" PRIMARY KEY ("id"),
    -- Un produit pour les ventes flash et offres exclusives, une boutique pour les boutiques à la une.
    CONSTRAINT "MarketplacePick_target_check" CHECK (
        ("section" = 'FEATURED_STORE' AND "storeId" IS NOT NULL AND "productId" IS NULL)
        OR ("section" <> 'FEATURED_STORE' AND "productId" IS NOT NULL AND "storeId" IS NULL)
    )
);

CREATE INDEX "MarketplacePick_section_position_idx" ON "MarketplacePick"("section", "position");

ALTER TABLE "MarketplacePick" ADD CONSTRAINT "MarketplacePick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplacePick" ADD CONSTRAINT "MarketplacePick_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
