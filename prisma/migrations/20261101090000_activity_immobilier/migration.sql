-- Marketplace : univers « Immobilier » à part (vente, location, terrains, bureaux).
INSERT INTO "Activity" ("id", "slug", "label", "position", "popular")
VALUES ('act_immobilier', 'immobilier', 'Immobilier', 17, false)
ON CONFLICT ("slug") DO NOTHING;
