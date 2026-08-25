-- Migration: visit RPCs (Decision No.117–123)
-- request_visit / schedule_visit / complete_visit / cancel_visit
-- Applies after 20260821153000_create_get_inquiry_buyer_display_name_rpc.sql
-- SECURITY DEFINER with empty search_path and fully qualified names
-- Does NOT alter visits table columns, weaken RLS, or grant PUBLIC EXECUTE
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- public.request_visit(
--   p_inquiry_id uuid,
--   p_requested_at timestamptz,
--   p_requested_at_second timestamptz DEFAULT NULL,
--   p_requested_at_third timestamptz DEFAULT NULL,
--   p_message text DEFAULT NULL
-- ) -> uuid
-- Buyer only. Atomic: visits INSERT + inquiries.status + optional inquiry_messages
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_visit(
  p_inquiry_id uuid,
  p_requested_at timestamptz,
  p_requested_at_second timestamptz DEFAULT NULL,
  p_requested_at_third timestamptz DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_buyer_id uuid;
  v_inquiry public.inquiries%ROWTYPE;
  v_visit_id uuid;
  v_message text;
BEGIN
  IF p_inquiry_id IS NULL THEN
    RAISE EXCEPTION 'inquiry id is required';
  END IF;

  IF p_requested_at IS NULL THEN
    RAISE EXCEPTION 'first preferred datetime is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid request actor';
  END IF;

  SELECT b.id
  INTO v_buyer_id
  FROM public.buyers b
  WHERE b.user_id = auth.uid()
    AND b.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO v_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inquiry not found';
  END IF;

  IF v_inquiry.buyer_id <> v_buyer_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_inquiry.status NOT IN ('open', 'replied') THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.visits v
    WHERE v.inquiry_id = p_inquiry_id
  ) THEN
    RAISE EXCEPTION 'visit already exists for inquiry';
  END IF;

  IF p_requested_at <= now() THEN
    RAISE EXCEPTION 'first preferred datetime must be in the future';
  END IF;

  IF p_requested_at_second IS NOT NULL
    AND p_requested_at_second <= p_requested_at
  THEN
    RAISE EXCEPTION 'invalid second preferred datetime';
  END IF;

  IF p_requested_at_third IS NOT NULL THEN
    IF p_requested_at_second IS NULL THEN
      RAISE EXCEPTION 'second preferred datetime is required when third is provided';
    END IF;

    IF p_requested_at_third <= p_requested_at_second THEN
      RAISE EXCEPTION 'invalid third preferred datetime';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.breeders br
    WHERE br.id = v_inquiry.breeder_id
      AND br.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid inquiry relationship';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = v_inquiry.pet_id
      AND p.breeder_id = v_inquiry.breeder_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid inquiry relationship';
  END IF;

  INSERT INTO public.visits (
    inquiry_id,
    buyer_id,
    breeder_id,
    pet_id,
    requested_at,
    requested_at_second,
    requested_at_third,
    status,
    result
  )
  VALUES (
    v_inquiry.id,
    v_inquiry.buyer_id,
    v_inquiry.breeder_id,
    v_inquiry.pet_id,
    p_requested_at,
    p_requested_at_second,
    p_requested_at_third,
    'requested',
    'pending'
  )
  RETURNING id INTO v_visit_id;

  UPDATE public.inquiries
  SET status = 'visit_requested'
  WHERE id = v_inquiry.id
    AND deleted_at IS NULL
    AND status IN ('open', 'replied');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  v_message := NULLIF(trim(p_message), '');

  IF v_message IS NOT NULL THEN
    IF length(v_message) > 2000 THEN
      RAISE EXCEPTION 'message too long';
    END IF;

    INSERT INTO public.inquiry_messages (
      inquiry_id,
      sender_type,
      sender_user_id,
      message
    )
    VALUES (
      v_inquiry.id,
      'buyer',
      auth.uid(),
      v_message
    );

    UPDATE public.inquiries
    SET last_message_at = now()
    WHERE id = v_inquiry.id
      AND deleted_at IS NULL;
  END IF;

  RETURN v_visit_id;
END;
$$;

COMMENT ON FUNCTION public.request_visit(uuid, timestamptz, timestamptz, timestamptz, text) IS
  'Decision No.118–121: Buyer creates a visit request for an active inquiry (open/replied). Atomically inserts visits (requested), sets inquiries.status to visit_requested, and optionally inserts buyer inquiry_messages + last_message_at. Returns new visit id.';

REVOKE ALL ON FUNCTION public.request_visit(uuid, timestamptz, timestamptz, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_visit(uuid, timestamptz, timestamptz, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_visit(uuid, timestamptz, timestamptz, timestamptz, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.schedule_visit(p_visit_id uuid, p_scheduled_at timestamptz) -> void
-- Breeder only. requested -> scheduled
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.schedule_visit(
  p_visit_id uuid,
  p_scheduled_at timestamptz
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

  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'scheduled datetime is required';
  END IF;

  IF p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'scheduled datetime must be in the future';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid schedule actor';
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

  IF v_visit.status <> 'requested' THEN
    RAISE EXCEPTION 'invalid visit status';
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

  IF v_inquiry.status <> 'visit_requested' THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  UPDATE public.visits
  SET
    scheduled_at = p_scheduled_at,
    status = 'scheduled',
    confirmed_by_breeder_at = now()
  WHERE id = p_visit_id
    AND deleted_at IS NULL
    AND status = 'requested'
    AND breeder_id = v_breeder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid visit status';
  END IF;

  UPDATE public.inquiries
  SET status = 'visit_scheduled'
  WHERE id = v_inquiry.id
    AND deleted_at IS NULL
    AND status = 'visit_requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.schedule_visit(uuid, timestamptz) IS
  'Decision No.119–121: Breeder confirms visit datetime (future only). Sets visits.status to scheduled, confirmed_by_breeder_at, and inquiries.status to visit_scheduled.';

REVOKE ALL ON FUNCTION public.schedule_visit(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_visit(uuid, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.schedule_visit(uuid, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.complete_visit(
--   p_visit_id uuid,
--   p_animal_confirmed boolean,
--   p_explanation_completed boolean,
--   p_result text
-- ) -> void
-- Breeder only. scheduled -> completed
-- ---------------------------------------------------------------------------

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
  'Decision No.119–122: Breeder records visit with animal_confirmed and explanation_completed both TRUE, result, and completes visit. inquiries.status becomes completed.';

REVOKE ALL ON FUNCTION public.complete_visit(uuid, boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_visit(uuid, boolean, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_visit(uuid, boolean, boolean, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- public.cancel_visit(p_visit_id uuid, p_cancellation_reason text DEFAULT NULL) -> void
-- Buyer or breeder party. requested|scheduled -> canceled, inquiries -> replied
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_visit(
  p_visit_id uuid,
  p_cancellation_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_visit public.visits%ROWTYPE;
  v_inquiry public.inquiries%ROWTYPE;
  v_is_buyer boolean := false;
  v_is_breeder boolean := false;
  v_reason text;
BEGIN
  IF p_visit_id IS NULL THEN
    RAISE EXCEPTION 'visit id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid cancel actor';
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

  IF v_visit.status NOT IN ('requested', 'scheduled') THEN
    RAISE EXCEPTION 'invalid visit status';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.buyers b
    WHERE b.id = v_visit.buyer_id
      AND b.user_id = auth.uid()
      AND b.deleted_at IS NULL
  )
  INTO v_is_buyer;

  SELECT EXISTS (
    SELECT 1
    FROM public.breeders br
    WHERE br.id = v_visit.breeder_id
      AND br.user_id = auth.uid()
      AND br.deleted_at IS NULL
  )
  INTO v_is_breeder;

  IF NOT v_is_buyer AND NOT v_is_breeder THEN
    RAISE EXCEPTION 'unauthorized';
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

  IF v_visit.status = 'requested' AND v_inquiry.status <> 'visit_requested' THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  IF v_visit.status = 'scheduled' AND v_inquiry.status <> 'visit_scheduled' THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;

  v_reason := NULLIF(trim(p_cancellation_reason), '');

  IF v_reason IS NOT NULL AND length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'cancellation reason too long';
  END IF;

  UPDATE public.visits
  SET
    status = 'canceled',
    canceled_at = now(),
    cancellation_reason = v_reason
  WHERE id = p_visit_id
    AND deleted_at IS NULL
    AND status IN ('requested', 'scheduled')
    AND (
      (v_is_buyer AND buyer_id = v_visit.buyer_id)
      OR (v_is_breeder AND breeder_id = v_visit.breeder_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid visit status';
  END IF;

  UPDATE public.inquiries
  SET status = 'replied'
  WHERE id = v_inquiry.id
    AND deleted_at IS NULL
    AND status IN ('visit_requested', 'visit_scheduled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid inquiry status';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cancel_visit(uuid, text) IS
  'Decision No.119–123: Buyer or breeder cancels an active visit (requested or scheduled). inquiries.status returns to replied so messaging continues.';

REVOKE ALL ON FUNCTION public.cancel_visit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_visit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_visit(uuid, text) TO authenticated;

COMMIT;
