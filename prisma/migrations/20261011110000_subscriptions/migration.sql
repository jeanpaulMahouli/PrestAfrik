-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SubscriptionPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "monthlyPriceXaf" INTEGER NOT NULL,
    "yearlyPriceXaf" INTEGER NOT NULL,
    "productQuota" INTEGER NOT NULL,
    "monthlyMessageQuota" INTEGER NOT NULL,
    "memberQuota" INTEGER NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduledPlanId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billingPeriod" "SubscriptionPeriod",
    "trialStartedAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerRef" VARCHAR(120),
    "eventId" VARCHAR(120) NOT NULL,
    "amountXaf" INTEGER NOT NULL,
    "period" "SubscriptionPeriod" NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- Seed demo plans
INSERT INTO "Plan" (
    "id", "code", "name", "monthlyPriceXaf", "yearlyPriceXaf",
    "productQuota", "monthlyMessageQuota", "memberQuota", "recommended",
    "active", "sortOrder", "createdAt", "updatedAt"
) VALUES
    ('plan_essential', 'ESSENTIAL', 'Essentiel', 3000, 30000, 50, 500, 3, false, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('plan_business', 'BUSINESS', 'Business', 7500, 75000, 250, 3000, 10, true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('plan_pro', 'PRO', 'Pro', 15000, 150000, 1000, 10000, 25, false, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Existing stores enter a one-calendar-month Business trial from their creation time.
INSERT INTO "Subscription" (
    "id", "storeId", "planId", "status", "trialStartedAt", "trialEndsAt", "createdAt", "updatedAt"
)
SELECT
    'subscription_' || store."id",
    store."id",
    'plan_business',
    'TRIAL',
    store."createdAt",
    store."createdAt" + INTERVAL '1 month',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Store" store;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "Plan_active_sortOrder_idx" ON "Plan"("active", "sortOrder");
CREATE UNIQUE INDEX "Subscription_storeId_key" ON "Subscription"("storeId");
CREATE INDEX "Subscription_status_trialEndsAt_idx" ON "Subscription"("status", "trialEndsAt");
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");
CREATE UNIQUE INDEX "SubscriptionPayment_eventId_key" ON "SubscriptionPayment"("eventId");
CREATE INDEX "SubscriptionPayment_subscriptionId_createdAt_idx" ON "SubscriptionPayment"("subscriptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
