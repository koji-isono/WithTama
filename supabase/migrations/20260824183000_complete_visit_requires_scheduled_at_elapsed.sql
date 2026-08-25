-- complete_visit: reject completion before scheduled_at (Decision No.124)
-- Applies after 20260824120000_create_visit_rpcs.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_visit(
  p_visit_id uuid,
  p_animal_confirmed boolean,
  p_explanation_completed boolean,
  p_result text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_breeder_id uuid;
  v_visit public.visits%ROWTYPE;
  v_inquiry public.inquiries%ROWTYPE;
BEGIN
  IF p_visit_id IS NULL THEN
    RAISE EXCEPTION 'visit id is required';
  END IF;

  IF p_animal_confirmed IS NOT TRUE OR p_explanation_completed IS NOT TRUE THEN
    RAISE EXCEPTION 'implementation flags must be true';
  END IF;

  IF p_result IS NULL OR trim(p_result) = '' THEN
    RAISE EXCEPTION 'result is required';
  END IF;

  IF p_result NOT IN ('contracted', 'declined', 'considering') THEN
    RAISE EXCEPTION 'invalid result';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid complete actor';
  END IF;

  SELECT br.id
  INTO v_breeder_id
  FROM public.breeders br
  WHERE br.user_id = auth.uid()
    AND br.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO v_visit
  FROM public.visits
  WHERE id = p_visit_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'visit not found';
  END IF;

  IF v_visit.breeder_id <> v_breeder_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_visit.status <> 'scheduled' THEN
    RAISE EXCEPTION 'invalid visit status';
  END IF;

  IF v_visit.scheduled_at IS NULL OR v_visit.scheduled_at > now() THEN
    RAISE EXCEPTION 'visit cannot be completed before scheduled datetime';
  END IF;

  SELECT *
  INTO v_inquiry
  FROM public.inquiries
  WHERE id = v_visit.inquiry_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inquiry not found';
  END IF;

  IF v_inquiry.id <> v_visit.inquiry_id
    OR v_inquiry.buyer_id <> v_visit.buyer_id
    OR v_inquiry.breeder_id <> v_visit.breeder_id
    OR v_inquiry.pet_id <> v_visit.pet_id
  THEN
    RAISE EXCEPTION 'invalid visit relationship';
  END IF;

  IF v_inquiry.status <> 'visit_scheduled' THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  UPDATE public.visits
  SET
    animal_confirmed = p_animal_confirmed,
    explanation_completed = p_explanation_completed,
    result = p_result,
    completed_at = now(),
    status = 'completed'
  WHERE id = p_visit_id
    AND deleted_at IS NULL
    AND status = 'scheduled'
    AND breeder_id = v_breeder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid visit status';
  END IF;

  UPDATE public.inquiries
  SET status = 'completed'
  WHERE id = v_inquiry.id
    AND deleted_at IS NULL
    AND status = 'visit_scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.complete_visit(uuid, boolean, boolean, text) IS
  'Decision No.119–124: Breeder records visit with animal_confirmed and explanation_completed both TRUE, result, and completes visit after scheduled_at. inquiries.status becomes completed.';

COMMIT;
