-- Marketplace : une bannière pour l'univers Immobilier, une pour Services ; durée du bandeau publicitaire.
ALTER TYPE "AnnouncementPlacement" ADD VALUE IF NOT EXISTS 'SHOP_IMMO';
ALTER TYPE "AnnouncementPlacement" ADD VALUE IF NOT EXISTS 'SHOP_SERVICES';

CREATE TABLE "MarketplaceSettings" (
  "id" TEXT NOT NULL DEFAULT 'shop',
  "tickerSeconds" INTEGER NOT NULL DEFAULT 4,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);
