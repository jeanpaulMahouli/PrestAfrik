-- Thème « Grand marché » : vitrine dense façon supermarché en ligne.
-- Ajouté seul : PostgreSQL n'autorise pas une nouvelle valeur d'énumération dans la transaction qui la crée.
ALTER TYPE "StoreTheme" ADD VALUE 'GRAND_MARCHE';
