-- Migration: pet listing pause / resume (BR-10)
-- published <-> paused for breeder owner; clears pending description revision on pause
-- Applies after 20260907100000_add_pet_description_revision_review.sql
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend status transition trigger (breeder: published <-> paused)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_pets_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'status change requires authentication (from % to %)',
      OLD.status, NEW.status;
  END IF;

  -- Admin allowlist (evaluated first; admin+breeder uses admin rules only).
  IF public.is_admin() THEN
    IF OLD.status = 'under_review' AND NEW.status = 'published' THEN
      RETURN NEW;
    END IF;

    IF OLD.status = 'under_review' AND NEW.status = 'draft' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'invalid status transition (from % to %)',
      OLD.status, NEW.status;
  END IF;

  -- Breeder (non-admin): submit for review.
  IF OLD.status = 'draft' AND NEW.status = 'under_review' THEN
    IF EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = OLD.breeder_id
        AND b.user_id = auth.uid()
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Breeder (non-admin): pause / resume listing (Decision No.152).
  IF OLD.status = 'published' AND NEW.status = 'paused' THEN
    IF EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = OLD.breeder_id
        AND b.user_id = auth.uid()
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF OLD.status = 'paused' AND NEW.status = 'published' THEN
    IF EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = OLD.breeder_id
        AND b.user_id = auth.uid()
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'invalid status transition (from % to %)',
    OLD.status, NEW.status;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. pause_pet_listing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pause_pet_listing(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid pause actor';
  END IF;

  SELECT *
  INTO v_pet
  FROM public.pets
  WHERE id = p_pet_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pet not found';
  END IF;

  IF v_pet.status <> 'published' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.breeders b
    WHERE b.id = v_pet.breeder_id
      AND b.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM set_config('app.allow_pending_description_update', 'true', true);
  PERFORM set_config('app.allow_description_review_status_change', 'true', true);

  UPDATE public.pets
  SET
    status = 'paused',
    pending_description = NULL,
    description_review_status = 'none',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.pause_pet_listing(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pause_pet_listing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.pause_pet_listing(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. resume_pet_listing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resume_pet_listing(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid resume actor';
  END IF;

  SELECT *
  INTO v_pet
  FROM public.pets
  WHERE id = p_pet_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pet not found';
  END IF;

  IF v_pet.status <> 'paused' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.breeders b
    WHERE b.id = v_pet.breeder_id
      AND b.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.pets
  SET
    status = 'published',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'paused';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resume_pet_listing(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resume_pet_listing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.resume_pet_listing(uuid) TO authenticated;

COMMIT;
