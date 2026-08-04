-- Migration: create public.buyers Version 1.0
-- New table only: no DROP TABLE, TRUNCATE, or DELETE

-- Migration Purpose
-- Create public.buyers
-- Create indexes
-- Enable Row Level Security
-- Create RLS policies
-- Create updated_at trigger
-- This migration does not delete existing application data.

BEGIN;

-- Shared updated_at trigger function (reuse if already exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  display_name text,
  full_name text,
  prefecture text,
  city text,
  phone text,
  profile_text text,
  preferred_species text,
  preferred_breed text,
  notification_enabled boolean NOT NULL DEFAULT true,
  membership_status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT buyers_user_id_unique UNIQUE (user_id),

  CONSTRAINT buyers_preferred_species_check CHECK (
    preferred_species IS NULL
    OR preferred_species IN ('dog', 'cat', 'both')
  ),

  CONSTRAINT buyers_membership_status_check CHECK (
    membership_status IN ('active', 'suspended', 'canceled', 'deleted')
  )
);

CREATE INDEX IF NOT EXISTS buyers_user_id_idx ON public.buyers (user_id);
CREATE INDEX IF NOT EXISTS buyers_membership_status_idx ON public.buyers (membership_status);
CREATE INDEX IF NOT EXISTS buyers_active_idx
  ON public.buyers (id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS buyers_set_updated_at ON public.buyers;

CREATE TRIGGER buyers_set_updated_at
  BEFORE UPDATE ON public.buyers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buyers_select_own ON public.buyers;

CREATE POLICY buyers_select_own
  ON public.buyers
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS buyers_insert_own ON public.buyers;

CREATE POLICY buyers_insert_own
  ON public.buyers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS buyers_update_own ON public.buyers;

CREATE POLICY buyers_update_own
  ON public.buyers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
