-- Migration: extend pets.status transition trigger for admin review (AD-10 / AD-11)
-- Applies after 20260807130000_enforce_pets_status_transition.sql
-- Adds admin: under_review -> published / under_review -> draft
-- Preserves breeder: draft -> under_review (non-admin only)
-- Admin users use admin allowlist only (admin+breeder cannot draft -> under_review via trigger)
-- Does not add pets_update_admin RLS or review RPCs
-- No DROP TABLE, TRUNCATE, DELETE FROM, or DROP TRIGGER

BEGIN;

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

  -- Breeder (non-admin): submit for review only.
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

  RAISE EXCEPTION 'invalid status transition (from % to %)',
    OLD.status, NEW.status;
END;
$$;

COMMIT;
