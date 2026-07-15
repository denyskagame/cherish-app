-- Enable Row Level Security on every table in the public schema.
--
-- Why: Supabase exposes the public schema through its PostgREST API using the
-- `anon` / `authenticated` roles. With RLS off, anyone holding the (public) anon
-- key could read/write these tables directly. Supabase's linter flags this as an
-- ERROR (0013_rls_disabled_in_public).
--
-- Cherish does NOT use PostgREST or the anon key — it connects only via Prisma as
-- the `postgres` role, which is the table owner and has BYPASSRLS. Enabling RLS
-- with no policies therefore denies the public API roles by default while leaving
-- the application (Prisma) completely unaffected. No policies are added on
-- purpose: this is a deny-all lockdown of the auto-generated REST surface.
--
-- Idempotent: ALTER TABLE ... ENABLE ROW LEVEL SECURITY is a no-op if already on.
-- Covers _prisma_migrations too (also flagged); Prisma bypasses RLS as owner.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
