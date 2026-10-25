-- Rôle « super administrateur » : il peut donner ou retirer les droits d'administration.
-- Ajouté seul : PostgreSQL n'autorise pas une nouvelle valeur d'énumération dans la transaction qui la crée.
ALTER TYPE "PlatformRole" ADD VALUE 'SUPER_ADMIN';
