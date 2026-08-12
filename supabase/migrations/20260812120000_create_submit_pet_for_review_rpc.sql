-- Migration: submit_pet_for_review RPC (breeder submit for review)
-- draft -> under_review + pet_review_logs(submitted) in a single transaction
-- Applies after 20260810120000_create_pet_review_admin_rpcs.sql
-- SECURITY DEFINER with empty search_path and fully qualified names (stricter than legacy RPCs)
-- Status changes go through enforce_pets_status_transition trigger (not disabled)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_pet_for_review(p_pet_id uuid)
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
    RAISE EXCEPTION 'invalid submit actor';
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

  IF v_pet.status <> 'draft' THEN
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_photos pp
    WHERE pp.pet_id = p_pet_id
  ) THEN
    RAISE EXCEPTION 'photo required';
  END IF;

  UPDATE public.pets
  SET
    status = 'under_review',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'draft';

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
    'submitted',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_pet_for_review(uuid) TO authenticated;

COMMIT;
