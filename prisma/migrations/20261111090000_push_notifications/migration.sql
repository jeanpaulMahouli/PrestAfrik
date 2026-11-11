-- Notifications push des vendeurs : appareils abonnés, textes modifiables dans l'administration, historique,
-- et date du dernier rappel « Vous nous manquez ».

-- CreateEnum
CREATE TYPE "PushNotificationKind" AS ENUM ('INACTIVITY', 'NEW_ORDER', 'NEW_MESSAGE', 'NEWS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastInactivityPushAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(200) NOT NULL,
    "auth" VARCHAR(100) NOT NULL,
    "userAgent" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotificationTemplate" (
    "kind" "PushNotificationKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" VARCHAR(80) NOT NULL,
    "body" VARCHAR(240) NOT NULL,
    "url" VARCHAR(200) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotificationTemplate_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "PushNotificationLog" (
    "id" TEXT NOT NULL,
    "kind" "PushNotificationKind" NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "body" VARCHAR(240) NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushNotificationLog_createdAt_idx" ON "PushNotificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "PushNotificationLog_kind_createdAt_idx" ON "PushNotificationLog"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
