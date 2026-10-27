-- Style de la rangée « Promotions » choisi dans Ma boutique → Apparence.
CREATE TYPE "StorePromoStyle" AS ENUM ('CLASSIQUE', 'VENTE_FLASH', 'OFFRES_DU_JOUR', 'ECLAT');

ALTER TABLE "Store" ADD COLUMN "promoStyle" "StorePromoStyle" NOT NULL DEFAULT 'CLASSIQUE';
