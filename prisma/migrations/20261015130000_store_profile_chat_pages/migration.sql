-- CreateEnum
CREATE TYPE "StorePageKind" AS ENUM ('ABOUT', 'CONTACT', 'FAQ', 'PROMO');

-- CreateEnum
CREATE TYPE "StorePageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "activityOther" VARCHAR(80),
ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "contactEmail" VARCHAR(254),
ADD COLUMN     "country" VARCHAR(2) NOT NULL DEFAULT 'CM',
ADD COLUMN     "neighborhood" VARCHAR(80),
ADD COLUMN     "onboardingStep" INTEGER,
ADD COLUMN     "phoneCountry" VARCHAR(2),
ADD COLUMN     "phoneE164" VARCHAR(20),
ADD COLUMN     "phoneNational" VARCHAR(20),
ADD COLUMN     "pickupAddress" VARCHAR(200),
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pickupHours" VARCHAR(120),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "region" VARCHAR(80),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" VARCHAR(300);

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "businessCountry" VARCHAR(2),
ADD COLUMN     "customerTemplate" VARCHAR(600),
ADD COLUMN     "offerWriteToCustomer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showConfirmAfterOrder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "storeTemplate" VARCHAR(600);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "popular" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreChatConfig" (
    "storeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMessage" VARCHAR(200) NOT NULL,
    "transferTemplate" VARCHAR(300) NOT NULL,
    "offHoursMessage" VARCHAR(300),
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "showOnProduct" BOOLEAN NOT NULL DEFAULT true,
    "showOnCart" BOOLEAN NOT NULL DEFAULT true,
    "showOnCheckout" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreChatConfig_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "StoreChatQuickReply" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "label" VARCHAR(30) NOT NULL,
    "answer" VARCHAR(500) NOT NULL,
    "position" SMALLINT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoreChatQuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePage" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "kind" "StorePageKind" NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "status" "StorePageStatus" NOT NULL DEFAULT 'DRAFT',
    "blocks" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StoreChatQuickReply_storeId_position_key" ON "StoreChatQuickReply"("storeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StorePage_storeId_kind_key" ON "StorePage"("storeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "StorePage_storeId_slug_key" ON "StorePage"("storeId", "slug");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreChatConfig" ADD CONSTRAINT "StoreChatConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreChatQuickReply" ADD CONSTRAINT "StoreChatQuickReply_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePage" ADD CONSTRAINT "StorePage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Activités proposées par l'assistant de création (brief §6.3, étape 2).
INSERT INTO "Activity" ("id", "slug", "label", "position", "popular") VALUES
  ('act_mode', 'vetements-mode', 'Vêtements et mode', 1, true),
  ('act_beaute', 'beaute-cosmetiques', 'Beauté et cosmétiques', 2, true),
  ('act_maison', 'maison-decoration', 'Maison et décoration', 3, true),
  ('act_alimentation', 'alimentation', 'Alimentation et boissons', 4, true),
  ('act_accessoires', 'accessoires', 'Accessoires', 5, false),
  ('act_artisanat', 'artisanat', 'Artisanat', 6, false),
  ('act_electronique', 'electronique', 'Électronique', 7, false),
  ('act_telephonie', 'telephonie-informatique', 'Téléphonie et informatique', 8, false),
  ('act_chaussures', 'chaussures', 'Chaussures', 9, false),
  ('act_bijoux', 'bijoux', 'Bijoux et montres', 10, false),
  ('act_enfants', 'enfants-bebes', 'Enfants et bébés', 11, false),
  ('act_sante', 'sante-bien-etre', 'Santé et bien-être', 12, false),
  ('act_sport', 'sport-loisirs', 'Sport et loisirs', 13, false),
  ('act_librairie', 'librairie-papeterie', 'Librairie et papeterie', 14, false),
  ('act_auto', 'auto-moto', 'Auto et moto', 15, false),
  ('act_services', 'services', 'Services', 16, false)
ON CONFLICT ("slug") DO NOTHING;

-- Reprise des boutiques existantes : activité, téléphone (E.164), date de publication.
UPDATE "Store" SET "activityId" = CASE "businessCategory"
    WHEN 'Vêtements' THEN 'act_mode'
    WHEN 'Mode' THEN 'act_mode'
    WHEN 'Beauté' THEN 'act_beaute'
    WHEN 'Maison' THEN 'act_maison'
    WHEN 'Artisanat' THEN 'act_artisanat'
    WHEN 'Accessoires' THEN 'act_accessoires'
    WHEN 'Alimentation' THEN 'act_alimentation'
    ELSE NULL END
  WHERE "activityId" IS NULL;
UPDATE "Store" SET "activityOther" = LEFT("businessCategory", 80)
  WHERE "activityId" IS NULL AND "businessCategory" IS NOT NULL AND "businessCategory" <> 'Autre';
UPDATE "Store" SET "phoneE164" = "contactPhone",
    "phoneCountry" = CASE WHEN "contactPhone" LIKE '+237%' THEN 'CM' ELSE NULL END,
    "phoneNational" = CASE WHEN "contactPhone" LIKE '+237%' THEN SUBSTRING("contactPhone" FROM 5) ELSE NULL END
  WHERE "contactPhone" IS NOT NULL AND "phoneE164" IS NULL;
UPDATE "Store" SET "publishedAt" = "updatedAt" WHERE "isPublished" = true AND "publishedAt" IS NULL;
UPDATE "WhatsappSettings" SET "businessCountry" = 'CM' WHERE "businessNumber" LIKE '+237%';
