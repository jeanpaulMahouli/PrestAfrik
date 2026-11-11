-- « Comment avez-vous connu PrestAfrik ? » (étape de l'inscription), et page / photo des notifications push
-- envoyées à la main (reprises dans le formulaire pour le prochain envoi).

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('FACEBOOK', 'YOUTUBE', 'TIKTOK', 'WHATSAPP', 'GOOGLE', 'WORD_OF_MOUTH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "acquisitionSource" "AcquisitionSource",
ADD COLUMN "acquisitionAnsweredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PushNotificationLog" ADD COLUMN "url" VARCHAR(200),
ADD COLUMN "imageUrl" VARCHAR(500);
