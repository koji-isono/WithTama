-- Migration: enforce pets.status transition rules (trigger)
-- Design: docs/09_開発履歴/2026-08-07_pets_status_トリガー設計案.md
-- Applies after 20260807120000_harden_pets_rls.sql
-- Phase 1: breeder draft -> under_review only. Admin transitions deferred.
-- Does not modify RLS policies. No DROP TABLE, TRUNCATE, or DELETE FROM.

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

  -- Phase 1: only breeder submit for review (draft -> under_review).
  -- Admin transitions (under_review -> published/draft) are added with AD-10/AD-11.
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

DROP TRIGGER IF EXISTS pets_enforce_status_transition ON public.pets;

CREATE TRIGGER pets_enforce_status_transition
  BEFORE UPDATE OF status ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pets_status_transition();

COMMIT;
