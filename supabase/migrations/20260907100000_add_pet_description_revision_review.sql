-- Migration: pet description revision review (BR-11 post-publish)
-- Adds pending_description + description_review_status, protection trigger, log actions, RPCs
-- Applies after 20260826173000_stripe_step1_billing_columns_and_protection.sql
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. New columns on public.pets
-- ---------------------------------------------------------------------------

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pending_description text,
  ADD COLUMN IF NOT EXISTS description_review_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_description_review_status_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_description_review_status_check CHECK (
    description_review_status IN ('none', 'draft', 'under_review', 'returned')
  );

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_pending_description_length_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_pending_description_length_check CHECK (
    pending_description IS NULL OR char_length(pending_description) <= 2000
  );

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_description_length_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_description_length_check CHECK (
    description IS NULL OR char_length(description) <= 2000
  );

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_description_revision_scope_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_description_revision_scope_check CHECK (
    status = 'published'
    OR (
      description_review_status = 'none'
      AND pending_description IS NULL
    )
  );

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_description_review_none_pending_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_description_review_none_pending_check CHECK (
    description_review_status <> 'none'
    OR pending_description IS NULL
  );

ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_description_review_pending_required_check;
ALTER TABLE public.pets
  ADD CONSTRAINT pets_description_review_pending_required_check CHECK (
    description_review_status NOT IN ('under_review', 'returned')
    OR (
      pending_description IS NOT NULL
      AND btrim(pending_description) <> ''
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Description / revision protection trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_pets_description_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.description IS DISTINCT FROM OLD.description THEN
    IF current_setting('app.allow_published_description_update', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'cannot update description on published pet outside approval RPC';
    END IF;
  END IF;

  IF OLD.status = 'published'
    AND NEW.pending_description IS DISTINCT FROM OLD.pending_description THEN
    IF current_setting('app.allow_pending_description_update', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'pending description must be changed via revision RPC';
    END IF;
  END IF;

  IF OLD.description_review_status IS DISTINCT FROM NEW.description_review_status THEN
    IF current_setting('app.allow_description_review_status_change', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'description review status must be changed via RPC';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pets_enforce_description_update ON public.pets;

CREATE TRIGGER pets_enforce_description_update
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pets_description_update();

-- ---------------------------------------------------------------------------
-- 3. pet_review_logs action extension
-- ---------------------------------------------------------------------------

ALTER TABLE public.pet_review_logs DROP CONSTRAINT IF EXISTS pet_review_logs_action_check;

ALTER TABLE public.pet_review_logs
  ADD CONSTRAINT pet_review_logs_action_check CHECK (
    action IN (
      'submitted',
      'returned',
      'approved',
      'description_submitted',
      'description_returned',
      'description_approved'
    )
  );

ALTER TABLE public.pet_review_logs DROP CONSTRAINT IF EXISTS pet_review_logs_returned_comment_check;

ALTER TABLE public.pet_review_logs
  ADD CONSTRAINT pet_review_logs_returned_comment_check CHECK (
    action NOT IN ('returned', 'description_returned')
    OR (comment IS NOT NULL AND btrim(comment) <> '')
  );

DROP POLICY IF EXISTS pet_review_logs_insert_submitted_breeder ON public.pet_review_logs;

CREATE POLICY pet_review_logs_insert_submitted_breeder
  ON public.pet_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND action IN ('submitted', 'description_submitted')
    AND EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS pet_review_logs_insert_admin_review ON public.pet_review_logs;

CREATE POLICY pet_review_logs_insert_admin_review
  ON public.pet_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND actor_user_id = auth.uid()
    AND action IN (
      'returned',
      'approved',
      'description_returned',
      'description_approved'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. submit_pet_for_review — add description validation (initial publish)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_pet_for_review(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_description text;
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

  v_description := btrim(v_pet.description);

  IF v_description IS NULL OR v_description = '' THEN
    RAISE EXCEPTION 'description required for review';
  END IF;

  IF char_length(v_description) < 20 THEN
    RAISE EXCEPTION 'description too short for review';
  END IF;

  IF char_length(v_description) > 2000 THEN
    RAISE EXCEPTION 'description too long for review';
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

-- ---------------------------------------------------------------------------
-- 5. save_pet_description_revision_draft
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_pet_description_revision_draft(
  p_pet_id uuid,
  p_pending_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_pending text;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid save actor';
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

  IF v_pet.description_review_status NOT IN ('none', 'draft', 'returned') THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  v_pending := p_pending_description;

  IF v_pending IS NOT NULL THEN
    v_pending := btrim(v_pending);

    IF v_pending = '' THEN
      v_pending := NULL;
    END IF;
  END IF;

  IF v_pending IS NOT NULL AND char_length(v_pending) > 2000 THEN
    RAISE EXCEPTION 'pending description too long';
  END IF;

  PERFORM set_config('app.allow_pending_description_update', 'true', true);
  PERFORM set_config('app.allow_description_review_status_change', 'true', true);

  UPDATE public.pets
  SET
    pending_description = v_pending,
    description_review_status = CASE
      WHEN v_pending IS NULL AND v_pet.description_review_status = 'returned' THEN 'returned'
      WHEN v_pending IS NULL THEN 'none'
      ELSE 'draft'
    END,
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'published'
    AND description_review_status IN ('none', 'draft', 'returned');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_pet_description_revision_draft(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_pet_description_revision_draft(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_pet_description_revision_draft(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. submit_pet_description_revision
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_pet_description_revision(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_pending text;
  v_current text;
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

  IF v_pet.description_review_status NOT IN ('draft', 'returned') THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  v_pending := btrim(v_pet.pending_description);
  v_current := btrim(COALESCE(v_pet.description, ''));

  IF v_pending IS NULL OR v_pending = '' THEN
    RAISE EXCEPTION 'pending description required';
  END IF;

  IF char_length(v_pending) < 20 THEN
    RAISE EXCEPTION 'pending description too short';
  END IF;

  IF char_length(v_pending) > 2000 THEN
    RAISE EXCEPTION 'pending description too long';
  END IF;

  IF v_pending = v_current THEN
    RAISE EXCEPTION 'pending description unchanged';
  END IF;

  PERFORM set_config('app.allow_description_review_status_change', 'true', true);

  UPDATE public.pets
  SET
    description_review_status = 'under_review',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'published'
    AND description_review_status IN ('draft', 'returned')
    AND pending_description IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'description_submitted',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pet_description_revision(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_pet_description_revision(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_pet_description_revision(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. approve_pet_description_revision
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_pet_description_revision(p_pet_id uuid)
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

  IF v_pet.status <> 'published' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF v_pet.description_review_status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  IF v_pet.pending_description IS NULL OR btrim(v_pet.pending_description) = '' THEN
    RAISE EXCEPTION 'pending description required';
  END IF;

  PERFORM set_config('app.allow_published_description_update', 'true', true);
  PERFORM set_config('app.allow_pending_description_update', 'true', true);
  PERFORM set_config('app.allow_description_review_status_change', 'true', true);

  UPDATE public.pets
  SET
    description = pending_description,
    pending_description = NULL,
    description_review_status = 'none',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'published'
    AND description_review_status = 'under_review'
    AND pending_description IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'description_approved',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pet_description_revision(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_pet_description_revision(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_pet_description_revision(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. return_pet_description_revision
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.return_pet_description_revision(
  p_pet_id uuid,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

  IF v_pet.status <> 'published' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF v_pet.description_review_status <> 'under_review' THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  PERFORM set_config('app.allow_description_review_status_change', 'true', true);

  UPDATE public.pets
  SET
    description_review_status = 'returned',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'published'
    AND description_review_status = 'under_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid description review status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'description_returned',
    v_comment,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.return_pet_description_revision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_pet_description_revision(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.return_pet_description_revision(uuid, text) TO authenticated;

COMMIT;
