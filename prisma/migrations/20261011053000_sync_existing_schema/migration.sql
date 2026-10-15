-- Rendue idempotente : la migration initiale contient déjà ce schéma pour les nouvelles bases.
-- Sur les bases où elle était déjà appliquée, migrate deploy ne la rejoue pas.
-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ProductAvailability" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'PREORDER');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "OrderConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHANGE_REQUESTED', 'DECLINED', 'EXPIRED');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "OrderProcessingStatus" AS ENUM ('TO_REVIEW', 'ACCEPTED', 'PREPARING', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "DeliveryStatus" AS ENUM ('TO_ORGANIZE', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED', 'PICKUP');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ConsentType" AS ENUM ('ORDER_FOLLOW_UP', 'MARKETING');
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AlterTable
DO $$ BEGIN
ALTER TABLE "Store" ADD COLUMN     "accentColor" VARCHAR(7) NOT NULL DEFAULT '#EF765E',
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "description" VARCHAR(2000),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" VARCHAR(7) NOT NULL DEFAULT '#FF9900',
ADD COLUMN     "secondaryColor" VARCHAR(7) NOT NULL DEFAULT '#000026';
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(90) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" VARCHAR(140) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "sku" VARCHAR(48) NOT NULL,
    "description" VARCHAR(4000),
    "priceXaf" INTEGER NOT NULL,
    "promotionalPriceXaf" INTEGER,
    "availability" "ProductAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "trackInventory" BOOLEAN NOT NULL DEFAULT false,
    "stockQuantity" INTEGER,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" VARCHAR(48) NOT NULL,
    "optionName" VARCHAR(60) NOT NULL,
    "optionValue" VARCHAR(80) NOT NULL,
    "priceXaf" INTEGER,
    "stockQuantity" INTEGER,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "whatsapp" VARCHAR(20) NOT NULL,
    "email" VARCHAR(254),
    "firstOrderAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "neighborhood" VARCHAR(120),
    "landmark" VARCHAR(250),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "CustomerConsent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "feeXaf" INTEGER,
    "estimatedDelay" VARCHAR(100),
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deliveryZoneId" TEXT,
    "reference" VARCHAR(32) NOT NULL,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "trackingToken" VARCHAR(80) NOT NULL,
    "customerName" VARCHAR(120) NOT NULL,
    "customerWhatsapp" VARCHAR(20) NOT NULL,
    "customerEmail" VARCHAR(254),
    "deliveryCity" VARCHAR(100) NOT NULL,
    "neighborhood" VARCHAR(120),
    "landmark" VARCHAR(250),
    "deliveryMethod" VARCHAR(20) NOT NULL,
    "deliveryComment" VARCHAR(500),
    "deliveryFeeXaf" INTEGER,
    "subtotalXaf" INTEGER NOT NULL,
    "totalXaf" INTEGER,
    "confirmationStatus" "OrderConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "processingStatus" "OrderProcessingStatus" NOT NULL DEFAULT 'TO_REVIEW',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'TO_ORGANIZE',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "followUpConsent" BOOLEAN NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" VARCHAR(140) NOT NULL,
    "variantName" VARCHAR(160),
    "sku" VARCHAR(48) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceXaf" INTEGER NOT NULL,
    "lineTotalXaf" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" VARCHAR(48) NOT NULL,
    "fromValue" VARCHAR(80),
    "toValue" VARCHAR(80),
    "note" VARCHAR(500),
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateTable
DO $$ BEGIN
CREATE TABLE "StoreRateLimitBucket" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "keyHash" VARCHAR(64) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoreRateLimitBucket_pkey" PRIMARY KEY ("id")
);
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "ProductCategory_storeId_sortOrder_idx" ON "ProductCategory"("storeId", "sortOrder");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "ProductCategory_storeId_slug_key" ON "ProductCategory"("storeId", "slug");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "ProductCategory_storeId_name_key" ON "ProductCategory"("storeId", "name");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Product_storeId_isArchived_availability_createdAt_idx" ON "Product"("storeId", "isArchived", "availability", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Product_storeId_categoryId_idx" ON "Product"("storeId", "categoryId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "ProductVariant_productId_isArchived_idx" ON "ProductVariant"("productId", "isArchived");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "ProductVariant_productId_optionName_optionValue_key" ON "ProductVariant"("productId", "optionName", "optionValue");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Customer_storeId_name_idx" ON "Customer"("storeId", "name");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Customer_storeId_lastOrderAt_idx" ON "Customer"("storeId", "lastOrderAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Customer_storeId_whatsapp_key" ON "Customer"("storeId", "whatsapp");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "CustomerAddress_customerId_lastUsedAt_idx" ON "CustomerAddress"("customerId", "lastUsedAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "CustomerConsent_storeId_customerId_type_recordedAt_idx" ON "CustomerConsent"("storeId", "customerId", "type", "recordedAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "DeliveryZone_storeId_city_isActive_idx" ON "DeliveryZone"("storeId", "city", "isActive");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "DeliveryZone_storeId_city_name_key" ON "DeliveryZone"("storeId", "city", "name");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Order_storeId_confirmationStatus_createdAt_idx" ON "Order"("storeId", "confirmationStatus", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Order_storeId_processingStatus_createdAt_idx" ON "Order"("storeId", "processingStatus", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "Order_storeId_deliveryStatus_createdAt_idx" ON "Order"("storeId", "deliveryStatus", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Order_storeId_reference_key" ON "Order"("storeId", "reference");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "Order_storeId_idempotencyKey_key" ON "Order"("storeId", "idempotencyKey");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "StockReservation_expiresAt_releasedAt_idx" ON "StockReservation"("expiresAt", "releasedAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "StockReservation_orderId_idx" ON "StockReservation"("orderId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "OutboxEvent_storeId_processedAt_availableAt_idx" ON "OutboxEvent"("storeId", "processedAt", "availableAt");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "OutboxEvent_aggregateId_idx" ON "OutboxEvent"("aggregateId");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE INDEX "StoreRateLimitBucket_windowStart_idx" ON "StoreRateLimitBucket"("windowStart");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- CreateIndex
DO $$ BEGIN
CREATE UNIQUE INDEX "StoreRateLimitBucket_storeId_keyHash_windowStart_key" ON "StoreRateLimitBucket"("storeId", "keyHash", "windowStart");
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "StoreRateLimitBucket" ADD CONSTRAINT "StoreRateLimitBucket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR duplicate_column OR invalid_table_definition THEN NULL;
END $$;
