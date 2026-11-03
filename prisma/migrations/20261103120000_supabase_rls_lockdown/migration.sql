-- Sécurité Supabase (alertes « rls_disabled_in_public » et « sensitive_columns_exposed ») :
-- l'API publique de Supabase (PostgREST, rôles anon et authenticated) ne doit rien voir.
-- L'application passe uniquement par Prisma avec le rôle postgres, propriétaire des tables, qui contourne
-- la RLS (BYPASSRLS) : elle n'est pas concernée. Aucune politique n'est créée : tout accès par l'API est refusé.

-- 1. RLS activée sur toutes les tables du schéma public (y compris _prisma_migrations).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END $$;

-- 2. Droits retirés aux rôles de l'API (présents seulement sur Supabase), y compris pour les futures tables.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- 3. Toute nouvelle table du schéma public reçoit la RLS dès sa création (migrations futures).
CREATE OR REPLACE FUNCTION public.prestafrik_enable_rls_on_new_tables()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.prestafrik_enable_rls_on_new_tables() FROM PUBLIC;

DO $$
BEGIN
  DROP EVENT TRIGGER IF EXISTS prestafrik_enable_rls_on_new_tables;
  CREATE EVENT TRIGGER prestafrik_enable_rls_on_new_tables ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    EXECUTE FUNCTION public.prestafrik_enable_rls_on_new_tables();
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Hébergeur sans droit sur les déclencheurs d'événements : les nouvelles tables restent fermées à l'API
    -- grâce aux droits par défaut retirés ci-dessus ; la RLS sera activée par une prochaine migration.
    RAISE NOTICE 'Déclencheur RLS non créé (droits insuffisants).';
END $$;
