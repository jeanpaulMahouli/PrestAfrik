-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveStoreId" TEXT;

-- CreateTable
CREATE TABLE "StoreVisitDay" (
    "storeId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoreVisitDay_pkey" PRIMARY KEY ("storeId","day")
);

-- CreateIndex
CREATE INDEX "StoreVisitDay_day_idx" ON "StoreVisitDay"("day");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastActiveStoreId_fkey" FOREIGN KEY ("lastActiveStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreVisitDay" ADD CONSTRAINT "StoreVisitDay_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

