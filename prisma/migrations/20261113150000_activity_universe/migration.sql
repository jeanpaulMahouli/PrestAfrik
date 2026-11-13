-- Univers des activités : Shopping, Immobilier (locations et réservations), Services, Restauration.
-- La vente de biens immobiliers passe dans Shopping ; la restauration a son propre univers.

-- CreateEnum
CREATE TYPE "Universe" AS ENUM ('SHOPPING', 'IMMOBILIER', 'SERVICES', 'RESTAURATION');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "universe" "Universe" NOT NULL DEFAULT 'SHOPPING';

-- Bannière de l'univers Restauration sur la marketplace (Administration → Annonces).
ALTER TYPE "AnnouncementPlacement" ADD VALUE 'SHOP_RESTAURATION';

-- Activités existantes.
UPDATE "Activity" SET "universe" = 'SERVICES' WHERE "slug" = 'services';
UPDATE "Activity" SET "universe" = 'IMMOBILIER', "label" = 'Location de logements' WHERE "slug" = 'immobilier';
UPDATE "Activity" SET "label" = 'Alimentation et épicerie' WHERE "slug" = 'alimentation';

-- Nouvelles activités (ordre : Shopping, puis Immobilier, Services, Restauration).
INSERT INTO "Activity" ("id", "slug", "label", "position", "popular", "universe") VALUES
  ('act_vente_immobiliere', 'vente-immobiliere', 'Vente immobilière (terrains, maisons)', 16, false, 'SHOPPING'),
  ('act_meubles_sejours', 'meubles-sejours', 'Meublés et séjours courts', 31, false, 'IMMOBILIER'),
  ('act_hotels_auberges', 'hotels-auberges', 'Hôtels et auberges', 32, false, 'IMMOBILIER'),
  ('act_location_bureaux', 'location-bureaux', 'Location de bureaux et commerces', 33, false, 'IMMOBILIER'),
  ('act_location_salles', 'location-salles', 'Location de salles et espaces', 34, false, 'IMMOBILIER'),
  ('act_restaurants', 'restaurants', 'Restaurants', 51, false, 'RESTAURATION'),
  ('act_fast_food', 'fast-food', 'Fast-food et grillades', 52, false, 'RESTAURATION'),
  ('act_traiteurs', 'traiteurs', 'Traiteurs et plats cuisinés', 53, false, 'RESTAURATION'),
  ('act_patisserie', 'patisserie-boulangerie', 'Pâtisserie et boulangerie', 54, false, 'RESTAURATION'),
  ('act_boissons', 'bars-boissons', 'Bars, jus et glaces', 55, false, 'RESTAURATION')
ON CONFLICT ("slug") DO UPDATE SET "universe" = EXCLUDED."universe", "label" = EXCLUDED."label";

UPDATE "Activity" SET "position" = 30 WHERE "slug" = 'immobilier';
UPDATE "Activity" SET "position" = 40 WHERE "slug" = 'services';
