-- CreateEnum
CREATE TYPE "StoreLinkType" AS ENUM ('NONE', 'CATEGORY', 'PRODUCT', 'PROMO');

-- AlterTable
ALTER TABLE "StorePage" ADD COLUMN     "position" SMALLINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StoreBanner" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" VARCHAR(200) NOT NULL,
    "position" SMALLINT NOT NULL,
    "linkType" "StoreLinkType" NOT NULL DEFAULT 'NONE',
    "categoryId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePopup" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" VARCHAR(200) NOT NULL,
    "linkType" "StoreLinkType" NOT NULL DEFAULT 'NONE',
    "categoryId" TEXT,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePopup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreBanner_storeId_position_idx" ON "StoreBanner"("storeId", "position");

-- CreateIndex
CREATE INDEX "StorePopup_storeId_isActive_idx" ON "StorePopup"("storeId", "isActive");

-- AddForeignKey
ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePopup" ADD CONSTRAINT "StorePopup_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePopup" ADD CONSTRAINT "StorePopup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePopup" ADD CONSTRAINT "StorePopup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ordre initial des pages : leur ordre de création.
UPDATE "StorePage" AS page SET "position" = ranked.rank
FROM (SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "createdAt") - 1) AS rank FROM "StorePage") AS ranked
WHERE page."id" = ranked."id";

-- Catégorie ou produit lié supprimé (lien remis à NULL par la clé étrangère) : le lien repasse à « Aucun ».
CREATE FUNCTION "store_link_reset"() RETURNS trigger AS $$
BEGIN
  IF (NEW."linkType" = 'CATEGORY' AND NEW."categoryId" IS NULL) OR (NEW."linkType" = 'PRODUCT' AND NEW."productId" IS NULL) THEN
    NEW."linkType" := 'NONE';
  END IF;
  IF NEW."linkType" <> 'CATEGORY' THEN NEW."categoryId" := NULL; END IF;
  IF NEW."linkType" <> 'PRODUCT' THEN NEW."productId" := NULL; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "StoreBanner_link_reset" BEFORE INSERT OR UPDATE ON "StoreBanner" FOR EACH ROW EXECUTE FUNCTION "store_link_reset"();
CREATE TRIGGER "StorePopup_link_reset" BEFORE INSERT OR UPDATE ON "StorePopup" FOR EACH ROW EXECUTE FUNCTION "store_link_reset"();

ALTER TABLE "StoreBanner" ADD CONSTRAINT "StoreBanner_position_check" CHECK ("position" BETWEEN 0 AND 3);
