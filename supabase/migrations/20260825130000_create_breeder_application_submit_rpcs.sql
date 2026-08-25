-- Migration: breeder application submit / resubmit RPCs (BR-09 phase 1)
-- submit_breeder_application — draft -> submitted + breeder_review_logs(submitted)
-- resubmit_breeder_application — resubmission_required -> submitted + breeder_review_logs(submitted)
-- SECURITY DEFINER — atomic breeders UPDATE + breeder_review_logs INSERT
-- Does NOT modify membership_status (Decision No.129 / No.130)
-- Resubmit does NOT modify verification status (Decision No.127 / No.137)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- public.submit_breeder_application()
-- draft -> submitted + verification submitted + profile_completed + submitted log
-- Decision No.137 — initial application
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_breeder_application()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid submit actor';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status <> 'draft' THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  IF v_breeder.identity_document_path IS NULL
    OR btrim(v_breeder.identity_document_path) = ''
  THEN
    RAISE EXCEPTION 'documents required';
  END IF;

  IF v_breeder.business_license_path IS NULL
    OR btrim(v_breeder.business_license_path) = ''
  THEN
    RAISE EXCEPTION 'documents required';
  END IF;

  UPDATE public.breeders
  SET
    review_status = 'submitted',
    profile_completed = true,
    identity_verification_status = 'submitted',
    business_verification_status = 'submitted'
  WHERE id = v_breeder.id
    AND deleted_at IS NULL
    AND review_status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  INSERT INTO public.breeder_review_logs (
    breeder_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    v_breeder.id,
    'submitted',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_breeder_application() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_breeder_application() FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_breeder_application() TO authenticated;

-- ---------------------------------------------------------------------------
-- public.resubmit_breeder_application()
-- resubmission_required -> submitted + breeder_review_logs(submitted)
-- Decision No.137 — resubmit; verification / membership unchanged
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resubmit_breeder_application()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid submit actor';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status <> 'resubmission_required' THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  UPDATE public.breeders
  SET review_status = 'submitted'
  WHERE id = v_breeder.id
    AND deleted_at IS NULL
    AND review_status = 'resubmission_required';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  INSERT INTO public.breeder_review_logs (
    breeder_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    v_breeder.id,
    'submitted',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_breeder_application() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resubmit_breeder_application() FROM anon;
GRANT EXECUTE ON FUNCTION public.resubmit_breeder_application() TO authenticated;

COMMIT;
