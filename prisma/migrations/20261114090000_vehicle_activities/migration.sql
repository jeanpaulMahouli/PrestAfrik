-- Univers Immobilier : location et vente de véhicules (demande du 14/11/2026).
-- Produits ordinaires (sans fiche de bien immobilier) : prix, photos, description.
INSERT INTO "Activity" ("id", "slug", "label", "position", "popular", "universe") VALUES
  ('act_location_vehicules', 'location-vehicules', 'Location de véhicules', 35, false, 'IMMOBILIER'),
  ('act_vente_vehicules', 'vente-vehicules', 'Vente de véhicules', 36, false, 'IMMOBILIER')
ON CONFLICT ("slug") DO UPDATE SET "label" = EXCLUDED."label", "position" = EXCLUDED."position", "universe" = EXCLUDED."universe";
