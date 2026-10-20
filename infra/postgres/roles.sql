-- Rôles idempotents. Le superuser « sentinelle » exécute ce script ; l'application ne s'y connecte pas.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sentinelle_migration') THEN
		CREATE ROLE sentinelle_migration LOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sentinelle_app') THEN
		CREATE ROLE sentinelle_app LOGIN;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sentinelle_sauvegarde') THEN
		CREATE ROLE sentinelle_sauvegarde LOGIN;
	END IF;
END $$;

ALTER ROLE sentinelle_migration WITH LOGIN PASSWORD :'pass_migration';
ALTER ROLE sentinelle_app WITH LOGIN PASSWORD :'pass_app';
ALTER ROLE sentinelle_sauvegarde WITH LOGIN PASSWORD :'pass_sauvegarde';

GRANT CONNECT ON DATABASE sentinelle TO sentinelle_migration, sentinelle_app, sentinelle_sauvegarde;
-- La migration initiale commence par CREATE SCHEMA IF NOT EXISTS "public" : Postgres exige le droit CREATE sur la
-- base avant même de constater que le schéma existe.
GRANT CREATE ON DATABASE sentinelle TO sentinelle_migration;
GRANT USAGE, CREATE ON SCHEMA public TO sentinelle_migration;
GRANT USAGE ON SCHEMA public TO sentinelle_app, sentinelle_sauvegarde;
REVOKE CREATE ON SCHEMA public FROM sentinelle_app, sentinelle_sauvegarde;

ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle_migration IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sentinelle_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle_migration IN SCHEMA public
	GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO sentinelle_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle_migration IN SCHEMA public
	GRANT SELECT ON TABLES TO sentinelle_sauvegarde;
ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sentinelle_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle IN SCHEMA public
	GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO sentinelle_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sentinelle IN SCHEMA public
	GRANT SELECT ON TABLES TO sentinelle_sauvegarde;

-- Les tables déjà créées par « sentinelle » doivent appartenir au rôle de migration, sinon ALTER échoue.
DO $$
DECLARE r record;
BEGIN
	FOR r IN
		SELECT c.relkind, c.relname
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
			AND pg_get_userbyid(c.relowner) IS DISTINCT FROM 'sentinelle_migration'
	LOOP
		IF r.relkind = 'S' THEN
			EXECUTE format('ALTER SEQUENCE public.%I OWNER TO sentinelle_migration', r.relname);
		ELSIF r.relkind = 'v' THEN
			EXECUTE format('ALTER VIEW public.%I OWNER TO sentinelle_migration', r.relname);
		ELSIF r.relkind = 'm' THEN
			EXECUTE format('ALTER MATERIALIZED VIEW public.%I OWNER TO sentinelle_migration', r.relname);
		ELSE
			EXECUTE format('ALTER TABLE public.%I OWNER TO sentinelle_migration', r.relname);
		END IF;
	END LOOP;
	FOR r IN
		SELECT t.typname
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = 'public' AND t.typtype = 'e'
			AND pg_get_userbyid(t.typowner) IS DISTINCT FROM 'sentinelle_migration'
	LOOP
		EXECUTE format('ALTER TYPE public.%I OWNER TO sentinelle_migration', r.typname);
	END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sentinelle_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sentinelle_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sentinelle_sauvegarde;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sentinelle_migration;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sentinelle_migration;
