-- Application installée (PWA) : suivi par compte, pour l'administration (Application, Statistiques).
ALTER TABLE "User" ADD COLUMN "appInstalledAt" TIMESTAMP(3),
ADD COLUMN "appLastOpenedAt" TIMESTAMP(3),
ADD COLUMN "appPlatform" VARCHAR(12);

CREATE TABLE "AppUsageDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "platform" VARCHAR(12) NOT NULL,
    "opens" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AppUsageDay_pkey" PRIMARY KEY ("userId","day")
);

CREATE INDEX "AppUsageDay_day_idx" ON "AppUsageDay"("day");

ALTER TABLE "AppUsageDay" ADD CONSTRAINT "AppUsageDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prospection : messages WhatsApp pré-remplis, modifiables par l'administration.
CREATE TABLE "ProspectionMessage" (
    "key" VARCHAR(24) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectionMessage_pkey" PRIMARY KEY ("key")
);
