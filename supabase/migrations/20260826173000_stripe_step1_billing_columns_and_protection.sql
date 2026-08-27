-- Migration: Stripe Step 1 — billing columns, webhook idempotency, billing column protection
-- Decisions: No.147 (billing column protection), No.148 (webhook idempotency)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- A. breeders — Stripe billing columns (Decision No.148)
-- ---------------------------------------------------------------------------

ALTER TABLE public.breeders
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at timestamptz;

COMMENT ON COLUMN public.breeders.stripe_price_id IS
  'Stripe Price ID at subscription creation (immutable Price snapshot). Updated by service_role Webhook only.';

COMMENT ON COLUMN public.breeders.subscription_current_period_end IS
  'Current billing period end from Stripe Subscription. Updated by service_role Webhook only.';

COMMENT ON COLUMN public.breeders.cancel_at_period_end IS
  'Whether subscription cancels at period end (Stripe cancel_at_period_end). Default false.';

COMMENT ON COLUMN public.breeders.last_payment_failed_at IS
  'Timestamp of last invoice.payment_failed (Stripe). Updated by service_role Webhook only.';

-- ---------------------------------------------------------------------------
-- B. stripe_webhook_events — idempotency (Decision No.148, no payload storage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT stripe_webhook_events_stripe_event_id_unique UNIQUE (stripe_event_id)
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Stripe Webhook processed event IDs for idempotency. No raw payload (PII minimization). service_role only.';

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies: anon / authenticated denied; service_role bypasses RLS (Supabase default).

-- ---------------------------------------------------------------------------
-- C. Billing column protection (Decision No.147)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.breeders_billing_update_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(auth.role(), '') = 'service_role'
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

COMMENT ON FUNCTION public.breeders_billing_update_allowed() IS
  'True when caller may update breeders billing columns (service_role Webhook only).';

CREATE OR REPLACE FUNCTION public.enforce_breeders_billing_columns_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.breeders_billing_update_allowed() THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_status IS DISTINCT FROM OLD.membership_status THEN
    RAISE EXCEPTION 'direct update of membership_status is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'direct update of stripe_customer_id is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'direct update of stripe_subscription_id is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id THEN
    RAISE EXCEPTION 'direct update of stripe_price_id is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'direct update of subscription_status is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end THEN
    RAISE EXCEPTION 'direct update of subscription_current_period_end is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end THEN
    RAISE EXCEPTION 'direct update of cancel_at_period_end is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.last_payment_failed_at IS DISTINCT FROM OLD.last_payment_failed_at THEN
    RAISE EXCEPTION 'direct update of last_payment_failed_at is not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at THEN
    RAISE EXCEPTION 'direct update of suspended_at is not allowed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_breeders_billing_columns_update() IS
  'Blocks authenticated users from updating billing columns; allows service_role only. Admin RPCs updating non-billing columns are unaffected.';

DROP TRIGGER IF EXISTS breeders_enforce_billing_columns ON public.breeders;

CREATE TRIGGER breeders_enforce_billing_columns
  BEFORE UPDATE ON public.breeders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_breeders_billing_columns_update();

COMMIT;
