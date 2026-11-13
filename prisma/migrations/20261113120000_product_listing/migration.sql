-- Univers Immobilier : annonce à vendre ou à louer, période du loyer et caractéristiques du bien.

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "PricePeriod" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "listingType" "ListingType",
ADD COLUMN "pricePeriod" "PricePeriod",
ADD COLUMN "propertyDetails" JSONB;
