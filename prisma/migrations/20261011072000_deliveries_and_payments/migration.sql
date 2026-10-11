CREATE TYPE "PaymentType" AS ENUM (
  'PAYMENT_RECEIVED',
  'PARTIAL_PAYMENT',
  'COURIER_COLLECTION',
  'SETTLEMENT',
  'REFUND',
  'REVERSAL'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'OTHER'
);

CREATE TABLE "Courier" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Delivery" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "courierId" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'TO_ORGANIZE',
  "failureReason" VARCHAR(500),
  "assignedAt" TIMESTAMP(3),
  "pickedUpAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "courierId" TEXT,
  "type" "PaymentType" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amountXaf" INTEGER NOT NULL,
  "reference" VARCHAR(120),
  "note" VARCHAR(500),
  "reversesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amountXaf_positive" CHECK ("amountXaf" > 0)
);

CREATE UNIQUE INDEX "Courier_storeId_phone_key" ON "Courier"("storeId", "phone");
CREATE INDEX "Courier_storeId_isActive_name_idx" ON "Courier"("storeId", "isActive", "name");
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");
CREATE INDEX "Delivery_storeId_status_updatedAt_idx" ON "Delivery"("storeId", "status", "updatedAt");
CREATE INDEX "Delivery_courierId_status_idx" ON "Delivery"("courierId", "status");
CREATE UNIQUE INDEX "Payment_reversesId_key" ON "Payment"("reversesId");
CREATE INDEX "Payment_storeId_createdAt_idx" ON "Payment"("storeId", "createdAt");
CREATE INDEX "Payment_storeId_orderId_createdAt_idx" ON "Payment"("storeId", "orderId", "createdAt");
CREATE INDEX "Payment_courierId_createdAt_idx" ON "Payment"("courierId", "createdAt");

ALTER TABLE "Courier"
  ADD CONSTRAINT "Courier_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Delivery"
  ADD CONSTRAINT "Delivery_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Delivery_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Delivery_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Payment_reversesId_fkey"
  FOREIGN KEY ("reversesId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
