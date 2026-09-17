-- Migration: grant service_role DML on stripe_webhook_events (Webhook idempotency)
-- Fixes Production 42501 on claim INSERT (service_role had no table privilege)
-- Complements:
--   20260826173000_stripe_step1_billing_columns_and_protection.sql (table + RLS, no policies)
--   20260914100000_grant_phase1_table_privileges.sql (REVOKE anon/authenticated only)
-- Minimal DML only — no TRUNCATE / REFERENCES / TRIGGER
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stripe_webhook_events TO service_role;

COMMIT;
