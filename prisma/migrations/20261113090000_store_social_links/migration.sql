-- Réseaux sociaux de la boutique, affichés dans le pied de page de la vitrine (Ma boutique → Réseaux sociaux).

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "facebookUrl" VARCHAR(300),
ADD COLUMN "instagramUrl" VARCHAR(300),
ADD COLUMN "tiktokUrl" VARCHAR(300),
ADD COLUMN "youtubeUrl" VARCHAR(300),
ADD COLUMN "xUrl" VARCHAR(300);
