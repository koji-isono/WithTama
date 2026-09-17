-- Migration: Phase 1 service_role table privileges (explicit minimum)
-- Runtime: createAdminClient() in src/features/billing/webhook/repository.ts
-- Complements:
--   20260914100000_grant_phase1_table_privileges.sql (authenticated / anon)
--   20260917100000_grant_stripe_webhook_events_service_role.sql (stripe_webhook_events)
--
-- Phase 1 service_role PostgREST matrix:
--   public.stripe_webhook_events → SELECT, INSERT, UPDATE, DELETE (20260917100000)
--   public.breeders              → SELECT, UPDATE (this migration)
--
-- No GRANT ALL. No anon/authenticated grants. No RLS / policy / trigger changes.

BEGIN;

GRANT SELECT, UPDATE ON TABLE public.breeders TO service_role;

COMMIT;
