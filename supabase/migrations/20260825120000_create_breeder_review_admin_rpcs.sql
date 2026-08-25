-- Migration: admin breeder review RPCs (AD-01 / AD-02)
-- start_breeder_review / approve_breeder_review / return_breeder_review / reject_breeder_review
-- SECURITY DEFINER — atomic breeders UPDATE + breeder_review_logs INSERT
-- Does NOT modify membership_status on approval (Decision No.129 / No.130)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- public.start_breeder_review(p_breeder_id uuid)
-- submitted | resubmission_required -> under_review + breeder_review_logs(review_started)
-- Decision No.126
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_breeder_review(p_breeder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
BEGIN
  IF p_breeder_id IS NULL THEN
    RAISE EXCEPTION 'breeder id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status NOT IN ('submitted', 'resubmission_required') THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  UPDATE public.breeders
  SET review_status = 'under_review'
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
    AND review_status IN ('submitted', 'resubmission_required');

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
    p_breeder_id,
    'review_started',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_breeder_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_breeder_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_breeder_review(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.approve_breeder_review(p_breeder_id uuid)
-- under_review -> approved + verification verified + approved_at
-- membership_status unchanged (Decision No.129 / No.130)
-- Decision No.134
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_breeder_review(p_breeder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
BEGIN
  IF p_breeder_id IS NULL THEN
    RAISE EXCEPTION 'breeder id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  IF v_breeder.identity_document_path IS NULL
    OR btrim(v_breeder.identity_document_path) = ''
  THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  IF v_breeder.business_license_path IS NULL
    OR btrim(v_breeder.business_license_path) = ''
  THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  IF v_breeder.registration_expires_at IS NULL THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  IF v_breeder.registration_expires_at < CURRENT_DATE THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'breeder-documents'
      AND o.name = v_breeder.identity_document_path
  ) THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'breeder-documents'
      AND o.name = v_breeder.business_license_path
  ) THEN
    RAISE EXCEPTION 'breeder not eligible for approval';
  END IF;

  UPDATE public.breeders
  SET
    review_status = 'approved',
    identity_verification_status = 'verified',
    business_verification_status = 'verified',
    approved_at = now()
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
    AND review_status = 'under_review';

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
    p_breeder_id,
    'approved',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_breeder_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_breeder_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_breeder_review(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.return_breeder_review(p_breeder_id uuid, p_comment text)
-- under_review -> resubmission_required + breeder_review_logs(returned)
-- verification status unchanged (Decision No.127)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.return_breeder_review(p_breeder_id uuid, p_comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
  v_comment text;
BEGIN
  IF p_breeder_id IS NULL THEN
    RAISE EXCEPTION 'breeder id is required';
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
  INTO v_breeder
  FROM public.breeders
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  UPDATE public.breeders
  SET review_status = 'resubmission_required'
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
    AND review_status = 'under_review';

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
    p_breeder_id,
    'returned',
    v_comment,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.return_breeder_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_breeder_review(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.return_breeder_review(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.reject_breeder_review(p_breeder_id uuid, p_comment text)
-- under_review -> rejected + breeder_review_logs(rejected)
-- verification status unchanged (Decision No.128)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_breeder_review(p_breeder_id uuid, p_comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder public.breeders%ROWTYPE;
  v_comment text;
BEGIN
  IF p_breeder_id IS NULL THEN
    RAISE EXCEPTION 'breeder id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  v_comment := btrim(p_comment);

  IF v_comment IS NULL OR v_comment = '' THEN
    RAISE EXCEPTION 'reject comment required';
  END IF;

  SELECT *
  INTO v_breeder
  FROM public.breeders
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'breeder not found';
  END IF;

  IF v_breeder.review_status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid review status';
  END IF;

  UPDATE public.breeders
  SET review_status = 'rejected'
  WHERE id = p_breeder_id
    AND deleted_at IS NULL
    AND review_status = 'under_review';

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
    p_breeder_id,
    'rejected',
    v_comment,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_breeder_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_breeder_review(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_breeder_review(uuid, text) TO authenticated;

COMMIT;
