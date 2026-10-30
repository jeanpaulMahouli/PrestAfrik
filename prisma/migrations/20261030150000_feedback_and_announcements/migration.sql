-- Messages des vendeurs depuis leur tableau de bord (questions, suggestions, avis notés sur PrestAfrik)
-- et annonces de PrestAfrik en haut du tableau de bord. Ajouts seulement : aucune donnée existante modifiée.
CREATE TYPE "SupportTicketKind" AS ENUM ('CONTACT', 'QUESTION', 'SUGGESTION', 'REVIEW');
CREATE TYPE "AnnouncementPlacement" AS ENUM ('CAROUSEL', 'BANNER');

ALTER TABLE "SupportTicket"
  ADD COLUMN "kind" "SupportTicketKind" NOT NULL DEFAULT 'CONTACT',
  ADD COLUMN "rating" SMALLINT,
  ADD COLUMN "storeId" TEXT;

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "SupportTicket_kind_createdAt_idx" ON "SupportTicket"("kind", "createdAt");

CREATE TABLE "PlatformAnnouncement" (
    "id" TEXT NOT NULL,
    "placement" "AnnouncementPlacement" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" VARCHAR(160) NOT NULL,
    "linkUrl" VARCHAR(500),
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformAnnouncement_placement_active_position_idx" ON "PlatformAnnouncement"("placement", "active", "position");
