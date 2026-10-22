-- Administration PrestAfrik : suspension des comptes, journal d'audit et suivi des alertes.

ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspensionReason" VARCHAR(300);

CREATE TYPE "AdminAlertStatus" AS ENUM ('RESOLVED', 'IGNORED');

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(60) NOT NULL,
    "targetType" VARCHAR(30) NOT NULL,
    "targetId" VARCHAR(60) NOT NULL,
    "storeId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAlertState" (
    "key" VARCHAR(160) NOT NULL,
    "status" "AdminAlertStatus" NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAlertState_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AdminAlertState_status_updatedAt_idx" ON "AdminAlertState"("status", "updatedAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAlertState" ADD CONSTRAINT "AdminAlertState_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
