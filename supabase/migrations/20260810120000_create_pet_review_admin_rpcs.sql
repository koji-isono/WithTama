-- Migration: admin pet review RPCs (AD-11)
-- approve_pet_for_publish / return_pet_review — SECURITY DEFINER, no pets_update_admin RLS
-- Applies after 20260810110000_extend_pets_status_trigger_for_admin.sql
-- Status changes go through enforce_pets_status_transition trigger (not disabled)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- public.approve_pet_for_publish(p_pet_id uuid)
-- under_review -> published + published_at + pet_review_logs(approved)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_pet_for_publish(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_breeder public.breeders%ROWTYPE;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin required';
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

  IF v_pet.status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE id = v_pet.breeder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not eligible for publication';
  END IF;

  IF v_breeder.review_status <> 'approved'
    OR v_breeder.identity_verification_status <> 'verified'
    OR v_breeder.business_verification_status <> 'verified'
    OR v_breeder.registration_expires_at IS NULL
    OR v_breeder.registration_expires_at < CURRENT_DATE
  THEN
    RAISE EXCEPTION 'breeder not eligible for publication';
  END IF;

  UPDATE public.pets
  SET
    status = 'published',
    published_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'under_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'approved',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pet_for_publish(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_pet_for_publish(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_pet_for_publish(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.return_pet_review(p_pet_id uuid, p_comment text)
-- under_review -> draft + pet_review_logs(returned)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.return_pet_review(p_pet_id uuid, p_comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_comment text;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  v_comment := btrim(p_comment);

  IF v_comment IS NULL OR v_comment = '' THEN
    RAISE EXCEPTION 'return comment required';
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

  IF v_pet.status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF v_pet.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'published_at inconsistency';
  END IF;

  UPDATE public.pets
  SET status = 'draft'
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'under_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'returned',
    v_comment,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.return_pet_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_pet_review(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.return_pet_review(uuid, text) TO authenticated;

COMMIT;
