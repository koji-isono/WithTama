-- Migration: get_inquiry_buyer_display_name RPC (Decision No.112)
-- Inquiry-party breeders, buyers, and admins may read buyer display_name only.
-- Does NOT add buyers SELECT RLS for breeders.
-- Does NOT modify existing RLS policies on buyers / inquiries.
-- Applies after 20260804163239_create_inquiries_messages_visits.sql
-- SECURITY DEFINER with empty search_path and fully qualified names (submit_pet_for_review pattern)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- public.get_inquiry_buyer_display_name(p_inquiry_id uuid) -> text
-- ---------------------------------------------------------------------------
-- Authorization (all required):
--   - authenticated caller (auth.uid() IS NOT NULL)
--   - inquiry exists with deleted_at IS NULL
--   - caller is inquiry breeder, inquiry buyer, or admin (is_admin())
-- Returns NULL (no exception) when unauthorized or data unavailable so third
-- parties cannot distinguish missing vs forbidden inquiries.

CREATE OR REPLACE FUNCTION public.get_inquiry_buyer_display_name(p_inquiry_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inquiry public.inquiries%ROWTYPE;
  v_display_name text;
  v_authorized boolean := false;
BEGIN
  IF p_inquiry_id IS NULL OR auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF public.is_admin() THEN
    v_authorized := true;
  ELSIF EXISTS (
    SELECT 1
    FROM public.breeders br
    WHERE br.id = v_inquiry.breeder_id
      AND br.user_id = auth.uid()
  ) THEN
    v_authorized := true;
  ELSIF EXISTS (
    SELECT 1
    FROM public.buyers b
    WHERE b.id = v_inquiry.buyer_id
      AND b.user_id = auth.uid()
  ) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RETURN NULL;
  END IF;

  SELECT b.display_name
  INTO v_display_name
  FROM public.buyers b
  WHERE b.id = v_inquiry.buyer_id
    AND b.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN NULLIF(trim(v_display_name), '');
END;
$$;

COMMENT ON FUNCTION public.get_inquiry_buyer_display_name(uuid) IS
  'Decision No.112: Returns buyer display_name for an inquiry when the caller is the inquiry breeder, buyer, or admin. NULL if unauthorized, inquiry not found, inquiry logically deleted (deleted_at), buyer missing/deleted, or display_name empty. Does not expose phone, email, address, or other buyer columns.';

REVOKE ALL ON FUNCTION public.get_inquiry_buyer_display_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inquiry_buyer_display_name(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_inquiry_buyer_display_name(uuid) TO authenticated;

COMMIT;
