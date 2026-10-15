-- Produits : état explicite (actif, brouillon, archivé) à la place du booléen isArchived.
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

ALTER TABLE "Product" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "Product" SET "status" = 'ARCHIVED', "archivedAt" = "updatedAt" WHERE "isArchived" = true;

DROP INDEX IF EXISTS "Product_storeId_isArchived_availability_createdAt_idx";
ALTER TABLE "Product" DROP COLUMN "isArchived";
CREATE INDEX "Product_storeId_status_availability_createdAt_idx" ON "Product"("storeId", "status", "availability", "createdAt");

-- Photos : position 0..4 (0 = principale), au plus 5 par produit, garanti par la base (brief §6.4).
ALTER TABLE "ProductImage" ADD COLUMN "position" SMALLINT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "sortOrder", "createdAt", "id") - 1 AS rank
  FROM "ProductImage"
)
UPDATE "ProductImage" image SET "position" = ranked.rank FROM ranked WHERE ranked."id" = image."id";

-- Au-delà de 5 photos (cas hérité), les photos supplémentaires sont retirées de la fiche.
DELETE FROM "ProductImage" WHERE "position" > 4;

ALTER TABLE "ProductImage" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_position_check" CHECK ("position" BETWEEN 0 AND 4);
DROP INDEX IF EXISTS "ProductImage_productId_sortOrder_idx";
ALTER TABLE "ProductImage" DROP COLUMN "sortOrder";
CREATE UNIQUE INDEX "ProductImage_productId_position_key" ON "ProductImage"("productId", "position");
