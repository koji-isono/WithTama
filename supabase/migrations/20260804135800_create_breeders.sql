-- Migration: create public.breeders Version 1.0
-- New table only: no DROP TABLE, TRUNCATE, or DELETE

BEGIN;

CREATE TABLE IF NOT EXISTS public.breeders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  business_name text NOT NULL,
  representative_name text NOT NULL,
  profile_text text,
  breeding_policy text,
  health_policy text,
  breeding_environment text,
  postal_code text NOT NULL,
  prefecture text NOT NULL,
  city text NOT NULL,
  address_line text NOT NULL,
  phone text NOT NULL,
  public_email text,
  website_url text,
  business_registration_number text NOT NULL,
  business_registration_type text NOT NULL,
  registration_authority text NOT NULL,
  registration_expires_at date NOT NULL,
  identity_document_path text,
  business_license_path text,
  identity_verification_status text NOT NULL DEFAULT 'unverified',
  business_verification_status text NOT NULL DEFAULT 'unverified',
  review_status text NOT NULL DEFAULT 'draft',
  membership_status text NOT NULL DEFAULT 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  approved_at timestamptz,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT breeders_user_id_unique UNIQUE (user_id),

  CONSTRAINT breeders_identity_verification_status_check CHECK (
    identity_verification_status IN (
      'unverified', 'submitted', 'verified', 'rejected'
    )
  ),

  CONSTRAINT breeders_business_verification_status_check CHECK (
    business_verification_status IN (
      'unverified', 'submitted', 'verified', 'rejected', 'expired'
    )
  ),

  CONSTRAINT breeders_review_status_check CHECK (
    review_status IN (
      'draft', 'submitted', 'under_review', 'approved', 'rejected', 'resubmission_required'
    )
  ),

  CONSTRAINT breeders_membership_status_check CHECK (
    membership_status IN ('pending', 'active', 'suspended', 'canceled')
  ),

  CONSTRAINT breeders_subscription_status_check CHECK (
    subscription_status IS NULL
    OR subscription_status IN ('trialing', 'active', 'past_due', 'unpaid', 'canceled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS breeders_stripe_customer_id_unique
  ON public.breeders (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS breeders_stripe_subscription_id_unique
  ON public.breeders (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS breeders_user_id_idx ON public.breeders (user_id);
CREATE INDEX IF NOT EXISTS breeders_review_status_idx ON public.breeders (review_status);
CREATE INDEX IF NOT EXISTS breeders_membership_status_idx ON public.breeders (membership_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_breeders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS breeders_set_updated_at ON public.breeders;

CREATE TRIGGER breeders_set_updated_at
  BEFORE UPDATE ON public.breeders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_breeders_updated_at();

-- RLS
ALTER TABLE public.breeders ENABLE ROW LEVEL SECURITY;

-- Admin role check placeholder (see docs/07_権限設計)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

DROP POLICY IF EXISTS breeders_select_own ON public.breeders;
DROP POLICY IF EXISTS breeders_insert_own ON public.breeders;
DROP POLICY IF EXISTS breeders_update_own ON public.breeders;

CREATE POLICY breeders_select_own
  ON public.breeders
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY breeders_insert_own
  ON public.breeders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY breeders_update_own
  ON public.breeders
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

COMMIT;
